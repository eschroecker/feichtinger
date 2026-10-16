const SUPABASE_URL = "https://qzamzzylzmpiiodrhnds.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_aimbVSduyr3LGEeXmkZAMw_iACzNppR";

const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const loginMessage = document.getElementById("loginMessage");
const loginForm = document.getElementById("loginForm");
const signedInBar = document.getElementById("signedInBar");
const signedInEmail = document.getElementById("signedInEmail");
const signOutButton = document.getElementById("signOutButton");
const refreshButton = document.getElementById("refreshButton");
const newProductButton = document.getElementById("newProductButton");
const productRows = document.getElementById("productRows");
const productCount = document.getElementById("productCount");
const publishedCount = document.getElementById("publishedCount");
const outOfStockCount = document.getElementById("outOfStockCount");
const adminMessage = document.getElementById("adminMessage");
const productDialog = document.getElementById("productDialog");
const productForm = document.getElementById("productForm");
const dialogTitle = document.getElementById("dialogTitle");
const dialogMessage = document.getElementById("dialogMessage");
const saveProductButton = document.getElementById("saveProductButton");
const closeDialogButton = document.getElementById("closeDialogButton");
const cancelDialogButton = document.getElementById("cancelDialogButton");

let supabaseClient;
let products = [];
let activeUserId = null;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function showMessage(element, message, kind = "success") {
  element.textContent = message;
  element.dataset.kind = kind;
  element.hidden = false;
}

function clearMessage(element) {
  element.textContent = "";
  element.hidden = true;
  delete element.dataset.kind;
}

function explainError(error) {
  const message = error?.message || "Unbekannter Fehler";
  if (error?.code === "42501" || /row-level security|permission denied|not allowed/i.test(message)) {
    return "Supabase hat diese Aktion blockiert. Prüfen Sie, ob RLS aktiv ist und die Admin-Policy die UID dieses angemeldeten Benutzers erlaubt.";
  }
  return message;
}

function setBusy(button, busy, busyText) {
  if (busy) {
    button.dataset.idleText = button.textContent;
    button.textContent = busyText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.idleText || button.textContent;
    button.disabled = false;
    delete button.dataset.idleText;
  }
}

function showLogin() {
  activeUserId = null;
  loginView.hidden = false;
  dashboardView.hidden = true;
  signedInBar.hidden = true;
  products = [];
}

async function showDashboard(session) {
  if (!session) {
    showLogin();
    return;
  }

  if (activeUserId === session.user.id && !dashboardView.hidden) {
    return;
  }

  activeUserId = session.user.id;
  signedInEmail.textContent = session.user.email || "Angemeldet";
  signedInBar.hidden = false;
  loginView.hidden = true;
  dashboardView.hidden = false;
  await loadProducts();
}

async function loadProducts() {
  productRows.innerHTML = '<tr><td colspan="6" class="table-empty">Produkte werden geladen ...</td></tr>';
  clearMessage(adminMessage);
  refreshButton.disabled = true;

  const { data, error } = await supabaseClient
    .from("products")
    .select("id,name,category,price,stock,unit,image_url,description,is_published,sort_order,updated_at")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  refreshButton.disabled = false;

  if (error) {
    products = [];
    renderProducts();
    showMessage(adminMessage, `Produkte konnten nicht geladen werden: ${explainError(error)}`, "error");
    return;
  }

  products = data || [];
  renderProducts();
}

function renderProducts() {
  productCount.textContent = String(products.length);
  publishedCount.textContent = String(products.filter((product) => product.is_published).length);
  outOfStockCount.textContent = String(products.filter((product) => Number(product.stock) <= 0).length);

  if (!products.length) {
    productRows.innerHTML = '<tr><td colspan="6" class="table-empty">Noch keine Produkte angelegt.</td></tr>';
    return;
  }

  productRows.innerHTML = products.map((product) => `
    <tr data-row-id="${escapeHtml(product.id)}">
      <td>
        <span class="product-name">${escapeHtml(product.name)}</span>
        <span class="product-id">${escapeHtml(product.id)}</span>
      </td>
      <td>${escapeHtml(categoryLabel(product.category))}</td>
      <td>${formatCurrency(product.price)}</td>
      <td>
        <div class="stock-edit">
          <input data-stock-input type="number" min="0" step="0.001" value="${escapeHtml(product.stock)}" aria-label="Lagerbestand ${escapeHtml(product.name)}" />
          <span class="stock-unit">${escapeHtml(product.unit)}</span>
        </div>
      </td>
      <td class="publish-cell">
        <input data-published-input type="checkbox" ${product.is_published ? "checked" : ""} aria-label="${escapeHtml(product.name)} im Shop anzeigen" />
      </td>
      <td>
        <div class="row-actions">
          <button class="button button-primary" data-action="save-row" type="button">Speichern</button>
          <button class="button button-quiet" data-action="edit" type="button">Bearbeiten</button>
          <button class="button button-quiet delete-button" data-action="delete" type="button">Löschen</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function categoryLabel(category) {
  return {
    Fresh: "Frischfisch",
    Smoked: "Geräucherter Fisch",
    Shellfish: "Meeresfrüchte",
    Seasonal: "Saison"
  }[category] || category;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Number(value));
}

function openNewProductDialog() {
  productForm.reset();
  productForm.elements.id.value = "";
  productForm.elements.sort_order.value = String(products.length);
  productForm.elements.is_published.checked = true;
  dialogTitle.textContent = "Produkt hinzufügen";
  saveProductButton.textContent = "Produkt speichern";
  clearMessage(dialogMessage);
  productDialog.showModal();
}

function openEditProductDialog(product) {
  productForm.reset();
  productForm.elements.id.value = product.id;
  productForm.elements.name.value = product.name;
  productForm.elements.category.value = product.category;
  productForm.elements.unit.value = product.unit;
  productForm.elements.price.value = product.price;
  productForm.elements.stock.value = product.stock;
  productForm.elements.sort_order.value = product.sort_order ?? 0;
  productForm.elements.image_url.value = product.image_url;
  productForm.elements.description.value = product.description;
  productForm.elements.is_published.checked = product.is_published;
  dialogTitle.textContent = "Produkt bearbeiten";
  saveProductButton.textContent = "Änderungen speichern";
  clearMessage(dialogMessage);
  productDialog.showModal();
}

function createProductId(name) {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "produkt";
  let candidate = base;
  let suffix = 2;
  while (products.some((product) => product.id === candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function productFromForm() {
  const formData = new FormData(productForm);
  const name = String(formData.get("name")).trim();
  return {
    id: String(formData.get("id") || createProductId(name)),
    name,
    category: String(formData.get("category")),
    price: Number(formData.get("price")),
    stock: Number(formData.get("stock")),
    unit: String(formData.get("unit")).trim(),
    image_url: String(formData.get("image_url")).trim(),
    description: String(formData.get("description")).trim(),
    is_published: productForm.elements.is_published.checked,
    sort_order: Number(formData.get("sort_order"))
  };
}

async function saveProduct(event) {
  event.preventDefault();
  clearMessage(dialogMessage);

  if (!productForm.reportValidity()) {
    return;
  }

  const product = productFromForm();
  if (!Number.isFinite(product.price) || !Number.isFinite(product.stock) || !Number.isFinite(product.sort_order)) {
    showMessage(dialogMessage, "Preis, Lagerbestand und Sortierung müssen gültige Zahlen sein.", "error");
    return;
  }

  setBusy(saveProductButton, true, "Speichert ...");
  const existingId = productForm.elements.id.value;
  const result = existingId
    ? await supabaseClient.from("products").update(product).eq("id", existingId).select().single()
    : await supabaseClient.from("products").insert(product).select().single();
  setBusy(saveProductButton, false);

  if (result.error) {
    showMessage(dialogMessage, `Speichern fehlgeschlagen: ${explainError(result.error)}`, "error");
    return;
  }

  productDialog.close();
  await loadProducts();
  showMessage(adminMessage, existingId ? "Produkt wurde aktualisiert." : "Produkt wurde angelegt.");
}

async function saveRow(row, button) {
  const productId = row.dataset.rowId;
  const stockInput = row.querySelector("[data-stock-input]");
  const publishedInput = row.querySelector("[data-published-input]");
  const stock = Number(stockInput.value);

  if (!Number.isFinite(stock) || stock < 0) {
    showMessage(adminMessage, "Der Lagerbestand muss eine gültige Zahl ab null sein.", "error");
    stockInput.focus();
    return;
  }

  setBusy(button, true, "Speichert ...");
  const { error } = await supabaseClient
    .from("products")
    .update({ stock, is_published: publishedInput.checked })
    .eq("id", productId)
    .select("id")
    .single();
  setBusy(button, false);

  if (error) {
    showMessage(adminMessage, `Änderung fehlgeschlagen: ${explainError(error)}`, "error");
    return;
  }

  await loadProducts();
  showMessage(adminMessage, "Lagerbestand und Shop-Sichtbarkeit wurden gespeichert.");
}

async function deleteProduct(product) {
  const confirmed = window.confirm(`„${product.name}“ wirklich dauerhaft löschen?`);
  if (!confirmed) return;

  const { error } = await supabaseClient
    .from("products")
    .delete()
    .eq("id", product.id)
    .select("id")
    .single();

  if (error) {
    showMessage(adminMessage, `Löschen fehlgeschlagen: ${explainError(error)}`, "error");
    return;
  }

  await loadProducts();
  showMessage(adminMessage, "Produkt wurde gelöscht.");
}

async function handleProductTableClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const row = button.closest("tr[data-row-id]");
  if (!row) return;
  const product = products.find((entry) => entry.id === row.dataset.rowId);
  if (!product) return;

  if (button.dataset.action === "save-row") {
    await saveRow(row, button);
  } else if (button.dataset.action === "edit") {
    openEditProductDialog(product);
  } else if (button.dataset.action === "delete") {
    await deleteProduct(product);
  }
}

async function signIn(event) {
  event.preventDefault();
  clearMessage(loginMessage);
  const formData = new FormData(loginForm);
  const submitButton = loginForm.querySelector("button[type='submit']");
  setBusy(submitButton, true, "Meldet an ...");
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: String(formData.get("email")).trim(),
    password: String(formData.get("password"))
  });
  setBusy(submitButton, false);

  if (error) {
    showMessage(loginMessage, `Anmeldung fehlgeschlagen: ${error.message}`, "error");
    return;
  }

  loginForm.reset();
  await showDashboard(data.session);
}

async function signOut() {
  signOutButton.disabled = true;
  const { error } = await supabaseClient.auth.signOut();
  signOutButton.disabled = false;
  if (error) {
    showMessage(adminMessage, `Abmelden fehlgeschlagen: ${error.message}`, "error");
  }
}

async function init() {
  if (!window.supabase?.createClient) {
    showMessage(loginMessage, "Die Supabase-Bibliothek konnte nicht geladen werden. Bitte laden Sie die Seite neu.", "error");
    return;
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  loginForm.addEventListener("submit", signIn);
  signOutButton.addEventListener("click", signOut);
  refreshButton.addEventListener("click", loadProducts);
  newProductButton.addEventListener("click", openNewProductDialog);
  productRows.addEventListener("click", handleProductTableClick);
  productForm.addEventListener("submit", saveProduct);
  closeDialogButton.addEventListener("click", () => productDialog.close());
  cancelDialogButton.addEventListener("click", () => productDialog.close());

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    void showDashboard(session);
  });

  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    showMessage(loginMessage, `Sitzung konnte nicht geprüft werden: ${error.message}`, "error");
    return;
  }
  await showDashboard(data.session);
}

init();
