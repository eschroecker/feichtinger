const STORAGE_KEYS = {
  cart: "feichtinger-cart"
};

const SUPABASE_URL = "https://qzamzzylzmpiiodrhnds.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_aimbVSduyr3LGEeXmkZAMw_iACzNppR";
const PRODUCTS_ENDPOINT = `${SUPABASE_URL}/rest/v1/products?select=id,name,category,price,stock,unit,image_url,description,is_published,sort_order&order=sort_order.asc,name.asc`;

let selectedFilter = "all";
let products = [];
let catalogState = "loading";
let cart = loadCart();

const productGrid = document.getElementById("productGrid");
const cartItemsContainer = document.getElementById("cartItems");
const subtotalValue = document.getElementById("subtotalValue");
const totalValue = document.getElementById("totalValue");
const enquiryForm = document.getElementById("enquiryForm");
const filterButtons = document.querySelectorAll(".filter-btn");

function loadCart() {
  const saved = localStorage.getItem(STORAGE_KEYS.cart);
  if (!saved) {
    return [];
  }

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to restore cart state", error);
    return [];
  }
}

function saveCart() {
  localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart));
}

async function loadProductsFromSupabase() {
  catalogState = "loading";
  renderProducts();

  try {
    const response = await fetch(PRODUCTS_ENDPOINT, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Supabase returned HTTP ${response.status}`);
    }

    const rows = await response.json();
    if (!Array.isArray(rows)) {
      throw new Error("Supabase returned an unexpected products response");
    }

    products = rows
      .filter((row) => row.is_published)
      .map((row) => ({
        id: String(row.id),
        name: row.name,
        category: row.category,
        price: Number(row.price),
        stock: Number(row.stock),
        unit: row.unit,
        image: row.image_url,
        description: row.description,
        sortOrder: Number(row.sort_order)
      }));

    catalogState = "ready";
    cart = reconcileCart(loadCart(), products);
    saveCart();
  } catch (error) {
    console.error("Could not load products from Supabase", error);
    products = [];
    cart = [];
    catalogState = "error";
  }

  renderProducts();
  renderCart();
}

function reconcileCart(savedCart, currentProducts) {
  const availableProducts = new Map(currentProducts.map((product) => [product.id, product]));

  return savedCart.reduce((items, savedItem) => {
    const product = availableProducts.get(String(savedItem.id));
    const requestedQuantity = Number(savedItem.qty);

    if (!product || product.stock <= 0 || !Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
      return items;
    }

    items.push({ ...product, qty: Math.min(requestedQuantity, product.stock) });
    return items;
  }, []);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function currency(number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR"
  }).format(number);
}

function getFilteredProducts() {
  return products.filter((product) => {
    const matchesCategory = selectedFilter === "all" || product.category === selectedFilter;
    const available = product.stock > 0;
    return matchesCategory && available;
  });
}

function renderProducts() {
  if (catalogState === "loading") {
    productGrid.innerHTML = '<div class="empty-cart" style="grid-column: 1 / -1;">Produkte werden geladen ...</div>';
    return;
  }

  if (catalogState === "error") {
    productGrid.innerHTML = `
      <div class="empty-cart" style="grid-column: 1 / -1;">
        Produkte konnten nicht geladen werden. Bitte prüfen Sie Ihre Verbindung und versuchen Sie es erneut.
        <br /><button class="button button-secondary" data-retry-products type="button">Erneut versuchen</button>
      </div>
    `;
    productGrid.querySelector("[data-retry-products]").addEventListener("click", loadProductsFromSupabase);
    return;
  }

  const visibleProducts = getFilteredProducts();

  if (!visibleProducts.length) {
    productGrid.innerHTML = `
      <div class="empty-cart" style="grid-column: 1 / -1;">
        Keine Produkte in dieser Kategorie verfügbar. Bitte das Lager prüfen.
      </div>
    `;
    return;
  }

  productGrid.innerHTML = visibleProducts
    .map(
      (product) => `
        <article class="product-card">
          <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" />
          <div class="product-card-body">
            <div class="product-meta">
              <span class="product-category">${escapeHtml(product.category)}</span>
              <span class="stock-badge available">${escapeHtml(product.stock)} verfügbar</span>
            </div>
            <h3>${escapeHtml(product.name)}</h3>
            <p>${escapeHtml(product.description)}</p>
            <div class="product-footer">
              <div class="product-price">
                <strong>${currency(product.price)}</strong>
                <small>${escapeHtml(product.unit)}</small>
              </div>
              <button class="button button-primary" data-product-id="${escapeHtml(product.id)}" type="button">
                In den Warenkorb
              </button>
            </div>
          </div>
        </article>
      `
    )
    .join("");

  productGrid.querySelectorAll("[data-product-id]").forEach((button) => {
    button.addEventListener("click", () => addToCart(button.dataset.productId));
  });
}

function renderCart() {
  if (!cart.length) {
    cartItemsContainer.innerHTML = `
      <div class="empty-cart">
        Ihr Warenkorb ist noch leer. Wählen Sie einfach ein Produkt aus und legen Sie es in die Anfrage.
      </div>
    `;
    subtotalValue.textContent = currency(0);
    totalValue.textContent = currency(0);
    return;
  }

  const cartMap = new Map();
  cart.forEach((item) => {
    const current = cartMap.get(item.id) || { ...item, qty: 0 };
    current.qty += item.qty;
    cartMap.set(item.id, current);
  });

  const items = [...cartMap.values()];
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  cartItemsContainer.innerHTML = items
    .map(
      (item) => `
        <div class="cart-item">
          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" />
          <div>
            <h4>${escapeHtml(item.name)}</h4>
            <p>${escapeHtml(item.unit)}</p>
          </div>
          <div class="cart-item-controls">
            <div class="qty-control">
              <button type="button" data-cart-adjust="decrease" data-product-id="${escapeHtml(item.id)}" aria-label="Menge verringern">−</button>
              <span>${item.qty}</span>
              <button type="button" data-cart-adjust="increase" data-product-id="${escapeHtml(item.id)}" aria-label="Menge erhöhen">+</button>
            </div>
            <span class="cart-item-price">${currency(item.price * item.qty)}</span>
          </div>
        </div>
      `
    )
    .join("");

  subtotalValue.textContent = currency(subtotal);
  totalValue.textContent = currency(subtotal);

  cartItemsContainer.querySelectorAll("[data-cart-adjust]").forEach((button) => {
    button.addEventListener("click", () => {
      const productId = button.dataset.productId;
      const direction = button.dataset.cartAdjust;
      adjustCartItem(productId, direction === "increase" ? 1 : -1);
    });
  });
}

function adjustCartItem(productId, delta) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;

  const itemIndex = cart.findIndex((entry) => entry.id === productId);

  if (itemIndex === -1) {
    if (delta > 0) {
      cart.push({ ...product, qty: 1 });
      saveCart();
      renderCart();
    }
    return;
  }

  const nextQty = cart[itemIndex].qty + delta;

  if (nextQty <= 0) {
    cart.splice(itemIndex, 1);
  } else {
    cart[itemIndex].qty = Math.min(nextQty, product.stock);
  }

  saveCart();
  renderCart();
}

function addToCart(productId) {
  const product = products.find((entry) => entry.id === productId);
  if (!product || product.stock <= 0) return;

  const existing = cart.find((entry) => entry.id === productId);

  if (existing) {
    if (existing.qty >= product.stock) {
      return;
    }
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  saveCart();
  renderCart();
}

function setFilter(filter) {
  selectedFilter = filter;
  filterButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === filter);
  });
  renderProducts();
}

function setupEventHandlers() {
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => setFilter(button.dataset.filter));
  });

  enquiryForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!cart.length) {
      window.alert("Bitte wählen Sie zuerst Produkte aus, bevor Sie eine Anfrage senden.");
      return;
    }

    const formData = new FormData(enquiryForm);
    const name = formData.get("name")?.toString().trim() || "Kunde";
    const email = formData.get("email")?.toString().trim();
    const message = formData.get("message")?.toString().trim();

    const orderLines = cart
      .map((item) => `${item.name} × ${item.qty} = ${currency(item.price * item.qty)}`)
      .join("\n");

    const body = `Hallo Feichtinger Fischhandel,\n\nBitte nehmen Sie meine Anfrage entgegen.\n\nName: ${name}\nE-Mail: ${email || "-"}\n\nBestellung:\n${orderLines}\n\nGesamt: ${currency(cart.reduce((sum, item) => sum + item.price * item.qty, 0))}\n\nHinweise: ${message || "Keine besonderen Hinweise"}\n`;

    const subject = encodeURIComponent(`Bestellanfrage von ${name}`);
    window.location.href = `mailto:info@feichtinger-fischhandel.de?subject=${subject}&body=${encodeURIComponent(body)}`;
  });
}

async function init() {
  renderProducts();
  setupEventHandlers();
  await loadProductsFromSupabase();
}

init();
