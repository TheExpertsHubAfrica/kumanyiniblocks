# Kumanyini Blocks Website + Admin Dashboard

Production-ready static frontend + Google Apps Script backend for Kumanyini Blocks.

## 1) Google Sheets Setup
1. Create a new Google Spreadsheet.
2. Add these sheet tabs exactly: `visitors`, `quotes`, `messages`, `product_views`, `summary`.
3. Add headers in row 1:
   - `visitors`: `Timestamp | Page | UserAgent | Referrer`
   - `quotes`: `Timestamp | Name | Phone | Email | Products (JSON) | DeliveryLocation | Message | Status`
   - `messages`: `Timestamp | Name | Phone | Email | Subject | Message | Read`
   - `product_views`: `Timestamp | Product`
   - `summary`: `Date | Visitors | Quotes | Messages`

## 2) Apps Script Setup
1. Open the spreadsheet.
2. Go to **Extensions → Apps Script**.
3. Paste `appscript/Code.gs` into the script editor.
4. Deploy as **Web App**:
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the Web App URL.

## 3) Connect Frontend to GAS
1. Open `admin/dashboard.html`.
2. Log in with the default admin password: `KBAdmin2024!`.
3. Open **Settings** panel.
4. Paste the GAS Web App URL into **GAS Web App URL**.
5. Click **Save**, then **Refresh Data**.

## 4) Hosting
- GitHub Pages: upload repository and enable Pages from branch root.
- Netlify: drag/drop the project folder or connect Git repository.
- Local testing:
  ```bash
  python -m http.server 8000
  ```
  Visit `http://localhost:8000`.

## 5) Adding Real Photos
- Put gallery images in `assets/images/gallery/`.
- Put product images in `assets/images/products/`.
- Recommended size: `1200x800`.
- Suggested names: `hollow-5inch-01.jpg`, `solid-6inch-02.jpg`, `paving-01.jpg`.
- Replace gallery placeholders with `<img>` tags (keep `alt`, `width`, `height`, `loading="lazy"`).

## 6) Changing Admin Password
1. Open browser console and run:
   ```javascript
   const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("YourNewPassword"));
   console.log([...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join(""));
   ```
2. Copy the hash output.
3. Replace `ADMIN_HASH` in `assets/js/dashboard.js`.
4. Save and redeploy static files.

## Notes
- Dashboard uses mock data if GAS URL is missing.
- Dashboard cache key: `kb_stats_cache` with a 5-minute TTL.
