const SHEETS = {
  visitors: "visitors",
  quotes: "quotes",
  messages: "messages",
  productViews: "product_views",
  summary: "summary"
};
const DEFAULT_ADMIN_EMAIL = "kumanyiniconstructions@gmail.com";
const DEFAULT_ADMIN_PASSWORD = "KBAdmin2024!";
const SHEET_HEADERS = {};
SHEET_HEADERS[SHEETS.visitors] = ["Timestamp", "Page", "UserAgent", "Referrer"];
SHEET_HEADERS[SHEETS.quotes] = ["Timestamp", "Name", "Phone", "Email", "Products (JSON)", "DeliveryLocation", "Message", "Status"];
SHEET_HEADERS[SHEETS.messages] = ["Timestamp", "Name", "Phone", "Email", "Subject", "Message", "Read"];
SHEET_HEADERS[SHEETS.productViews] = ["Timestamp", "Product"];
SHEET_HEADERS[SHEETS.summary] = ["Date", "Visitors", "Quotes", "Messages"];

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

function handleAdminLogin_(payload) {
  const password = String(payload.password || "");
  if (!password) return { success: false, error: "Password is required." };
  const expectedPassword = getAdminPassword_();
  if (password !== expectedPassword) return { success: false, error: "Incorrect password." };
  return { success: true };
}

function handleMarkMessageRead_(payload) {
  const row = Number(payload.rowIndex || 0);
  if (row < 2) return { success: false, error: "Invalid row index." };
  withLock_(function () { getSheet_(SHEETS.messages).getRange(row, 7).setValue(true); });
  return { success: true };
}

function handleUpdateQuoteStatus_(payload) {
  const row = Number(payload.rowIndex || 0);
  if (row < 2) return { success: false, error: "Invalid row index." };
  withLock_(function () { getSheet_(SHEETS.quotes).getRange(row, 8).setValue(payload.status || "Pending"); });
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
  return {
    success: true,
    message: "Sheets and headers initialized.",
    sheets: requiredSheets
  };
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

function getAdminPassword_() {
  const configuredPassword = PropertiesService.getScriptProperties().getProperty("KB_ADMIN_PASSWORD");
  return configuredPassword || DEFAULT_ADMIN_PASSWORD;
}
