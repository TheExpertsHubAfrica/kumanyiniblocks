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

const INVENTORY_PRODUCTS = [
  "5 Inch Hollow Block", "5 Inch Solid Block", "6 Inch Hollow Block", "6 Inch Solid Block",
  "4 Inch Hollow Block", "4 Inch Solid Block", "8 Inch Hollow Block", "8 Inch Solid Block", "Paving Block"
];

const MOCK_INVENTORY = {
  inventory: [
    {
      rowIndex: 2,
      product: "5 Inch Hollow Block",
      quantityOnHand: 1200,
      unit: "pieces",
      yardLocation: "Bay A",
      reorderThreshold: 400,
      notes: "Example row (mock — connect GAS)",
      amountReceivedOnSale: 1250.5,
      updatedAt: "2026-05-01 10:00 UTC",
      updatedBy: "Admin"
    }
  ]
};

let inventoryCache = { inventory: [] };

function setRefreshLoading(isLoading) {
  document.querySelectorAll(".refresh-btn").forEach((btn) => {
    if (isLoading) {
      if (!btn.dataset.idleLabel) btn.dataset.idleLabel = btn.textContent;
      btn.classList.add("is-loading");
      btn.disabled = true;
      btn.setAttribute("aria-busy", "true");
      btn.textContent = "Refreshing…";
    } else {
      btn.classList.remove("is-loading");
      btn.disabled = false;
      btn.removeAttribute("aria-busy");
      if (btn.dataset.idleLabel) btn.textContent = btn.dataset.idleLabel;
    }
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
}

function getInventoryOperator() {
  const el = document.querySelector("#inventoryOperator");
  const v = el?.value?.trim();
  return v || "Admin";
}

function setInventoryMessage(text, isError = false) {
  const el = document.querySelector("#inventoryPanelMessage");
  if (!el) return;
  el.textContent = text || "";
  el.classList.toggle("is-error", Boolean(isError && text));
}

function fillInventoryProductSelect() {
  const sel = document.querySelector("#inventoryProduct");
  if (!sel) return;
  sel.innerHTML = INVENTORY_PRODUCTS.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("");
}

function resetInventoryForm() {
  const form = document.querySelector("#inventoryForm");
  if (!form) return;
  form.reset();
  document.querySelector("#inventoryEditRowIndex").value = "";
  document.querySelector("#inventoryFormHeading").textContent = "Add stock line";
  const submitBtn = document.querySelector("#inventorySubmitBtn");
  if (submitBtn) submitBtn.textContent = "Save line";
  document.querySelector("#inventoryCancelEditBtn").hidden = true;
  fillInventoryProductSelect();
}

function readInventoryFormPayload() {
  const amountRaw = document.querySelector("#inventoryAmountSale").value.trim();
  const payload = {
    operator: getInventoryOperator(),
    product: document.querySelector("#inventoryProduct").value,
    quantityOnHand: Number(document.querySelector("#inventoryQuantity").value),
    unit: document.querySelector("#inventoryUnit").value.trim(),
    yardLocation: document.querySelector("#inventoryYard").value.trim(),
    reorderThreshold: Number(document.querySelector("#inventoryReorder").value),
    notes: document.querySelector("#inventoryNotes").value.trim()
  };
  if (amountRaw !== "") payload.amountReceivedOnSale = Number(amountRaw);
  return payload;
}

function renderInventoryTable() {
  const tbody = document.querySelector("#inventoryTableBody");
  if (!tbody) return;
  const rows = inventoryCache.inventory || [];
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="10" class="table-empty">No stock lines yet. Add one above or connect Google Sheets.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map((r) => {
    const notesShort = (r.notes || "").length > 80 ? `${escapeHtml((r.notes || "").slice(0, 80))}…` : escapeHtml(r.notes || "");
    const sale = r.amountReceivedOnSale === "" || r.amountReceivedOnSale == null ? "—" : escapeHtml(String(r.amountReceivedOnSale));
    return `<tr>
      <td>${escapeHtml(r.product || "")}</td>
      <td>${escapeHtml(String(r.quantityOnHand ?? ""))}</td>
      <td>${escapeHtml(r.unit || "—")}</td>
      <td>${escapeHtml(r.yardLocation || "—")}</td>
      <td>${escapeHtml(String(r.reorderThreshold ?? ""))}</td>
      <td>${sale}</td>
      <td title="${escapeHtml(r.notes || "")}">${notesShort || "—"}</td>
      <td>${escapeHtml(r.updatedAt || "")}</td>
      <td>${escapeHtml(r.updatedBy || "")}</td>
      <td class="no-print">
        <button type="button" class="btn btn--outline inventory-edit-btn" data-inventory-row="${r.rowIndex}">Edit</button>
        <button type="button" class="btn btn--outline inventory-delete-btn" data-inventory-row="${r.rowIndex}">Delete</button>
      </td>
    </tr>`;
  }).join("");
}

async function loadInventory(options = {}) {
  const { showPlaceholder = true } = options;
  const panel = document.querySelector("#inventoryPanel");
  panel?.classList.add("is-fetching");
  try {
    if (showPlaceholder) {
      const tbody = document.querySelector("#inventoryTableBody");
      if (tbody) tbody.innerHTML = '<tr><td colspan="10" class="table-empty">Loading inventory…</td></tr>';
    }
    setInventoryMessage("");
    const res = await gasRequest("getInventory", {});
    if (res.success && Array.isArray(res.inventory)) {
      inventoryCache = { inventory: res.inventory };
    } else if (res.mock) {
      inventoryCache = { inventory: MOCK_INVENTORY.inventory.map((r) => ({ ...r })) };
      setInventoryMessage("GAS URL not configured — showing mock inventory.", false);
    } else {
      inventoryCache = { inventory: [] };
      setInventoryMessage(res.error || "Could not load inventory.", true);
    }
    renderInventoryTable();
  } finally {
    panel?.classList.remove("is-fetching");
  }
}

function openInventoryDeleteDialog(rowIndex) {
  const row = (inventoryCache.inventory || []).find((r) => r.rowIndex === rowIndex);
  const dialog = document.querySelector("#inventoryDeleteDialog");
  const summary = document.querySelector("#inventoryDeleteSummary");
  if (!dialog || !summary) return;
  summary.textContent = row
    ? `Remove ${row.product} (row ${rowIndex}, qty ${row.quantityOnHand})?`
    : `Remove row ${rowIndex}?`;
  dialog.dataset.pendingRow = String(rowIndex);
  dialog.hidden = false;
  document.querySelector("#inventoryDeleteCancelBtn")?.focus();
}

function closeInventoryDeleteDialog() {
  const dialog = document.querySelector("#inventoryDeleteDialog");
  if (dialog) {
    dialog.hidden = true;
    delete dialog.dataset.pendingRow;
  }
}

function setupInventoryPanel() {
  fillInventoryProductSelect();
  document.querySelector("#inventoryForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = document.querySelector("#inventorySubmitBtn");
    const payload = readInventoryFormPayload();
    if (!INVENTORY_PRODUCTS.includes(payload.product)) {
      setInventoryMessage("Choose a valid product from the list.", true);
      return;
    }
    if (Number.isNaN(payload.quantityOnHand) || payload.quantityOnHand < 0) {
      setInventoryMessage("Quantity on hand must be a valid number.", true);
      return;
    }
    const cancelBtn = document.querySelector("#inventoryCancelEditBtn");
    if (cancelBtn) cancelBtn.disabled = true;
    submitBtn.disabled = true;
    submitBtn.classList.add("is-loading");
    submitBtn.setAttribute("aria-busy", "true");
    submitBtn.textContent = "Saving…";
    setInventoryMessage("");
    try {
      const editRow = document.querySelector("#inventoryEditRowIndex").value;
      const res = editRow
        ? await gasRequest("updateInventoryRow", { ...payload, rowIndex: Number(editRow) })
        : await gasRequest("addInventoryRow", payload);
      if (res.success) {
        resetInventoryForm();
        await loadInventory({ showPlaceholder: false });
        setInventoryMessage(editRow ? "Line updated." : "Line added.");
      } else if (res.mock) {
        setInventoryMessage("GAS not configured — cannot save.", true);
      } else {
        setInventoryMessage(res.error || "Save failed.", true);
      }
    } catch (err) {
      setInventoryMessage("Save failed.", true);
    } finally {
      if (cancelBtn) cancelBtn.disabled = false;
      submitBtn.disabled = false;
      submitBtn.classList.remove("is-loading");
      submitBtn.removeAttribute("aria-busy");
      const stillEditing = Boolean(document.querySelector("#inventoryEditRowIndex").value);
      submitBtn.textContent = stillEditing ? "Update line" : "Save line";
    }
  });

  document.querySelector("#inventoryCancelEditBtn")?.addEventListener("click", () => {
    resetInventoryForm();
    setInventoryMessage("");
  });

  document.querySelector("#inventoryTableBody")?.addEventListener("click", (event) => {
    const t = event.target;
    if (t.matches(".inventory-edit-btn")) {
      const rowIndex = Number(t.dataset.inventoryRow);
      const row = (inventoryCache.inventory || []).find((r) => r.rowIndex === rowIndex);
      if (!row) return;
      document.querySelector("#inventoryEditRowIndex").value = String(row.rowIndex);
      document.querySelector("#inventoryFormHeading").textContent = "Edit stock line";
      document.querySelector("#inventorySubmitBtn").textContent = "Update line";
      document.querySelector("#inventoryCancelEditBtn").hidden = false;
      document.querySelector("#inventoryProduct").value = row.product;
      document.querySelector("#inventoryQuantity").value = row.quantityOnHand ?? 0;
      document.querySelector("#inventoryUnit").value = row.unit || "";
      document.querySelector("#inventoryYard").value = row.yardLocation || "";
      document.querySelector("#inventoryReorder").value = row.reorderThreshold ?? 0;
      document.querySelector("#inventoryNotes").value = row.notes || "";
      const sale = row.amountReceivedOnSale;
      document.querySelector("#inventoryAmountSale").value =
        sale === "" || sale == null ? "" : String(sale);
      document.querySelector("#inventoryForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
      setInventoryMessage("");
    }
    if (t.matches(".inventory-delete-btn")) {
      openInventoryDeleteDialog(Number(t.dataset.inventoryRow));
    }
  });

  document.querySelector("#inventoryDeleteCancelBtn")?.addEventListener("click", closeInventoryDeleteDialog);
  document.querySelector("#inventoryDeleteDialog")?.querySelectorAll("[data-inventory-delete-dismiss]").forEach((el) => {
    el.addEventListener("click", closeInventoryDeleteDialog);
  });

  document.querySelector("#inventoryDeleteConfirmBtn")?.addEventListener("click", async () => {
    const dialog = document.querySelector("#inventoryDeleteDialog");
    const rowIndex = Number(dialog?.dataset.pendingRow);
    if (!rowIndex) return;
    const btn = document.querySelector("#inventoryDeleteConfirmBtn");
    const idleDeleteLabel = btn.textContent;
    btn.disabled = true;
    btn.classList.add("is-loading");
    btn.setAttribute("aria-busy", "true");
    btn.textContent = "Deleting…";
    try {
      const res = await gasRequest("deleteInventoryRow", { rowIndex, operator: getInventoryOperator() });
      closeInventoryDeleteDialog();
      if (res.success) {
        resetInventoryForm();
        await loadInventory({ showPlaceholder: false });
        setInventoryMessage("Line deleted.");
      } else if (res.mock) {
        setInventoryMessage("GAS not configured — cannot delete.", true);
      } else {
        setInventoryMessage(res.error || "Delete failed.", true);
      }
    } finally {
      btn.disabled = false;
      btn.classList.remove("is-loading");
      btn.removeAttribute("aria-busy");
      btn.textContent = idleDeleteLabel;
    }
  });

  document.querySelector("#exportInventoryCsvBtn")?.addEventListener("click", () => {
    const rows = inventoryCache.inventory || [];
    const header = "Product,QuantityOnHand,Unit,YardLocation,ReorderThreshold,AmountReceivedOnSale,Notes,UpdatedAt,UpdatedBy,SheetRow";
    const lines = rows.map((r) => {
      const cells = [
        r.product, r.quantityOnHand, r.unit, r.yardLocation, r.reorderThreshold,
        r.amountReceivedOnSale, r.notes, r.updatedAt, r.updatedBy, r.rowIndex
      ];
      return cells.map((c) => `"${String(c ?? "").replaceAll('"', '""')}"`).join(",");
    });
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory.csv";
    a.click();
    URL.revokeObjectURL(url);
  });

  document.querySelector("#printInventoryBtn")?.addEventListener("click", () => {
    const el = document.querySelector("#inventoryPrintDate");
    if (el) el.textContent = `Generated ${new Date().toISOString().replace("T", " ").slice(0, 19)} UTC`;
    const endPrint = () => document.body.classList.remove("print-stock-only");
    document.body.classList.add("print-stock-only");
    window.addEventListener("afterprint", endPrint, { once: true });
    window.print();
  });

  document.addEventListener("keydown", (e) => {
    const dialog = document.querySelector("#inventoryDeleteDialog");
    if (!dialog || dialog.hidden || e.key !== "Escape") return;
    closeInventoryDeleteDialog();
  });
}

function setupAuth() {
  const gate = document.querySelector("#authGate");
  const app = document.querySelector("#dashboardApp");
  if (sessionStorage.getItem("kb_admin_auth") === "true") {
    gate.hidden = true; app.hidden = false; return initDashboard();
  }
  document.querySelector("#loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.querySelector("#adminPassword");
    const loginBtn = document.querySelector('#loginForm button[type="submit"]');
    const idleLabel = loginBtn.textContent;
    loginBtn.classList.add("is-loading");
    loginBtn.disabled = true;
    loginBtn.setAttribute("aria-busy", "true");
    loginBtn.textContent = "Signing in…";
    const response = await gasRequest("adminLogin", { password: input.value });
    if (response.success) {
      sessionStorage.setItem("kb_admin_auth", "true");
      gate.hidden = true; app.hidden = false; initDashboard();
    } else {
      loginBtn.classList.remove("is-loading");
      loginBtn.disabled = false;
      loginBtn.removeAttribute("aria-busy");
      loginBtn.textContent = idleLabel;
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
    const btn = document.querySelector("#clearCacheBtn");
    const idle = btn.textContent;
    btn.classList.add("is-loading");
    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
    btn.textContent = "Clearing…";
    localStorage.removeItem(CACHE_KEY);
    const note = document.querySelector("#settingsNote");
    if (note) note.textContent = "Local cache cleared. Use Refresh Data to fetch new values.";
    requestAnimationFrame(() => {
      btn.classList.remove("is-loading");
      btn.disabled = false;
      btn.removeAttribute("aria-busy");
      btn.textContent = idle;
    });
  });
}

function setupRefresh() {
  document.querySelectorAll(".refresh-btn").forEach((btn) => btn.addEventListener("click", async () => {
    setRefreshLoading(true);
    try {
      const stats = await getStats(true);
      renderOverview(stats); renderProducts(stats); renderQuotes(stats); renderMessages(stats);
      await loadInventory({ showPlaceholder: true });
      document.querySelector("#lastUpdated").textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    } finally {
      setRefreshLoading(false);
    }
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
    const status = target.value;
    const rowIndex = Number(target.dataset.quoteRow);
    target.disabled = true;
    target.classList.add("is-loading");
    target.setAttribute("aria-busy", "true");
    try {
      const res = await gasRequest("updateQuoteStatus", { rowIndex, status });
      if (!res.success) {
        const stats = await getStats(true);
        renderQuotes(stats);
      }
    } finally {
      target.disabled = false;
      target.classList.remove("is-loading");
      target.removeAttribute("aria-busy");
    }
  });
  document.querySelector("#messagesTableBody")?.addEventListener("click", async (event) => {
    const target = event.target;
    if (!target.matches(".mark-read-btn")) return;
    const idle = target.textContent;
    target.disabled = true;
    target.classList.add("is-loading");
    target.setAttribute("aria-busy", "true");
    target.textContent = "Updating…";
    try {
      const res = await gasRequest("markMessageRead", { rowIndex: Number(target.dataset.messageRow) });
      if (res.success) {
        target.closest("tr")?.classList.remove("unread");
        target.remove();
      } else {
        target.disabled = false;
        target.classList.remove("is-loading");
        target.removeAttribute("aria-busy");
        target.textContent = idle;
      }
    } catch (err) {
      target.disabled = false;
      target.classList.remove("is-loading");
      target.removeAttribute("aria-busy");
      target.textContent = idle;
    }
  });
}

async function initDashboard() {
  setupPanels();
  setupSettings();
  setupRefresh();
  setupCSVExport();
  setupRowActions();
  setupInventoryPanel();
  setRefreshLoading(true);
  try {
    const stats = await getStats();
    renderOverview(stats); renderProducts(stats); renderQuotes(stats); renderMessages(stats);
    await loadInventory({ showPlaceholder: true });
  } finally {
    setRefreshLoading(false);
  }
}

document.addEventListener("DOMContentLoaded", setupAuth);
