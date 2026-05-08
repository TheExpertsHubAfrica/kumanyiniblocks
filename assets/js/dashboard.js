const CACHE_KEY = "kb_stats_cache";
const CACHE_TTL = 300000;
let visitorsChart;
let productsChart;

const MOCK_STATS = {
  totalVisitors: 1284, visitorsToday: 42, totalQuotes: 93, pendingQuotes: 14, totalMessages: 61, unreadMessages: 9,
  productViews: { "5 Inch Hollow": 345, "5 Inch Solid": 221, "6 Inch Hollow": 298, "6 Inch Solid": 187, "4 Inch Hollow": 156, "4 Inch Solid": 103, "8 Inch Hollow": 189, "8 Inch Solid": 134, "Paving Block": 247 },
  dailySummary: [
    { date: "2024-06-09", visitors: 28, quotes: 3, messages: 2 }, { date: "2024-06-10", visitors: 35, quotes: 5, messages: 4 },
    { date: "2024-06-11", visitors: 41, quotes: 6, messages: 3 }, { date: "2024-06-12", visitors: 38, quotes: 4, messages: 5 },
    { date: "2024-06-13", visitors: 52, quotes: 8, messages: 6 }, { date: "2024-06-14", visitors: 44, quotes: 7, messages: 4 }, { date: "2024-06-15", visitors: 42, quotes: 5, messages: 3 }
  ],
  recentQuotes: [],
  recentMessages: []
};

function setupAuth() {
  const gate = document.querySelector("#authGate");
  const app = document.querySelector("#dashboardApp");
  if (sessionStorage.getItem("kb_admin_auth") === "true") {
    gate.hidden = true; app.hidden = false; return initDashboard();
  }
  document.querySelector("#loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.querySelector("#adminPassword");
    const response = await gasRequest("adminLogin", { password: input.value });
    if (response.success) {
      sessionStorage.setItem("kb_admin_auth", "true");
      gate.hidden = true; app.hidden = false; initDashboard();
    } else {
      document.querySelector(".login-card")?.classList.add("shake");
      const message = response.mock ? "Set GAS URL in assets/js/main.js first." : "Incorrect password.";
      document.querySelector("#loginError").textContent = message;
      setTimeout(() => document.querySelector(".login-card")?.classList.remove("shake"), 300);
    }
  });
}

async function getStats(force = false) {
  const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
  if (!force && cache && Date.now() - cache.timestamp < CACHE_TTL) return cache.stats;
  const response = await gasRequest("getDashboardStats");
  const stats = response.success ? response.stats : MOCK_STATS;
  localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), stats }));
  return stats;
}

function renderOverview(stats) {
  document.querySelector("#kpiVisitors").textContent = stats.totalVisitors;
  document.querySelector("#kpiQuotes").textContent = stats.totalQuotes;
  document.querySelector("#kpiMessages").textContent = stats.totalMessages;
  document.querySelector("#kpiPending").textContent = stats.pendingQuotes;
  const tbody = document.querySelector("#summaryTableBody");
  const summaryRows = stats.dailySummary || [];
  tbody.innerHTML = summaryRows.length
    ? summaryRows.map((d, i) => `<tr class="${i === summaryRows.length - 1 ? "latest-row" : ""}"><td>${d.date}</td><td>${d.visitors}</td><td>${d.quotes}</td><td>${d.messages}</td></tr>`).join("")
    : '<tr><td colspan="4" class="table-empty">No summary data available yet.</td></tr>';
  if (visitorsChart) visitorsChart.destroy();
  visitorsChart = new Chart(document.querySelector("#visitorsChart"), {
    type: "line",
    data: { labels: stats.dailySummary.map((d) => d.date), datasets: [{ data: stats.dailySummary.map((d) => d.visitors), borderColor: "#0077B6", tension: 0.4 }] },
    options: { plugins: { legend: { display: false } } }
  });
}

function renderProducts(stats) {
  const entries = Object.entries(stats.productViews);
  if (productsChart) productsChart.destroy();
  productsChart = new Chart(document.querySelector("#productsChart"), {
    type: "bar",
    data: { labels: entries.map((e) => e[0]), datasets: [{ data: entries.map((e) => e[1]), backgroundColor: "#0077B6" }] },
    options: { indexAxis: "y", plugins: { legend: { display: false } } }
  });
}

function renderQuotes(stats) {
  const rows = stats.allQuotes || stats.recentQuotes || [];
  const tbody = document.querySelector("#quotesTableBody");
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="table-empty">No quote requests yet.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map((q) => {
    const status = q.status || "Pending";
    const map = { "Pending": "status-pending", "In Progress": "status-progress", "Fulfilled": "status-fulfilled", "Cancelled": "status-cancelled" };
    let products = q.products || "";
    try {
      const parsed = typeof products === "string" ? JSON.parse(products) : products;
      if (Array.isArray(parsed)) {
        products = parsed.map((item) => `<span class="product-line">${item.type || "Product"} x${item.quantity || 0}</span>`).join("");
      }
    } catch (err) {
      products = q.products || "";
    }
    return `<tr><td>${q.referenceId || ""}</td><td>${q.date || ""}</td><td>${q.name || ""}</td><td>${q.phone || ""}</td><td class="products-cell">${products}</td><td>${q.deliveryLocation || ""}</td><td><span class="status-badge ${map[status] || "status-pending"}">${status}</span></td><td><select data-quote-row="${q.rowIndex || ""}"><option ${status === "Pending" ? "selected" : ""}>Pending</option><option ${status === "In Progress" ? "selected" : ""}>In Progress</option><option ${status === "Fulfilled" ? "selected" : ""}>Fulfilled</option><option ${status === "Cancelled" ? "selected" : ""}>Cancelled</option></select></td></tr>`;
  }).join("");
}

function renderMessages(stats) {
  const rows = stats.allMessages || stats.recentMessages || [];
  const tbody = document.querySelector("#messagesTableBody");
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No messages yet.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map((m) => `<tr class="${m.read ? "" : "unread"}"><td>${m.date || ""}</td><td>${m.name || ""}</td><td>${m.phone || ""}</td><td>${m.email || ""}</td><td>${m.subject || ""}</td><td>${(m.message || "").slice(0, 60)}${(m.message || "").length > 60 ? "..." : ""}<br /><button class="btn btn--outline mark-read-btn" data-message-row="${m.rowIndex || ""}">Mark as Read</button></td><td>${m.read ? "Yes" : "No"}</td></tr>`).join("");
}

function setupPanels() {
  const tabs = document.querySelectorAll("[data-panel]");
  const panels = document.querySelectorAll(".panel");
  tabs.forEach((tab) => tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("is-active"));
    panels.forEach((p) => p.classList.remove("is-active"));
    tab.classList.add("is-active");
    document.querySelector(`#${tab.dataset.panel}`)?.classList.add("is-active");
  }));
  document.querySelector("#logoutBtn")?.addEventListener("click", () => { sessionStorage.clear(); location.reload(); });
}

function setupSettings() {
  document.querySelector("#clearCacheBtn")?.addEventListener("click", () => {
    localStorage.removeItem(CACHE_KEY);
    const note = document.querySelector("#settingsNote");
    if (note) note.textContent = "Local cache cleared. Use Refresh Data to fetch new values.";
  });
}

function setupRefresh() {
  document.querySelectorAll(".refresh-btn").forEach((btn) => btn.addEventListener("click", async () => {
    const stats = await getStats(true);
    renderOverview(stats); renderProducts(stats); renderQuotes(stats); renderMessages(stats);
    document.querySelector("#lastUpdated").textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
  }));
}

function setupCSVExport() {
  document.querySelector("#exportQuotesBtn")?.addEventListener("click", () => {
    const rows = [...document.querySelectorAll("#quotesTableBody tr")].map((tr) => [...tr.children].slice(0, 7).map((td) => `"${td.textContent.trim().replaceAll('"', '""')}"`).join(","));
    const csv = ["Ref ID,Date,Name,Phone,Products,Delivery,Status", ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "quotes.csv"; a.click();
    URL.revokeObjectURL(url);
  });
}

function setupRowActions() {
  document.querySelector("#quotesTableBody")?.addEventListener("change", async (event) => {
    const target = event.target;
    if (!target.matches("select[data-quote-row]")) return;
    await gasRequest("updateQuoteStatus", { rowIndex: Number(target.dataset.quoteRow), status: target.value });
  });
  document.querySelector("#messagesTableBody")?.addEventListener("click", async (event) => {
    const target = event.target;
    if (!target.matches(".mark-read-btn")) return;
    await gasRequest("markMessageRead", { rowIndex: Number(target.dataset.messageRow) });
    target.closest("tr")?.classList.remove("unread");
    target.remove();
  });
}

async function initDashboard() {
  setupPanels();
  setupSettings();
  setupRefresh();
  setupCSVExport();
  setupRowActions();
  const stats = await getStats();
  renderOverview(stats); renderProducts(stats); renderQuotes(stats); renderMessages(stats);
}

document.addEventListener("DOMContentLoaded", setupAuth);
