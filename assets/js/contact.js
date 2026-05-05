const PHONE_REGEX = /^0\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const QUOTE_PRODUCTS = [
  "5 Inch Hollow Block", "5 Inch Solid Block", "6 Inch Hollow Block", "6 Inch Solid Block",
  "4 Inch Hollow Block", "4 Inch Solid Block", "8 Inch Hollow Block", "8 Inch Solid Block", "Paving Block"
];

function setFieldError(field, message) {
  const wrap = field.closest(".form-field");
  if (!wrap) return;
  wrap.classList.add("error");
  let err = wrap.querySelector(".error-msg");
  if (!err) {
    err = document.createElement("span");
    err.className = "error-msg";
    wrap.appendChild(err);
  }
  err.textContent = message;
}
function clearFieldError(field) {
  const wrap = field.closest(".form-field");
  if (!wrap) return;
  wrap.classList.remove("error");
  wrap.querySelector(".error-msg")?.remove();
}

function setupTabs() {
  const tabs = document.querySelectorAll("[data-tab]");
  const panes = document.querySelectorAll(".form-tab");
  tabs.forEach((tab) => tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("is-active"));
    panes.forEach((p) => p.classList.remove("is-active"));
    tab.classList.add("is-active");
    document.querySelector(`#${tab.dataset.tab}`)?.classList.add("is-active");
  }));
  if (window.location.hash.includes("quote-tab")) {
    tabs.forEach((t) => t.classList.remove("is-active"));
    panes.forEach((p) => p.classList.remove("is-active"));
    const quoteTab = document.querySelector("[data-tab='quote-tab-pane']");
    quoteTab?.classList.add("is-active");
    document.querySelector("#quote-tab-pane")?.classList.add("is-active");
  }
}

function validateMessageForm(form) {
  let valid = true;
  const required = [["name", 2], ["phone", 10], ["message", 20]];
  required.forEach(([name, min]) => {
    const input = form.elements[name];
    if (!input.value.trim() || input.value.trim().length < min) {
      valid = false;
      setFieldError(input, `Please enter at least ${min} characters.`);
    } else clearFieldError(input);
  });
  if (!PHONE_REGEX.test(form.elements.phone.value.trim())) {
    valid = false; setFieldError(form.elements.phone, "Use a valid Ghana number (10 digits starting with 0).");
  }
  const email = form.elements.email.value.trim();
  if (email && !EMAIL_REGEX.test(email)) { valid = false; setFieldError(form.elements.email, "Enter a valid email address."); }
  return valid;
}

function makeProductRow() {
  const row = document.createElement("div");
  row.className = "quote-row";
  row.innerHTML = `<select class="quote-product">${QUOTE_PRODUCTS.map((p) => `<option value="${p}">${p}</option>`).join("")}</select><input class="quote-qty" type="number" min="1" max="99999" value="1" /><button type="button" class="quote-remove">Remove</button>`;
  return row;
}

function syncQuoteCartBadgeFromRows() {
  const rows = [...document.querySelectorAll("#quoteRows .quote-row")];
  const cart = rows.map((row) => ({
    type: row.querySelector(".quote-product")?.value || "",
    quantity: Number(row.querySelector(".quote-qty")?.value || 1)
  }));
  sessionStorage.setItem("kb_quote_cart", JSON.stringify(cart));
  if (typeof updateQuoteBadge === "function") updateQuoteBadge();
}

function setupQuoteBuilder() {
  const rows = document.querySelector("#quoteRows");
  const addBtn = document.querySelector("#addProductBtn");
  if (!rows || !addBtn) return;
  if (!rows.children.length) rows.appendChild(makeProductRow());
  syncQuoteCartBadgeFromRows();
  addBtn.addEventListener("click", () => {
    if (rows.children.length < 10) {
      rows.appendChild(makeProductRow());
      syncQuoteCartBadgeFromRows();
    }
  });
  rows.addEventListener("click", (e) => {
    if (e.target.matches(".quote-remove") && rows.children.length > 1) {
      e.target.closest(".quote-row")?.remove();
      syncQuoteCartBadgeFromRows();
    }
  });
  rows.addEventListener("change", (e) => {
    if (e.target.matches(".quote-product, .quote-qty")) syncQuoteCartBadgeFromRows();
  });
}

function prefillQuoteFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const cartRaw = params.get("cart");
  if (!cartRaw) return;
  try {
    const cart = JSON.parse(cartRaw);
    const rows = document.querySelector("#quoteRows");
    if (!rows) return;
    rows.innerHTML = "";
    cart.forEach((item) => {
      const row = makeProductRow();
      row.querySelector(".quote-product").value = item.type;
      row.querySelector(".quote-qty").value = item.quantity;
      rows.appendChild(row);
    });
    syncQuoteCartBadgeFromRows();
  } catch (err) {
    console.warn("Could not parse prefilled cart.", err);
  }
}

async function submitMessageForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!validateMessageForm(form)) return;
  const btn = form.querySelector("button[type='submit']");
  btn.disabled = true; btn.textContent = "Sending...";
  const payload = Object.fromEntries(new FormData(form).entries());
  const response = await gasRequest("submitContact", payload);
  btn.disabled = false; btn.textContent = "Send Message";
  if (!response.success) return form.querySelector(".form-status").textContent = "Something went wrong. Please try calling us directly.";
  form.innerHTML = `<article class="card pad"><h3>Message Sent</h3><p>Your message has been received. Reference: MSG-${Date.now()}</p></article>`;
}

async function submitQuoteForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const btn = form.querySelector("button[type='submit']");
  const products = [...document.querySelectorAll("#quoteRows .quote-row")].map((row) => ({
    type: row.querySelector(".quote-product").value,
    quantity: Number(row.querySelector(".quote-qty").value || 1)
  }));
  const payload = {
    ...Object.fromEntries(new FormData(form).entries()),
    products,
    message: form.elements.notes.value.trim()
  };
  btn.disabled = true; btn.textContent = "Sending...";
  const response = await gasRequest("submitQuote", payload);
  btn.disabled = false; btn.textContent = "Submit Quote Request";
  if (!response.success) return form.querySelector(".form-status").textContent = "Something went wrong. Please try calling us directly.";
  form.innerHTML = `<article class="card pad"><h3>Quote Submitted</h3><p>Your quote reference is <strong>${response.referenceId || `KB-${Date.now()}`}</strong>.</p></article>`;
  sessionStorage.removeItem("kb_quote_cart");
}

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupQuoteBuilder();
  prefillQuoteFromUrl();
  document.querySelector("#messageForm")?.addEventListener("submit", submitMessageForm);
  document.querySelector("#quoteForm")?.addEventListener("submit", submitQuoteForm);
});
