# Loan Details Calculator

A lightweight, client-side web app that calculates loan EMI and generates a full month-by-month amortisation schedule. No server, no build step — runs entirely in the browser.

## Features

- **EMI Calculation** — uses the standard reducing-balance formula:  
  `EMI = P × r × (1 + r)ⁿ / ((1 + r)ⁿ − 1)`
- **Amortisation Schedule** — month-by-month breakdown of opening balance, principal paid, interest paid, and closing balance for the full loan tenure
- **Summary Cards** — instant view of EMI, total amount payable, and total interest payable
- **Export Options**
  - **CSV** — same layout as the original spreadsheet, ready to open in Excel / Google Sheets
  - **PDF** — landscape A4 with a branded header, summary cards, and a paginated table (via jsPDF + AutoTable)
  - **JPG** — high-resolution (2×) screenshot of the report (via html2canvas)
- **Input Validation** — inline errors for empty, non-integer, or non-positive values
- **Fully Responsive** — adapts to mobile (≤480 px), tablet (≤768 px), and laptop/desktop

## Input Fields

| Field                    | Type    | Description                               |
| ------------------------ | ------- | ----------------------------------------- |
| Loan Amount              | Integer | Principal loan amount                     |
| Annual Interest Rate (%) | Decimal | Yearly interest rate, e.g. `12` or `10.5` |
| Loan Tenure (months)     | Integer | Repayment period in months, e.g. `36`     |

## Tech Stack

| Concern    | Technology                                                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Structure  | HTML5                                                                                                                         |
| Styling    | Plain CSS (no framework)                                                                                                      |
| Logic      | Vanilla JavaScript (ES6+)                                                                                                     |
| PDF export | [jsPDF 2.5.1](https://github.com/parallax/jsPDF) + [jsPDF-AutoTable 3.8.2](https://github.com/simonbengtsson/jsPDF-AutoTable) |
| JPG export | [html2canvas 1.4.1](https://html2canvas.hertzen.com/)                                                                         |

All three libraries are loaded from cdnjs CDN — no npm or build tooling required.

## Project Structure

```
loan_details_calculator/
├── index.html   # App shell and markup
├── style.css    # All styles including responsive breakpoints
├── script.js    # EMI logic, schedule builder, and export functions
└── README.md
```

## Running Locally

Open `index.html` directly in any modern browser — no local server needed.

```bash
# Or serve with any static file server, e.g.:
npx serve .
```

## How the Calculation Works

Given:

- **P** = principal (loan amount)
- **r** = monthly interest rate = annual rate ÷ 12 ÷ 100
- **n** = tenure in months

**EMI** = `P × r × (1 + r)ⁿ / ((1 + r)ⁿ − 1)`

For each month:

- Interest paid = remaining balance × r
- Principal paid = EMI − interest paid
- Closing balance = opening balance − principal paid

The last month absorbs any floating-point residue so the closing balance lands exactly at zero.
