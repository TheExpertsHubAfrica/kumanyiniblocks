# CLAUDE.md — Kumanyini Blocks Project

> This file is the authoritative reference for AI-assisted development on this project.
> Read it fully before making any changes. Follow every rule here without exception.

---

## 1. PROJECT IDENTITY

| Field | Value |
|---|---|
| Project | Kumanyini Blocks — Business Website + Admin Dashboard |
| Client | Kumanyini Blocks (Kumanyini Constructions) |
| Location | Asekye Nkoranza, Bono East Region, Ghana |
| Phone | 0550203197 |
| Email | kumanyiniconstructions@gmail.com |
| WhatsApp Link | `https://wa.me/233550203197` |
| Stage | Active Development |

---

## 2. TECH STACK — HARD CONSTRAINTS

These are fixed. Do not suggest alternatives. Do not introduce new dependencies without explicit instruction.

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3 (custom properties only), Vanilla JavaScript ES6+ |
| Backend | Google Apps Script (GAS), deployed as a Web App |
| Data Store | Google Sheets (5 tabs: `visitors`, `quotes`, `messages`, `product_views`, `summary`) |
| Charts | Chart.js via CDN (dashboard only) |
| Fonts | Google Fonts — Playfair Display, DM Sans, JetBrains Mono |
| Build Tool | None — zero build step, pure static files |
| Package Manager | None — no npm, no yarn, no pip |
| Frameworks | None — no React, Vue, Angular, Tailwind, Bootstrap |

**Never introduce:** any npm package, any CSS framework, any JS framework, any backend language other than GAS, any database other than Google Sheets.

---

## 3. FILE STRUCTURE

Do not create files outside this structure without asking first.

```
kumanyini-blocks/
├── index.html
├── products.html
├── about.html
├── gallery.html
├── contact.html
├── CLAUDE.md                  ← this file
├── README.md
├── admin/
│   └── dashboard.html
├── assets/
│   ├── css/
│   │   ├── main.css           ← global styles, CSS variables, reset
│   │   ├── nav.css            ← navigation + mobile drawer
│   │   ├── footer.css         ← footer styles
│   │   └── dashboard.css      ← dashboard-only styles
│   ├── js/
│   │   ├── main.js            ← shared logic: gasRequest(), logVisit(), nav, scroll
│   │   ├── products.js        ← filter, quote cart, logProductView()
│   │   ├── contact.js         ← form validation and GAS submission
│   │   ├── gallery.js         ← masonry layout, lightbox, filter
│   │   └── dashboard.js       ← auth, data fetch, charts, tables
│   └── images/
│       └── [product and gallery image slots]
└── appscript/
    └── Code.gs
```

---

## 4. BRAND & DESIGN SYSTEM

### 4.1 CSS Variables (defined in `main.css`, used everywhere)

```css
:root {
  --color-primary:      #0077B6;   /* Sea Blue — primary brand */
  --color-primary-dark: #023E8A;   /* Deep Navy — secondary / hero backgrounds */
  --color-white:        #FFFFFF;
  --color-surface:      #F4F8FB;   /* Light gray page background */
  --color-text:         #0D1B2A;   /* Near-black body text */
  --color-text-muted:   #4A6275;   /* Secondary / caption text */
  --color-success:      #2D9E6B;
  --color-warning:      #E08C00;
  --color-error:        #C0392B;
  --color-border:       #D0DEE8;

  --font-display: 'Playfair Display', Georgia, serif;
  --font-body:    'DM Sans', system-ui, sans-serif;
  --font-mono:    'JetBrains Mono', monospace;

  --radius-sm:  6px;
  --radius-md:  10px;
  --radius-lg:  16px;
  --radius-pill: 999px;

  --shadow-card: 0 2px 12px rgba(0, 119, 182, 0.08);
  --shadow-hover: 0 6px 24px rgba(0, 119, 182, 0.15);

  --transition: 0.25s ease;

  --nav-height: 68px;
}
```

### 4.2 Typography Rules

- **Headings (h1–h3):** `var(--font-display)`, weight 700.
- **Body, labels, UI text:** `var(--font-body)`, weight 400/500.
- **Dashboard KPI numbers:** `var(--font-mono)`, weight 600.
- **Never use:** Arial, Roboto, Inter, system-ui alone, or any font not listed above.
- **Line heights:** headings `1.2`, body `1.7`, labels `1.4`.

### 4.3 Component Conventions

| Component | Rule |
|---|---|
| Primary button | `background: var(--color-primary)`, white text, `border-radius: var(--radius-pill)`, `padding: 12px 28px` |
| Outlined button | transparent background, `border: 2px solid var(--color-primary)`, primary text |
| Card | white background, `border: 1px solid var(--color-border)`, `border-radius: var(--radius-lg)`, `box-shadow: var(--shadow-card)` |
| Badge — Hollow | `background: #E0F0FA`, `color: #023E8A` |
| Badge — Solid | `background: #023E8A`, `color: #FFFFFF` |
| Badge — Paving | `background: #D4EDDA`, `color: #1A6B3A` |
| Form input | `border: 1.5px solid var(--color-border)`, `border-radius: var(--radius-md)`, focus: `border-color: var(--color-primary)` |
| Error state | `border-color: var(--color-error)`, error message in `var(--color-error)` below field |

### 4.4 Animation Standards

- Page body: fade-in on load — `animation: fadeIn 0.4s ease`.
- Scroll-triggered elements: use `IntersectionObserver`, add class `.visible` which triggers `opacity: 0 → 1` + `translateY(20px → 0)`, staggered with `animation-delay`.
- Hover on cards: `transform: translateY(-4px)`, `box-shadow: var(--shadow-hover)`.
- All transitions use `var(--transition)` (`0.25s ease`).
- No JavaScript-driven animations — use CSS keyframes / transitions only for visual effects.

---

## 5. PRODUCT CATALOGUE (Source of Truth)

Do not invent product names. Use exactly these, in this order, in all product lists, dropdowns, and analytics.

| # | Product Name | Size | Type | Filter Tags |
|---|---|---|---|---|
| 1 | 5 Inch Hollow Block | 5 inch | Hollow | 5-inch, hollow |
| 2 | 5 Inch Solid Block | 5 inch | Solid | 5-inch, solid |
| 3 | 6 Inch Hollow Block | 6 inch | Hollow | 6-inch, hollow |
| 4 | 6 Inch Solid Block | 6 inch | Solid | 6-inch, solid |
| 5 | 4 Inch Hollow Block | 4 inch | Hollow | 4-inch, hollow |
| 6 | 4 Inch Solid Block | 4 inch | Solid | 4-inch, solid |
| 7 | 8 Inch Hollow Block | 8 inch | Hollow | 8-inch, hollow |
| 8 | 8 Inch Solid Block | 8 inch | Solid | 8-inch, solid |
| 9 | Paving Block | Paving | Paving | paving |

---

## 6. GOOGLE APPS SCRIPT — GAS RULES

### 6.1 The `gasRequest()` function (in `main.js`)

All GAS calls go through this single centralized function. Never call `fetch()` to the GAS URL directly from anywhere else.

```javascript
async function gasRequest(action, payload = {}) {
  const GAS_URL = localStorage.getItem('kb_gas_url') || '';
  if (!GAS_URL) {
    console.warn('GAS URL not configured. Using mock data.');
    return { success: false, mock: true };
  }
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload })
    });
    return await res.json();
  } catch (err) {
    console.error(`GAS request [${action}] failed:`, err);
    return { success: false, error: err.message };
  }
}
```

### 6.2 GAS Actions Reference

| Action | Description | Key Payload Fields |
|---|---|---|
| `logVisit` | Log a page visit | `page`, `userAgent`, `referrer` |
| `submitQuote` | Submit a quote request | `name`, `phone`, `email`, `products[]`, `deliveryLocation`, `message` |
| `submitContact` | Submit a contact message | `name`, `phone`, `email`, `subject`, `message` |
| `logProductView` | Track a product card click | `product` (exact product name from catalogue) |
| `getDashboardStats` | Fetch all dashboard data | _(none)_ |
| `markMessageRead` | Mark a message as read | `rowIndex` |
| `updateQuoteStatus` | Update a quote's status | `rowIndex`, `status` |

### 6.3 Google Sheets — Tab Names (exact, case-sensitive)

| Tab | Purpose |
|---|---|
| `visitors` | Page visit log |
| `quotes` | Quote submissions |
| `messages` | Contact form submissions |
| `product_views` | Product click events |
| `summary` | Auto-computed daily aggregates |

### 6.4 Quote Reference ID Format

`KB-YYYYMMDD-XXXX` where XXXX is a zero-padded 4-digit row count (e.g., `KB-20240615-0042`).

---

## 7. ADMIN DASHBOARD RULES

### 7.1 Authentication

- Auth check runs on every page load of `admin/dashboard.html`.
- Token stored in `sessionStorage` as `kb_admin_auth`.
- Password comparison uses SHA-256 via `window.crypto.subtle.digest`. Never store the plaintext password.
- Default password hash is for `KBAdmin2024!` — document this in `README.md`.
- On logout: `sessionStorage.clear()` then `location.reload()`.

### 7.2 Data Caching

- Dashboard stats cached in `localStorage` under key `kb_stats_cache`.
- Cache includes a `timestamp` field (Unix ms).
- Cache TTL: **5 minutes** (300,000 ms).
- If cache is fresh, use it. If stale or absent, call `getDashboardStats` from GAS.
- The "Refresh Data" button always bypasses cache.

### 7.3 Mock Data Fallback

When GAS URL is not configured (`localStorage.getItem('kb_gas_url')` returns null), the dashboard must display `MOCK_STATS` (defined in `dashboard.js`) so it is always usable during development.

### 7.4 Chart.js Usage

- Load Chart.js from CDN **only on `dashboard.html`** — not on public pages.
- CDN URL: `https://cdn.jsdelivr.net/npm/chart.js`
- Two charts: (1) visitor trend — line chart, (2) product views — horizontal bar chart.
- Always destroy an existing chart instance before re-rendering: `if (chartRef) chartRef.destroy();`
- Use `var(--color-primary)` (`#0077B6`) as the primary chart color.

### 7.5 Quote Status Values (exact strings)

`"Pending"` | `"In Progress"` | `"Fulfilled"` | `"Cancelled"`

---

## 8. FORM VALIDATION RULES

Apply these consistently in `contact.js` and anywhere else forms appear.

| Field | Rule |
|---|---|
| Full Name | Required, minimum 2 characters |
| Phone Number | Required, exactly 10 digits, must start with `0`, Ghana format |
| Email Address | Optional (on quote form: required), standard RFC regex |
| Message / Notes | Required where shown, minimum 20 characters |
| Quantity | Numeric, minimum 1, maximum 99,999 |
| Product (quote builder) | At least 1 product row required |

- Validate on **blur** (when user leaves a field) and on **submit**.
- On invalid field: add class `.error` to the input wrapper, show `<span class="error-msg">` below the input.
- On valid field after error: remove `.error`, remove the error span.
- On form submit with errors: scroll to the first error field.
- Submit button: show spinner + "Sending…" text while awaiting GAS response. Disable button to prevent double submission.

---

## 9. CONTACT INFORMATION (Use Exactly As Written)

| Field | Value |
|---|---|
| Phone (display) | `0550203197` |
| Phone (tel link) | `tel:+233550203197` |
| WhatsApp link | `https://wa.me/233550203197?text=Hello%2C%20I%27d%20like%20to%20enquire%20about%20your%20blocks.` |
| Email | `kumanyiniconstructions@gmail.com` |
| Address line 1 | Asekye Nkoranza |
| Address line 2 | Bono East Region, Ghana |
| Working Hours | Monday – Saturday, 7:00 AM – 6:00 PM |

Do not alter phone numbers, email addresses, or location details.

---

## 10. NAVIGATION STRUCTURE

| Page | File | Nav Label | Active on |
|---|---|---|---|
| Home | `index.html` | Home | `index.html` |
| Products | `products.html` | Products | `products.html` |
| About | `about.html` | About Us | `about.html` |
| Gallery | `gallery.html` | Gallery | `gallery.html` |
| Contact | `contact.html` | Contact | `contact.html` |
| Admin | `admin/dashboard.html` | (footer only) | — |

The "Get a Quote" button in the navbar always links to `contact.html#quote-tab`.

---

## 11. CODING STANDARDS

### 11.1 HTML

- Use semantic elements: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`, `<aside>`.
- Every `<section>` must have an `id` (for anchor links and scroll tracking).
- Every `<img>` must have `alt`, `width`, `height`, and `loading="lazy"` (except above-the-fold hero images).
- Every form `<input>` and `<textarea>` must have a matching `<label for="...">`.
- No inline `style=""` attributes — all styles go in CSS files.
- No inline `onclick=""` attributes — all event listeners go in JS files.

### 11.2 CSS

- All colors via CSS variables — never hardcode hex values outside of `main.css`.
- Mobile-first: base styles target mobile, `@media (min-width: ...)` for larger screens.
- Breakpoints: `480px` (small mobile), `768px` (tablet), `1024px` (desktop), `1280px` (large desktop).
- No `!important` unless overriding a third-party library.
- BEM-style class naming: `.block__element--modifier` (e.g., `.product-card__badge--hollow`).
- Group CSS properties in this order: positioning → display/box model → typography → colors → borders → shadows → transitions.

### 11.3 JavaScript

- Use `const` by default, `let` only when reassignment is needed. Never use `var`.
- Use `async/await` for all asynchronous operations. No `.then()` chains.
- Wrap all `await` calls in `try/catch`.
- Name event handler functions descriptively: `handleQuoteSubmit`, `handleProductFilter`, not `fn`, `cb`, or `handler`.
- All DOM queries cached in `const` at the top of each function or file scope — do not re-query the DOM in loops.
- Use `data-` attributes on HTML elements to carry metadata (e.g., `data-product="5 Inch Hollow"`, `data-filter="hollow"`).
- No `alert()`, `confirm()`, or `prompt()` — use custom modal/toast UI instead.
- Console logs: use `console.info()` for tracking events, `console.error()` for errors, `console.warn()` for missing config. Remove all debug `console.log()` before finalizing.

### 11.4 GAS (`Code.gs`)

- Use `try/catch` around every sheet operation.
- Always lock sheets with `LockService.getScriptLock()` before writing to prevent race conditions on concurrent submissions.
- Return consistent JSON: `{ success: true, data: ... }` or `{ success: false, error: "..." }`.
- Never log sensitive user data (phone, email) to the Apps Script execution log.

---

## 12. ACCESSIBILITY REQUIREMENTS

- All interactive elements (buttons, links, inputs) must be keyboard-navigable.
- All interactive elements must have a visible `:focus` style: `outline: 2px solid var(--color-primary); outline-offset: 3px;`
- Color contrast: body text on backgrounds must meet WCAG AA (4.5:1 minimum).
- The mobile nav drawer must trap focus when open.
- Dashboard tables must use `<th scope="col">` and a `<caption>`.
- Charts must have an `aria-label` describing what the chart shows.
- The floating WhatsApp and Call buttons must have `aria-label` text.

---

## 13. WHAT NOT TO DO

These are explicit prohibitions. If a user instruction conflicts with this list, flag it before proceeding.

- Do not install any npm packages or introduce a `package.json`.
- Do not use any CSS framework (Tailwind, Bootstrap, Bulma, etc.).
- Do not use any JS framework or library other than Chart.js (dashboard only).
- Do not use `localStorage` for anything other than: `kb_gas_url` and `kb_stats_cache`.
- Do not use `sessionStorage` for anything other than: `kb_admin_auth`.
- Do not hardcode the GAS Web App URL in any frontend file — it must always be read from `localStorage.getItem('kb_gas_url')`.
- Do not use `var` in JavaScript.
- Do not write inline `style=""` or `onclick=""` attributes in HTML.
- Do not add pages, sections, or features not in the project spec without explicit client approval.
- Do not change brand colors, fonts, or the product list.
- Do not alter contact details (phone, email, address).
- Do not use `alert()` or `confirm()` for any user-facing interaction.
- Do not use any external image CDN for product images — use local SVG placeholders.
- Do not load Chart.js on public-facing pages — only on `admin/dashboard.html`.

---

## 14. COMMON TASKS — HOW TO DO THEM

### Add a new page
1. Create the HTML file in the root directory.
2. Copy the `<head>` block, nav, and footer from `index.html`.
3. Set the correct active nav link via the `data-page` attribute on `<body>`.
4. Add the page to the nav in all existing HTML files.
5. Add a `logVisit` call at the bottom of the page's `<script>` section (or it's already handled by `main.js`).

### Add a new GAS action
1. Add the handler function in `Code.gs` inside the `doPost` switch statement.
2. Add the action name and payload shape to Section 6.2 of this file.
3. Call it via `gasRequest('newAction', { ... })` in the appropriate JS file.

### Change the admin password
1. In a browser console, run:
   ```javascript
   const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('YourNewPassword'));
   console.log([...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,'0')).join(''));
   ```
2. Copy the output hash.
3. Replace the `ADMIN_HASH` constant in `dashboard.js` with the new hash.
4. Update `README.md` to document the new password (if stored securely).

### Connect the live GAS backend
1. Deploy `Code.gs` as a Web App in Apps Script (Execute as: Me, Access: Anyone).
2. Copy the deployment URL.
3. Open `admin/dashboard.html` in a browser → go to Settings panel → paste the URL → click Save.
4. Click "Refresh Data" to verify the connection.

---

## 15. DEPLOYMENT CHECKLIST

Run through this before marking any milestone complete.

- [ ] All 5 public pages load without console errors.
- [ ] Navigation active state is correct on every page.
- [ ] Floating WhatsApp + Call buttons are visible on all pages.
- [ ] Mobile nav drawer opens and closes correctly; focus is trapped when open.
- [ ] Contact form validates all fields and submits to GAS.
- [ ] Quote form validates, supports multiple product rows, and pre-fills from URL params.
- [ ] Product filter buttons show/hide cards correctly.
- [ ] Quote cart accumulates products and passes them to the contact page.
- [ ] Gallery lightbox works with keyboard navigation (←, →, Escape).
- [ ] Admin login gate works; wrong password shows error; correct password shows dashboard.
- [ ] Dashboard KPI cards display mock data when GAS is not connected.
- [ ] Both Chart.js charts render without errors.
- [ ] Quote status can be updated from the Quotes panel.
- [ ] Messages can be marked as read from the Messages panel.
- [ ] CSV export downloads correctly from the Quotes panel.
- [ ] GAS URL can be set and saved from the Settings panel.
- [ ] `README.md` setup instructions are accurate and complete.
- [ ] No hardcoded GAS URLs anywhere in frontend files.
- [ ] All `console.log()` debug statements removed.
- [ ] All images have `alt` text.
- [ ] Site is fully usable on a 375px mobile screen.