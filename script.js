const defaultProducts = [
  {
    id: "atlantic-salmon",
    name: "Atlantik-Lachs",
    category: "Fresh",
    price: 18.9,
    stock: 12,
    unit: "pro kg",
    image:
      "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&q=80",
    description: "Edles, saftiges Filet mit mildem Geschmack und hoher Qualität."
  },
  {
    id: "cod",
    name: "Kabeljau",
    category: "Fresh",
    price: 16.5,
    stock: 9,
    unit: "pro kg",
    image:
      "https://images.unsplash.com/photo-1544943910-4c1dc44aabfd?auto=format&fit=crop&w=900&q=80",
    description: "Festes, aromatisches Fleisch ideal für Backen, Braten und Grillen."
  },
  {
    id: "smoked-trout",
    name: "Geräucherter Forellenfilet",
    category: "Smoked",
    price: 22.4,
    stock: 7,
    unit: "pro 200g",
    image:
      "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=900&q=80",
    description: "Sanft geräuchert und besonders beliebt für Platten und Vorspeisen."
  },
  {
    id: "shrimp",
    name: "Nordsee Garnelen",
    category: "Shellfish",
    price: 24.6,
    stock: 0,
    unit: "pro kg",
    image:
      "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=900&q=80",
    description: "Klein, süß und besonders aromatisch – ein Klassiker für jeden Anlass."
  },
  {
    id: "fish-spread",
    name: "Fischaufstrich",
    category: "Shellfish",
    price: 14.8,
    stock: 18,
    unit: "pro Glas",
    image:
      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80",
    description: "Cremiger Aufstrich aus fein geräuchertem Fisch, ideal für Brot, Brötchen und Genussplatten."
  },
  {
    id: "sea-bass",
    name: "Seebarsch",
    category: "Seasonal",
    price: 19.8,
    stock: 5,
    unit: "pro kg",
    image:
      "https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=900&q=80",
    description: "Feines Aroma, zarte Konsistenz und perfekt für saisonale Menüs."
  }
];

const STORAGE_KEYS = {
  products: "feichtinger-products",
  cart: "feichtinger-cart"
};

let selectedFilter = "all";
let products = loadProducts();
let cart = loadCart();

const productGrid = document.getElementById("productGrid");
const cartItemsContainer = document.getElementById("cartItems");
const subtotalValue = document.getElementById("subtotalValue");
const totalValue = document.getElementById("totalValue");
const stockList = document.getElementById("stockList");
const stockToggleBtn = document.getElementById("stockToggleBtn");
const stockPanel = document.getElementById("stock");
const enquiryForm = document.getElementById("enquiryForm");
const filterButtons = document.querySelectorAll(".filter-btn");

function loadProducts() {
  const saved = localStorage.getItem(STORAGE_KEYS.products);
  if (!saved) {
    return [...defaultProducts];
  }

  try {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.length) {
      return parsed;
    }
  } catch (error) {
    console.warn("Failed to restore stock state", error);
  }

  return [...defaultProducts];
}

function saveProducts() {
  localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products));
}

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
          <img src="${product.image}" alt="${product.name}" />
          <div class="product-card-body">
            <div class="product-meta">
              <span class="product-category">${product.category}</span>
              <span class="stock-badge available">${product.stock} verfügbar</span>
            </div>
            <h3>${product.name}</h3>
            <p>${product.description}</p>
            <div class="product-footer">
              <div class="product-price">
                <strong>${currency(product.price)}</strong>
                <small>${product.unit}</small>
              </div>
              <button class="button button-primary" data-product-id="${product.id}" type="button">
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
          <img src="${item.image}" alt="${item.name}" />
          <div>
            <h4>${item.name}</h4>
            <p>${item.unit}</p>
          </div>
          <div class="cart-item-controls">
            <div class="qty-control">
              <button type="button" data-cart-adjust="decrease" data-product-id="${item.id}" aria-label="Menge verringern">−</button>
              <span>${item.qty}</span>
              <button type="button" data-cart-adjust="increase" data-product-id="${item.id}" aria-label="Menge erhöhen">+</button>
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

function renderStockList() {
  stockList.innerHTML = products
    .map(
      (product) => `
        <div class="stock-item">
          <div>
            <div class="stock-item-name">${product.name}</div>
            <div class="stock-item-meta">${product.category}</div>
          </div>
          <div class="stock-controls">
            <button class="stock-btn" type="button" data-stock-adjust="-" data-product-id="${product.id}" aria-label="Verringere Lagerbestand">−</button>
            <span class="stock-value">${product.stock}</span>
            <button class="stock-btn" type="button" data-stock-adjust="+" data-product-id="${product.id}" aria-label="Erhöhe Lagerbestand">+</button>
          </div>
          <span class="stock-status ${product.stock > 0 ? "in-stock" : "out-of-stock"}">
            ${product.stock > 0 ? "Vorrätig" : "Ausverkauft"}
          </span>
        </div>
      `
    )
    .join("");

  stockList.querySelectorAll("[data-stock-adjust]").forEach((button) => {
    button.addEventListener("click", () => {
      const productId = button.dataset.productId;
      const direction = button.dataset.stockAdjust;
      updateStock(productId, direction === "+" ? 1 : -1);
    });
  });
}

function updateStock(productId, delta) {
  const product = products.find((entry) => entry.id === productId);
  if (!product) return;

  product.stock = Math.max(0, product.stock + delta);
  saveProducts();
  renderProducts();
  renderStockList();
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

  stockToggleBtn.addEventListener("click", () => {
    stockPanel.classList.toggle("visible");
    stockToggleBtn.textContent = stockPanel.classList.contains("visible") ? "Lager verstecken" : "Lager verwalten";
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

function init() {
  renderProducts();
  renderCart();
  renderStockList();
  setupEventHandlers();
}

init();
