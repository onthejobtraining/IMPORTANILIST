# IMPORTANILIST for Google Sheets

A lightweight, config-driven Google Apps Script for importing data from the public AniList GraphQL API into a Google Sheet with **your own custom headers**.

This script is designed to be lean, powerful, and flexible. It uses an internal configuration map to align API data with any spreadsheet layout you design, in any language.

---

## Key Features

- **Custom Headers**: Your spreadsheet headers are the source of truth for your layout. Use any language or naming convention you want.
- **Config-Driven Mapping**: A simple list inside the script (`FIELD_ORDER_MAPPING`) acts as the "glue," defining which API data goes into which of your columns.
- **Single Source of Truth**: To add, remove, or reorder a column, you only need to edit the `FIELD_ORDER_MAPPING` list in the script. The script automatically adapts.
- **Lean & Focused**: Aggressively streamlined to do one job perfectly: fetch data from AniList. No redundant features or code.
- **Robust & Fast**: Uses Google's persistent cache and an in-memory cache to make repeated lookups instantaneous, with a built-in retry mechanism for network reliability.

---

## How It Works: The Hybrid Approach

This script combines the best of both worlds. You control the presentation in the sheet, and a simple config in the script controls the data.

1.  **You design your headers** in the Google Sheet (e.g., "Titel", "Jahr", "Punkte").
2.  **You configure the `FIELD_ORDER_MAPPING`** list inside the script to match your column order.
3.  The **`=IMPORTANILIST()`** function reads this mapping, fetches only the required data, and returns a single row of values that slots perfectly under your headers.

**Example Mapping:**

| Your Sheet Header (e.g., in C1) | `FIELD_ORDER_MAPPING` entry (in the script) |
| :--- | :--- |
| `Titel` | `'title.romaji'` |
| `Jahr` | `'startDate.year'` |
| `MAL ID` | `'idMal'` |
| `Punkte`| `'averageScore'` |

---

## Installation

1.  Open your Google Sheet and go to `Extensions > Apps Script`.
2.  In the script editor, delete any existing code.
3.  Rename the file to **`IMPORTANILIST.gs`**.
4.  Copy the entire code from the `IMPORTANILIST.gs` file in this repository.
5.  Paste the code into your script editor project.
6.  Click the **Save project** icon.

---

## Usage Guide

### Step 1: Configure the Script

This is the most important step. Open the `IMPORTANILIST.gs` script in your editor.

1.  Find the `FIELD_ORDER_MAPPING` list at the top of the script.
2.  Look at the "Available Fields" list in the comments to see all your data options.
3.  **Edit the `FIELD_ORDER_MAPPING` list** so that the order of the fields exactly matches the order of your columns in the spreadsheet.

### Step 2: Set Up Your Spreadsheet

1.  Create your header row (e.g., `C1:M1`) with your desired custom names.
2.  In the first cell where your data should appear (e.g., `C2`), paste the formula.

### Step 3: Use the Formula

The formula is simple and only requires the title and optional year.

```excel
=IFERROR(IF(A2<>"", IMPORTANILIST(A2, B2), ""))
```
This assumes the anime title is in A2 and the optional year is in B2.
Drag this formula down to apply it to all your rows.
Whenever you enter a new title in column A, the script will run, consult its mapping, fetch the data, and populate the row.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
