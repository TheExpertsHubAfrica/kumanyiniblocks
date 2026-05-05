const PRODUCT_LIST = [
  "5 Inch Hollow Block", "5 Inch Solid Block", "6 Inch Hollow Block", "6 Inch Solid Block",
  "4 Inch Hollow Block", "4 Inch Solid Block", "8 Inch Hollow Block", "8 Inch Solid Block", "Paving Block"
];

function getQuoteCart() {
  return JSON.parse(sessionStorage.getItem("kb_quote_cart") || "[]");
}
function saveQuoteCart(cart) {
  sessionStorage.setItem("kb_quote_cart", JSON.stringify(cart));
  updateQuoteBadge();
}

function setupProductFilters() {
  const buttons = document.querySelectorAll("[data-filter]");
  const cards = document.querySelectorAll(".product-card");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("is-active"));
      button.classList.add("is-active");
      const filter = button.dataset.filter;
      cards.forEach((card) => {
        const tags = card.dataset.tags || "";
        card.style.display = filter === "all" || tags.includes(filter) ? "" : "none";
      });
    });
  });
}

function setupQuoteCart() {
  const drawer = document.querySelector("#quoteDrawer");
  const list = document.querySelector("#quoteDrawerList");
  const goBtn = document.querySelector("#quoteProceedBtn");
  const render = () => {
    const cart = getQuoteCart();
    if (!list) return;
    list.innerHTML = "";
    cart.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "drawer-row";
      row.innerHTML = `<strong>${item.type}</strong><input type="number" min="1" value="${item.quantity}" data-idx="${index}" /><button type="button" data-remove="${index}">x</button>`;
      list.appendChild(row);
    });
    if (!cart.length) list.innerHTML = "<p>No products added yet.</p>";
  };
  document.querySelectorAll(".add-quote-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const type = btn.dataset.product;
      const cart = getQuoteCart();
      const existing = cart.find((item) => item.type === type);
      if (existing) existing.quantity += 1;
      else cart.push({ type, quantity: 1 });
      saveQuoteCart(cart);
      render();
      drawer?.classList.add("is-open");
      await gasRequest("logProductView", { product: type });
    });
  });
  drawer?.addEventListener("click", (event) => {
    const target = event.target;
    if (target.matches("[data-remove]")) {
      const cart = getQuoteCart();
      cart.splice(Number(target.dataset.remove), 1);
      saveQuoteCart(cart);
      render();
    }
  });
  drawer?.addEventListener("input", (event) => {
    const target = event.target;
    if (!target.matches("input[data-idx]")) return;
    const cart = getQuoteCart();
    const idx = Number(target.dataset.idx);
    cart[idx].quantity = Math.max(1, Number(target.value || 1));
    saveQuoteCart(cart);
  });
  goBtn?.addEventListener("click", () => {
    const cart = encodeURIComponent(JSON.stringify(getQuoteCart()));
    window.location.href = `contact.html?cart=${cart}#quote-tab`;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupProductFilters();
  setupQuoteCart();
});
