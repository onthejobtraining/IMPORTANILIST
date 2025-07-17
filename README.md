# IMPORTANILIST for Google Sheets 🗂️✨

**Version:** 5.0 — *Header Mapping & Final Edition*

This Apps Script custom function lets you type a formula like:

```excel
=IMPORTANILIST("Fullmetal Alchemist", 2003)
```

…and instantly populate a row with AniList data mapped to the exact columns in your sheet.

---

## 🧭 Table of Contents

* [What Is IMPORTANILIST?](#-what-is-importanilist)
* [Key Features](#-key-features)
* [Quick Start](#-quick-start)
* [Configuring Your Columns (FIELD\_ORDER\_MAPPING)](#-configuring-your-columns-field_order_mapping)
* [Available Fields](#-available-fields)
* [Using the Function in Sheets](#-using-the-function-in-sheets)
* [Examples](#-examples)
* [Caching & Performance](#-caching--performance)
* [Errors & Not-Found Handling](#-errors--not-found-handling)
* [Advanced Usage Tips](#-advanced-usage-tips)
* [Troubleshooting](#-troubleshooting)
* [FAQ](#-faq)
* [Changelog](#-changelog)
* [License](#-license)

---

## 🎯 What Is IMPORTANILIST?

**IMPORTANILIST** is a Google Apps Script helper that exposes a spreadsheet formula (`IMPORTANILIST`) which queries the **[AniList GraphQL API](https://anilist.co/graphiql)** for anime metadata. It returns a *single, ordered row* of values that matches a **user-defined column mapping**. That means *you* control what data appears and *where* it goes in the sheet.

---

## 💡 Key Features

* 🔤 **Custom Headers in Any Language** – Your spreadsheet column names can be anything (English, 日本語, Español, etc.).
* 🧩 **Explicit Column→Field Mapping** – A single `FIELD_ORDER_MAPPING` array defines the order of returned data.
* ♻️ **No Duplicate Queries** – If the same field appears multiple times in the mapping, the GraphQL query still requests it only once.
* ⚡ **Caching Layer** – Responses are cached in memory (per execution) and in the document cache (1 hour) to reduce API calls and improve responsiveness.
* 🛡️ **Retry Logic** – Up to 3 attempts with exponential backoff when contacting AniList.
* 🚫 **Graceful Failures** – Displays `Not Found` or `Error:` messages in-sheet instead of throwing hard errors.

---

## 🚀 Quick Start

Follow these steps to get running in under 5 minutes.

### 1. Create / Open a Google Sheet

Open the sheet where you want to pull AniList data.

### 2. Open the Apps Script Editor

**Extensions → Apps Script** (older UI: *Tools → Script Editor*).

### 3. Paste the Script

Replace any existing code with the full **IMPORTANILIST v5.0** script. Save.

> **Tip:** The top of the file includes `@OnlyCurrentDoc`, which restricts the script’s access to the current spreadsheet only — a good security hygiene practice.

### 4. Customize `FIELD_ORDER_MAPPING`

Edit the `FIELD_ORDER_MAPPING` constant to match the order of the **data columns** in your sheet. (Details below.)

### 5. Add Headers to Your Sheet

Add a header row whose columns correspond *positionally* (not by name) to your mapping.

### 6. Use the Formula

In a data row:

```none
=IMPORTANILIST(A2, B2)
```

Where `A2` = title text, `B2` = optional release year.

---

## 🧱 Configuring Your Columns (`FIELD_ORDER_MAPPING`)

This constant is the **single source of truth** that controls how returned data is arranged.

Example from the script:

```javascript
const FIELD_ORDER_MAPPING = [
  'title.romaji',     // 1st column (e.g., Query Title)
  'startDate.year',   // 2nd column (e.g., Year)
  'id',               // 3rd column (AniList ID)
  'title.romaji',     // 4th column (Romaji Title)
  'title.english',    // 5th column (English Title)
  'format',           // ...
  'episodes',
  'status',
  'idMal',
  'seasonYear',
  'averageScore',
  'genres'
];
```

📌 **Important Rules:**

1. **Order matters.** Each entry corresponds to a **column in your sheet** (left to right).
2. **Duplicates allowed.** If you repeat a field (as above with `title.romaji`), the API is only queried once; the flattened value is reused.
3. **Unknown fields return blank.** If a field doesn’t exist for a specific anime, that column returns an empty string.
4. **Safe to remove or add.** Use only the fields you need for your use case.

---

## 📚 Available Fields

Copy & paste from this list when editing `FIELD_ORDER_MAPPING`:

```
'id', 'idMal', 'title.romaji', 'title.english', 'title.native',
'startDate.year', 'startDate.month', 'startDate.day',
'endDate.year', 'endDate.month', 'endDate.day',
'format', 'status', 'episodes', 'duration', 'source',
'averageScore', 'meanScore', 'popularity', 'favourites',
'season', 'seasonYear', 'genres', 'synonyms',
'tags.name', 'studios.nodes.name', 'description',
'coverImage.large', 'coverImage.extraLarge', 'bannerImage'
```

> **Nested fields:** Use dot-notation exactly as shown. For example, `title.english` or `studios.nodes.name`.

---

## 📥 Using the Function in Sheets

**Signature:**

```none
IMPORTANILIST(title, [year])
```

* **title** *(string, required)* – The anime title to search.
* **year** *(string or number, optional)* – Helps disambiguate remakes / multiple seasons.

**Returns:** A **2D array** (one row) whose columns align with `FIELD_ORDER_MAPPING`.

### Minimal Example

If Column A contains titles and Column B contains release years:

```none
=IMPORTANILIST(A2, B2)
```

### Title-Only Search

```none
=IMPORTANILIST("Cowboy Bebop")
```

---

## 🧪 Examples

### Example Header Row (user-defined)

| A           | B    | C          | D      | E       | F      | G        | H      | I      | J           | K         | L      |
| ----------- | ---- | ---------- | ------ | ------- | ------ | -------- | ------ | ------ | ----------- | --------- | ------ |
| Query Title | Year | AniList ID | Romaji | English | Format | Episodes | Status | MAL ID | Season Year | Avg Score | Genres |

**Matching Mapping:**

```javascript
const FIELD_ORDER_MAPPING = [
  'title.romaji',
  'startDate.year',
  'id',
  'title.romaji',
  'title.english',
  'format',
  'episodes',
  'status',
  'idMal',
  'seasonYear',
  'averageScore',
  'genres'
];
```

**Sheet Formula (row 2):**

```none
=IMPORTANILIST(A2, B2)
```

Result: Columns C–L auto-fill with AniList data in the mapped order.

---

## ⚙️ Caching & Performance

IMPORTANILIST is built to be kind to the AniList API *and* faster in Sheets.

| Layer                                              | Scope                | TTL                 | Notes                                                   |
| -------------------------------------------------- | -------------------- | ------------------- | ------------------------------------------------------- |
| `__MEM_CACHE`                                      | Per script execution | Until function ends | Avoids parsing API results repeatedly in the same call. |
| Document Cache (`CacheService.getDocumentCache()`) | Per spreadsheet      | 1 hour              | Keyed by SHA-256 signature of query+variables.          |

**Why it matters:** If you run the same formula across multiple rows (same anime), the cached result will be reused, dramatically cutting network calls.

---

## 🚫 Errors & Not-Found Handling

| Scenario              | What You See                                   | Explanation                                         |
| --------------------- | ---------------------------------------------- | --------------------------------------------------- |
| Title blank           | *(cell blank)*                                 | Function returns nothing if no title provided.      |
| No match from AniList | `Not Found` in 1st mapped column; others blank | Search returned no `Media` object.                  |
| Network/API failure   | `Error: <message>`                             | After 3 retries, the function returns an error row. |

---

## 🧠 Advanced Usage Tips

### 1. Bulk Entry Workflow

Use a *helper* sheet where you list titles & years, then fill the formula down. Because results are cached, repeated titles won’t hammer the API.

### 2. Using `BYROW` (Google Sheets Lambda)

If you’re on the newer Sheets calc engine, you can wrap IMPORTANILIST:

```none
=BYROW(A2:B, LAMBDA(r, IMPORTANILIST(INDEX(r,1,1), INDEX(r,1,2))))
```

> Works best on smaller datasets; each row still triggers a call (cache helps).

### 3. Localized Headers

Want headers in French or Hindi? No problem. Only the **position** matters — not header text. Just ensure the order matches `FIELD_ORDER_MAPPING`.

### 4. Expanding the Mapping

Need more data (e.g., image URLs or studio names)? Add fields from the Available list:

```javascript
const FIELD_ORDER_MAPPING = [
  'title.romaji',
  'coverImage.large',
  'studios.nodes.name',
  'description'
];
```

Then update your sheet columns accordingly.

### 5. Displaying Images

AniList returns image URLs (e.g., `coverImage.large`). To show images in Sheets:

```none
=IMAGE(<cell_with_url>)
```

Or inline: `=IMAGE(INDEX(IMPORTANILIST($A2,$B2),1,2))` adjusting column index.

---

## 🧰 Troubleshooting

**Problem:** Formula spins / shows `#ERROR!`

* Make sure the script saved without syntax errors.
* Reopen/refresh sheet after first install.
* Check Execution Log in Apps Script editor for runtime errors.

**Problem:** Wrong anime returned.

* Include a year: `=IMPORTANILIST("Bleach",2004)`.
* Try more specific titles: season numbers or "(TV)".

**Problem:** Empty columns.

* Some AniList fields are missing for older/obscure titles.
* Confirm the field name in `FIELD_ORDER_MAPPING` exactly matches the Available Fields list.

**Problem:** Rate limits / throttling.

* Large sheets may temporarily hit AniList limits; wait or reduce simultaneous recalculation.
* Caching lessens repeated fetches — avoid volatile spreadsheet functions that force recalcs.

---

## ❓ FAQ

**Q: Can I map different fields to different tabs?**
Yes. Copy the script and expose *multiple* wrapper functions (e.g., `IMPORTANILIST_BASIC`, `IMPORTANILIST_IMAGES`) each with its own mapping constant.

**Q: Does the year filter actually constrain the API?**
Not directly. The script appends the year to the **search string** (`"<title> <year>"`), improving match quality but not strictly filtering server-side.

**Q: Can it return multiple search matches?**
No — it returns the **top match** based on AniList’s `SEARCH_MATCH` sort. To support multiple, you'd need to expand the GraphQL query and return an array.

**Q: Will it work for Manga?**
Not in current form. The query is hard-coded to `type: ANIME`. You could duplicate and change to `MANGA`.

---

## 📝 Changelog

**v5.0 — Header Mapping & Final Edition**

* Centralized `FIELD_ORDER_MAPPING` for sheet alignment.
* Automatic unique-field GraphQL generation.
* Duplicate field reuse (no redundant network cost).
* Improved cache & retry flow.
* Cleaner error + not-found handling.

---

## 📄 License

MIT License

Copyright (c) 2025 GitHub

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## 🙌 Credits

* AniList API & community ❤️
* Google Apps Script platform

---

**Need help customizing your mapping, adding fallback searches, or extending to MANGA? Open an issue or ask for guidance!** 😊
