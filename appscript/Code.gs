const SHEETS = {
  visitors: "visitors",
  quotes: "quotes",
  messages: "messages",
  productViews: "product_views",
  summary: "summary",
  inventory: "inventory",
  inventoryAudit: "inventory_audit",
  sales: "sales",
  adminUsers: "admin_users",
  adminActivity: "admin_activity"
};
const INVENTORY_PRODUCTS = [
  "5 Inch Hollow Block",
  "5 Inch Solid Block",
  "6 Inch Hollow Block",
  "6 Inch Solid Block",
  "4 Inch Hollow Block",
  "4 Inch Solid Block",
  "8 Inch Hollow Block",
  "8 Inch Solid Block",
  "Paving Block"
];
const DEFAULT_ADMIN_EMAIL = "kumanyiniconstructions@gmail.com";
const DEFAULT_ADMIN_PASSWORD = "KBAdmin2024!";
const SHEET_HEADERS = {};
SHEET_HEADERS[SHEETS.visitors] = ["Timestamp", "Page", "UserAgent", "Referrer"];
SHEET_HEADERS[SHEETS.quotes] = ["Timestamp", "Name", "Phone", "Email", "Products (JSON)", "DeliveryLocation", "Message", "Status"];
SHEET_HEADERS[SHEETS.messages] = ["Timestamp", "Name", "Phone", "Email", "Subject", "Message", "Read"];
SHEET_HEADERS[SHEETS.productViews] = ["Timestamp", "Product"];
SHEET_HEADERS[SHEETS.summary] = ["Date", "Visitors", "Quotes", "Messages"];
SHEET_HEADERS[SHEETS.inventory] = [
  "Product",
  "QuantityOnHand",
  "Unit",
  "YardLocation",
  "ReorderThreshold",
  "Notes",
  "UpdatedAt",
  "UpdatedBy"
];
SHEET_HEADERS[SHEETS.inventoryAudit] = ["Timestamp", "Operator", "Action", "RowIndex", "Product", "Detail"];
SHEET_HEADERS[SHEETS.sales] = ["Timestamp", "Operator", "Product", "QuantitySold", "AmountGHS", "Notes", "DeductionsJSON"];
SHEET_HEADERS[SHEETS.adminUsers] = ["Email", "Password", "Active", "DisplayName", "CreatedAt", "Role"];
SHEET_HEADERS[SHEETS.adminActivity] = ["Timestamp", "Email", "DisplayName", "Role", "Action", "Detail"];

function doGet(e) {
  try {
    const payload = parseGetPayload_(e);
    const action = payload.action;
    if (!action) {
      return jsonResponse({ success: true, message: "Kumanyini Blocks GAS API", action: null });
    }
    return jsonResponse(routeAction_(action, payload));
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || "{}");
    const action = payload.action;
    if (!action) return jsonResponse({ success: false, error: "Missing action." });
    return jsonResponse(routeAction_(action, payload));
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function routeAction_(action, payload) {
  switch (action) {
    case "logVisit": return handleLogVisit_(payload);
    case "submitQuote": return handleSubmitQuote_(payload);
    case "submitContact": return handleSubmitContact_(payload);
    case "logProductView": return handleLogProductView_(payload);
    case "adminLogin": return handleAdminLogin_(payload);
    case "getDashboardStats": return handleGetDashboardStats_();
    case "markMessageRead": return handleMarkMessageRead_(payload);
    case "updateQuoteStatus": return handleUpdateQuoteStatus_(payload);
    case "getInventory": return handleGetInventory_();
    case "addInventoryRow": return handleAddInventoryRow_(payload);
    case "updateInventoryRow": return handleUpdateInventoryRow_(payload);
    case "deleteInventoryRow": return handleDeleteInventoryRow_(payload);
    case "getSales": return handleGetSales_();
    case "recordSale": return handleRecordSale_(payload);
    case "getAdminActivity": return handleGetAdminActivity_(payload);
    case "getInventoryAudit": return handleGetInventoryAudit_(payload);
    default: return { success: false, error: "Unknown action." };
  }
}

function jsonResponse(result) {
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function parseGetPayload_(e) {
  const params = e && e.parameter ? e.parameter : {};
  const payload = {};
  Object.keys(params).forEach(function (key) {
    payload[key] = params[key];
  });
  payload.action = payload.action || "";
  if (payload.products) {
    try {
      payload.products = JSON.parse(payload.products);
    } catch (err) {
      payload.products = [];
    }
  }
  if (payload.rowIndex !== undefined) {
    payload.rowIndex = Number(payload.rowIndex);
  }
  if (payload.quantitySold !== undefined && payload.quantitySold !== "") {
    payload.quantitySold = Number(payload.quantitySold);
  }
  if (payload.amountGHS !== undefined && payload.amountGHS !== "") {
    payload.amountGHS = Number(payload.amountGHS);
  }
  return payload;
}

function getSheet_(name) {
  return SpreadsheetApp.getActive().getSheetByName(name);
}

function handleLogVisit_(payload) {
  withLock_(function () {
    getSheet_(SHEETS.visitors).appendRow([new Date(), payload.page || "", payload.userAgent || "", payload.referrer || "direct"]);
  });
  return { success: true };
}

function handleSubmitQuote_(payload) {
  let rowIndex = 0;
  const timestamp = new Date();
  withLock_(function () {
    const sheet = getSheet_(SHEETS.quotes);
    sheet.appendRow([timestamp, payload.name || "", payload.phone || "", payload.email || "", JSON.stringify(payload.products || []), payload.deliveryLocation || "", payload.message || "", "Pending"]);
    rowIndex = sheet.getLastRow();
  });
  const referenceId = "KB-" + Utilities.formatDate(timestamp, "GMT", "yyyyMMdd") + "-" + String(rowIndex).padStart(4, "0");
  sendQuoteNotification_(payload, referenceId, timestamp);
  return { success: true, referenceId: referenceId };
}

function handleSubmitContact_(payload) {
  withLock_(function () {
    getSheet_(SHEETS.messages).appendRow([new Date(), payload.name || "", payload.phone || "", payload.email || "", payload.subject || "", payload.message || "", false]);
  });
  return { success: true };
}

function handleLogProductView_(payload) {
  withLock_(function () {
    getSheet_(SHEETS.productViews).appendRow([new Date(), payload.product || ""]);
  });
  return { success: true };
}

function handleGetDashboardStats_() {
  const visitors = getSheet_(SHEETS.visitors).getDataRange().getValues().slice(1);
  const quotes = getSheet_(SHEETS.quotes).getDataRange().getValues().slice(1);
  const messages = getSheet_(SHEETS.messages).getDataRange().getValues().slice(1);
  const productViews = getSheet_(SHEETS.productViews).getDataRange().getValues().slice(1);
  const summary = getSheet_(SHEETS.summary).getDataRange().getValues().slice(1).slice(-7);
  const today = Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd");
  const visitorsToday = visitors.filter(function (row) { return Utilities.formatDate(new Date(row[0]), "GMT", "yyyy-MM-dd") === today; }).length;
  const pendingQuotes = quotes.filter(function (row) { return row[7] === "Pending"; }).length;
  const unreadMessages = messages.filter(function (row) { return row[6] !== true; }).length;
  const productMap = {};
  productViews.forEach(function (row) { productMap[row[1]] = (productMap[row[1]] || 0) + 1; });
  const quoteRows = quotes.map(function (row, i) {
    const rowIndex = i + 2;
    const quoteDate = row[0] ? new Date(row[0]) : new Date();
    const dateValue = row[0] ? Utilities.formatDate(quoteDate, "GMT", "yyyy-MM-dd HH:mm") : "";
    return {
      rowIndex: rowIndex,
      referenceId: "KB-" + Utilities.formatDate(quoteDate, "GMT", "yyyyMMdd") + "-" + String(rowIndex).padStart(4, "0"),
      date: dateValue,
      name: row[1],
      phone: row[2],
      email: row[3],
      products: row[4],
      deliveryLocation: row[5],
      message: row[6],
      status: row[7] || "Pending"
    };
  });
  const messageRows = messages.map(function (row, i) {
    const rowIndex = i + 2;
    const dateValue = row[0] ? Utilities.formatDate(new Date(row[0]), "GMT", "yyyy-MM-dd HH:mm") : "";
    return {
      rowIndex: rowIndex,
      date: dateValue,
      name: row[1],
      phone: row[2],
      email: row[3],
      subject: row[4],
      message: row[5],
      read: row[6] === true || String(row[6]).toUpperCase() === "TRUE"
    };
  });
  return {
    success: true,
    stats: {
      totalVisitors: visitors.length,
      visitorsToday: visitorsToday,
      totalQuotes: quotes.length,
      pendingQuotes: pendingQuotes,
      totalMessages: messages.length,
      unreadMessages: unreadMessages,
      productViews: productMap,
      dailySummary: summary.map(function (row) { return { date: row[0], visitors: row[1], quotes: row[2], messages: row[3] }; }),
      recentQuotes: quoteRows.slice(-5),
      recentMessages: messageRows.slice(-5),
      allQuotes: quoteRows,
      allMessages: messageRows
    }
  };
}

function normalizeAdminEmail_(e) {
  return String(e || "").trim().toLowerCase();
}

function findAdminUserByEmail_(emailNorm) {
  const sheet = getSheet_(SHEETS.adminUsers);
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    const row = data[i];
    if (normalizeAdminEmail_(row[0]) !== emailNorm) continue;
    const active = row[2] === true || String(row[2]).toUpperCase() === "TRUE";
    return {
      email: normalizeAdminEmail_(row[0]),
      password: String(row[1] || ""),
      active: active,
      displayName: String(row[3] || row[0]),
      role: String(row[5] || "admin")
    };
  }
  return null;
}

function logAdminActivity_(email, displayName, role, action, detailObj) {
  try {
    const sheet = getSheet_(SHEETS.adminActivity);
    if (!sheet) return;
    sheet.appendRow([
      new Date(),
      String(email || ""),
      String(displayName || ""),
      String(role || ""),
      action,
      JSON.stringify(detailObj || {})
    ]);
  } catch (err) {
    // Do not fail primary operations if activity log write fails.
  }
}

function actorLabel_(payload) {
  const d = String(payload.actorDisplayName || "").trim();
  if (d) return d;
  const em = String(payload.actorEmail || "").trim();
  return em || "Admin";
}

function handleAdminLogin_(payload) {
  const email = normalizeAdminEmail_(payload.email);
  const password = String(payload.password || "");
  if (!email || !password) {
    return { success: false, error: "Email and password are required." };
  }
  const sheet = getSheet_(SHEETS.adminUsers);
  if (!sheet) {
    return {
      success: false,
      error: "Admin accounts are not set up yet. Open Apps Script, run setupSheets, then try again."
    };
  }
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return {
      success: false,
      error: "No admin accounts found. Run setupSheets in Apps Script to create the default user, then try again."
    };
  }
  for (var i = 1; i < data.length; i++) {
    const row = data[i];
    const rowEmail = normalizeAdminEmail_(row[0]);
    const rowPass = String(row[1] || "");
    const active = row[2] === true || String(row[2]).toUpperCase() === "TRUE";
    const displayName = String(row[3] || rowEmail);
    const role = String(row[5] || "admin");
    if (rowEmail === email && rowPass === password && active) {
      logAdminActivity_(rowEmail, displayName, role, "LOGIN", {});
      return {
        success: true,
        user: { email: rowEmail, displayName: displayName, role: role }
      };
    }
  }
  return { success: false, error: "Invalid email or password." };
}

function handleMarkMessageRead_(payload) {
  const row = Number(payload.rowIndex || 0);
  if (row < 2) return { success: false, error: "Invalid row index." };
  withLock_(function () { getSheet_(SHEETS.messages).getRange(row, 7).setValue(true); });
  logAdminActivity_(
    normalizeAdminEmail_(payload.actorEmail),
    String(payload.actorDisplayName || ""),
    String(payload.actorRole || ""),
    "MESSAGE_MARK_READ",
    { rowIndex: row }
  );
  return { success: true };
}

function handleUpdateQuoteStatus_(payload) {
  const row = Number(payload.rowIndex || 0);
  if (row < 2) return { success: false, error: "Invalid row index." };
  const status = payload.status || "Pending";
  withLock_(function () { getSheet_(SHEETS.quotes).getRange(row, 8).setValue(status); });
  logAdminActivity_(
    normalizeAdminEmail_(payload.actorEmail),
    String(payload.actorDisplayName || ""),
    String(payload.actorRole || ""),
    "QUOTE_STATUS_UPDATE",
    { rowIndex: row, status: status }
  );
  return { success: true };
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { fn(); } finally { lock.releaseLock(); }
}

function computeSummary() {
  const visitors = getSheet_(SHEETS.visitors).getDataRange().getValues().slice(1);
  const quotes = getSheet_(SHEETS.quotes).getDataRange().getValues().slice(1);
  const messages = getSheet_(SHEETS.messages).getDataRange().getValues().slice(1);
  const day = Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd");
  const row = [
    day,
    visitors.filter(function (r) { return Utilities.formatDate(new Date(r[0]), "GMT", "yyyy-MM-dd") === day; }).length,
    quotes.filter(function (r) { return Utilities.formatDate(new Date(r[0]), "GMT", "yyyy-MM-dd") === day; }).length,
    messages.filter(function (r) { return Utilities.formatDate(new Date(r[0]), "GMT", "yyyy-MM-dd") === day; }).length
  ];
  withLock_(function () { getSheet_(SHEETS.summary).appendRow(row); });
}

function setupSheets() {
  const spreadsheet = SpreadsheetApp.getActive();
  const requiredSheets = Object.keys(SHEET_HEADERS);
  requiredSheets.forEach(function (sheetName) {
    let sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
    }
    ensureHeaders_(sheet, SHEET_HEADERS[sheetName]);
  });
  seedDefaultAdminUserIfEmpty_();
  return {
    success: true,
    message: "Sheets and headers initialized.",
    sheets: requiredSheets
  };
}

function seedDefaultAdminUserIfEmpty_() {
  const sheet = getSheet_(SHEETS.adminUsers);
  if (!sheet || sheet.getLastRow() > 1) return;
  sheet.appendRow([
    DEFAULT_ADMIN_EMAIL,
    DEFAULT_ADMIN_PASSWORD,
    true,
    "Kumanyini Admin",
    new Date(),
    "super_admin"
  ]);
}

function ensureHeaders_(sheet, headers) {
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  const existingHeaders = headerRange.getValues()[0];
  const isHeaderMissing = existingHeaders.every(function (value) { return value === ""; });
  const headersMismatch = headers.some(function (header, index) { return existingHeaders[index] !== header; });
  if (isHeaderMissing || headersMismatch) {
    headerRange.setValues([headers]);
  }
}

function sendQuoteNotification_(payload, referenceId, timestamp) {
  try {
    const adminEmail = getAdminEmail_();
    if (!adminEmail) return;
    const products = (payload.products || []).map(function (item) {
      return (item.type || "Unknown") + " x" + (item.quantity || 0);
    }).join(", ");
    const subject = "New Quote Request: " + referenceId;
    const body = [
      "A new quote request was submitted.",
      "",
      "Reference ID: " + referenceId,
      "Date: " + Utilities.formatDate(timestamp, "GMT", "yyyy-MM-dd HH:mm:ss") + " UTC",
      "Name: " + (payload.name || ""),
      "Phone: " + (payload.phone || ""),
      "Email: " + (payload.email || ""),
      "Delivery Location: " + (payload.deliveryLocation || ""),
      "Products: " + products,
      "Message: " + (payload.message || "")
    ].join("\n");
    MailApp.sendEmail(adminEmail, subject, body);
  } catch (err) {
    // Keep quote submission successful even if email fails.
  }
}

function getAdminEmail_() {
  const configuredEmail = PropertiesService.getScriptProperties().getProperty("KB_ADMIN_EMAIL");
  return configuredEmail || DEFAULT_ADMIN_EMAIL;
}

function handleGetAdminActivity_(payload) {
  try {
    const email = normalizeAdminEmail_(payload.actorEmail);
    if (!email) return { success: false, error: "Unauthorized." };
    const user = findAdminUserByEmail_(email);
    if (!user || !user.active) return { success: false, error: "Unauthorized." };
    const sheet = getSheet_(SHEETS.adminActivity);
    if (!sheet) return { success: false, error: "Activity log missing. Run setupSheets." };
    const data = sheet.getDataRange().getValues();
    const out = [];
    for (var i = 1; i < data.length; i++) {
      const r = data[i];
      if (r.every(function (c) { return c === ""; })) continue;
      const ts = r[0];
      out.push({
        timestamp: ts instanceof Date ? Utilities.formatDate(ts, "GMT", "yyyy-MM-dd HH:mm:ss") + " UTC" : String(ts || ""),
        email: r[1],
        displayName: r[2],
        role: r[3],
        action: r[4],
        detail: r[5]
      });
    }
    out.reverse();
    const cap = 300;
    const activities = out.length > cap ? out.slice(0, cap) : out;
    return { success: true, activities: activities };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function handleGetInventoryAudit_(payload) {
  try {
    const email = normalizeAdminEmail_(payload.actorEmail);
    if (!email) return { success: false, error: "Unauthorized." };
    const user = findAdminUserByEmail_(email);
    if (!user || !user.active) return { success: false, error: "Unauthorized." };
    if (String(user.role).toLowerCase() !== "super_admin") {
      return { success: false, error: "Only super admins can view the inventory audit log." };
    }
    const sheet = getSheet_(SHEETS.inventoryAudit);
    if (!sheet) return { success: false, error: "Inventory audit sheet missing." };
    const data = sheet.getDataRange().getValues();
    const out = [];
    for (var i = 1; i < data.length; i++) {
      const r = data[i];
      if (r.every(function (c) { return c === ""; })) continue;
      const ts = r[0];
      out.push({
        timestamp: ts instanceof Date ? Utilities.formatDate(ts, "GMT", "yyyy-MM-dd HH:mm:ss") + " UTC" : String(ts || ""),
        operator: r[1],
        action: r[2],
        rowIndex: r[3],
        product: r[4],
        detail: r[5]
      });
    }
    out.reverse();
    const cap = 300;
    const auditLog = out.length > cap ? out.slice(0, cap) : out;
    return { success: true, auditLog: auditLog };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function validateInventoryProduct_(name) {
  const n = String(name || "").trim();
  if (INVENTORY_PRODUCTS.indexOf(n) === -1) {
    throw new Error("Invalid product name.");
  }
  return n;
}

function normalizeQty_(v) {
  const n = Number(v);
  if (isNaN(n) || n < 0) return 0;
  return Math.min(Math.floor(n), 999999);
}

function normalizeInventoryAmount_(v) {
  if (v === undefined || v === null || v === "") return "";
  const n = Number(v);
  if (isNaN(n) || n < 0) return "";
  return n;
}

const INVENTORY_ROW_WIDTH = 8;

function formatInventoryDateCell_(d) {
  if (d instanceof Date) {
    return Utilities.formatDate(d, "GMT", "yyyy-MM-dd HH:mm") + " UTC";
  }
  return d ? String(d) : "";
}

function snapshotFromInventoryRow_(rowVals) {
  const d = rowVals[6];
  return {
    product: rowVals[0],
    quantityOnHand: rowVals[1],
    unit: rowVals[2],
    yardLocation: rowVals[3],
    reorderThreshold: rowVals[4],
    notes: rowVals[5],
    updatedAt: formatInventoryDateCell_(d),
    updatedBy: rowVals[7] || ""
  };
}

function logInventoryAudit_(operator, action, rowIndex, product, detailObj) {
  const sheet = getSheet_(SHEETS.inventoryAudit);
  sheet.appendRow([
    new Date(),
    String(operator || "Admin"),
    action,
    rowIndex,
    String(product || ""),
    JSON.stringify(detailObj || {})
  ]);
}

function handleGetInventory_() {
  try {
    const sheet = getSheet_(SHEETS.inventory);
    if (!sheet) return { success: false, error: "Inventory sheet missing. Run setupSheets in the script editor." };
    const data = sheet.getDataRange().getValues();
    const rows = [];
    for (var i = 1; i < data.length; i++) {
      const line = data[i];
      if (line.every(function (c) { return c === ""; })) continue;
      const rowVals = sheet.getRange(i + 1, 1, 1, INVENTORY_ROW_WIDTH).getValues()[0];
      const snap = snapshotFromInventoryRow_(rowVals);
      rows.push({
        rowIndex: i + 1,
        product: snap.product,
        quantityOnHand: snap.quantityOnHand,
        unit: snap.unit,
        yardLocation: snap.yardLocation,
        reorderThreshold: snap.reorderThreshold,
        notes: snap.notes,
        updatedAt: snap.updatedAt,
        updatedBy: snap.updatedBy
      });
    }
    return { success: true, inventory: rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function handleAddInventoryRow_(payload) {
  let newRowIndex = 0;
  try {
    const product = validateInventoryProduct_(payload.product);
    const operator = actorLabel_(payload);
    const qty = normalizeQty_(payload.quantityOnHand);
    const reorder = normalizeQty_(payload.reorderThreshold);
    const unit = String(payload.unit || "").trim().slice(0, 80);
    const yard = String(payload.yardLocation || "").trim().slice(0, 120);
    const notes = String(payload.notes || "").trim().slice(0, 2000);
    withLock_(function () {
      const sheet = getSheet_(SHEETS.inventory);
      const now = new Date();
      const row = [product, qty, unit, yard, reorder, notes, now, operator];
      sheet.appendRow(row);
      newRowIndex = sheet.getLastRow();
      logInventoryAudit_(operator, "CREATE", newRowIndex, product, { after: snapshotFromInventoryRow_(row) });
    });
    logAdminActivity_(
      normalizeAdminEmail_(payload.actorEmail),
      String(payload.actorDisplayName || ""),
      String(payload.actorRole || ""),
      "INVENTORY_CREATE",
      { rowIndex: newRowIndex, product: product }
    );
    return { success: true, rowIndex: newRowIndex };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function handleUpdateInventoryRow_(payload) {
  const row = Number(payload.rowIndex || 0);
  if (row < 2) return { success: false, error: "Invalid row index." };
  try {
    const product = validateInventoryProduct_(payload.product);
    const operator = actorLabel_(payload);
    const qty = normalizeQty_(payload.quantityOnHand);
    const reorder = normalizeQty_(payload.reorderThreshold);
    const unit = String(payload.unit || "").trim().slice(0, 80);
    const yard = String(payload.yardLocation || "").trim().slice(0, 120);
    const notes = String(payload.notes || "").trim().slice(0, 2000);
    withLock_(function () {
      const sheet = getSheet_(SHEETS.inventory);
      const last = sheet.getLastRow();
      if (row > last) throw new Error("Row not found.");
      const oldVals = sheet.getRange(row, 1, 1, INVENTORY_ROW_WIDTH).getValues()[0];
      if (oldVals.every(function (c) { return c === ""; })) throw new Error("Row not found.");
      const before = snapshotFromInventoryRow_(oldVals);
      const now = new Date();
      const newRow = [product, qty, unit, yard, reorder, notes, now, operator];
      sheet.getRange(row, 1, 1, INVENTORY_ROW_WIDTH).setValues([newRow]);
      logInventoryAudit_(operator, "UPDATE", row, product, {
        before: before,
        after: snapshotFromInventoryRow_(newRow)
      });
    });
    logAdminActivity_(
      normalizeAdminEmail_(payload.actorEmail),
      String(payload.actorDisplayName || ""),
      String(payload.actorRole || ""),
      "INVENTORY_UPDATE",
      { rowIndex: row, product: product }
    );
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function handleDeleteInventoryRow_(payload) {
  const row = Number(payload.rowIndex || 0);
  if (row < 2) return { success: false, error: "Invalid row index." };
  try {
    let deletedProduct = "";
    const operator = actorLabel_(payload);
    withLock_(function () {
      const sheet = getSheet_(SHEETS.inventory);
      const last = sheet.getLastRow();
      if (row > last) throw new Error("Row not found.");
      const oldVals = sheet.getRange(row, 1, 1, INVENTORY_ROW_WIDTH).getValues()[0];
      if (oldVals.every(function (c) { return c === ""; })) throw new Error("Row not found.");
      const before = snapshotFromInventoryRow_(oldVals);
      deletedProduct = String(oldVals[0] || "");
      sheet.deleteRow(row);
      logInventoryAudit_(operator, "DELETE", row, deletedProduct, { before: before });
    });
    logAdminActivity_(
      normalizeAdminEmail_(payload.actorEmail),
      String(payload.actorDisplayName || ""),
      String(payload.actorRole || ""),
      "INVENTORY_DELETE",
      { rowIndex: row, product: deletedProduct }
    );
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function handleGetSales_() {
  try {
    const sheet = getSheet_(SHEETS.sales);
    if (!sheet) return { success: false, error: "Sales sheet missing. Run setupSheets in the script editor." };
    const data = sheet.getDataRange().getValues();
    const out = [];
    for (var i = 1; i < data.length; i++) {
      const r = data[i];
      if (r.every(function (c) { return c === ""; })) continue;
      const ts = r[0];
      out.push({
        rowIndex: i + 1,
        date: ts instanceof Date ? Utilities.formatDate(ts, "GMT", "yyyy-MM-dd HH:mm") + " UTC" : String(ts || ""),
        operator: r[1],
        product: r[2],
        quantitySold: r[3],
        amountGHS: r[4],
        notes: r[5],
        deductionsJson: r[6]
      });
    }
    out.reverse();
    const cap = 200;
    const sales = out.length > cap ? out.slice(0, cap) : out;
    return { success: true, sales: sales };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function handleRecordSale_(payload) {
  try {
    const product = validateInventoryProduct_(payload.product);
    const operator = actorLabel_(payload);
    const qtySold = normalizeQty_(payload.quantitySold);
    if (qtySold < 1) throw new Error("Quantity sold must be at least 1.");
    const amountGHS = normalizeInventoryAmount_(payload.amountGHS);
    const notes = String(payload.notes || "").trim().slice(0, 2000);
    const deductions = [];
    withLock_(function () {
      const sheet = getSheet_(SHEETS.inventory);
      let remaining = qtySold;
      while (remaining > 0) {
        const data = sheet.getDataRange().getValues();
        let hit = null;
        for (var i = 1; i < data.length; i++) {
          const line = data[i];
          if (line.every(function (c) { return c === ""; })) continue;
          if (String(line[0]) !== product) continue;
          const qh = normalizeQty_(line[1]);
          if (qh < 1) continue;
          hit = { sheetRow: i + 1, qty: qh };
          break;
        }
        if (!hit) {
          throw new Error(
            "Insufficient stock for " + product + ". Could not fulfill " + qtySold + " units (short by " + remaining + ")."
          );
        }
        const deduct = Math.min(remaining, hit.qty);
        const rowVals = sheet.getRange(hit.sheetRow, 1, 1, INVENTORY_ROW_WIDTH).getValues()[0];
        const before = snapshotFromInventoryRow_(rowVals);
        const newQty = normalizeQty_(rowVals[1]) - deduct;
        rowVals[1] = newQty;
        const now = new Date();
        rowVals[6] = now;
        rowVals[7] = operator;
        sheet.getRange(hit.sheetRow, 1, 1, INVENTORY_ROW_WIDTH).setValues([rowVals]);
        const after = snapshotFromInventoryRow_(rowVals);
        logInventoryAudit_(operator, "SALE_DEDUCT", hit.sheetRow, product, {
          quantitySold: qtySold,
          deductedHere: deduct,
          before: before,
          after: after
        });
        deductions.push({ rowIndex: hit.sheetRow, deducted: deduct });
        remaining -= deduct;
      }
      const salesSheet = getSheet_(SHEETS.sales);
      salesSheet.appendRow([
        new Date(),
        operator,
        product,
        qtySold,
        amountGHS === "" ? "" : amountGHS,
        notes,
        JSON.stringify(deductions)
      ]);
    });
    logAdminActivity_(
      normalizeAdminEmail_(payload.actorEmail),
      String(payload.actorDisplayName || ""),
      String(payload.actorRole || ""),
      "SALE_RECORD",
      {
        product: product,
        quantitySold: qtySold,
        amountGHS: amountGHS === "" ? null : amountGHS,
        deductions: deductions
      }
    );
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
