# CareStock – Medical Store Billing Frontend

A React + TypeScript + Vite frontend prototype for a simple hospital medical store billing application.

## Scope in this frontend

- One shared application/panel for pharmacy staff (no employee accounts or user-management screen).
- Medicine catalogue with manual medicine + batch entry.
- Batch-wise stock view and simple quantity adjustments.
- Excel/CSV import with row validation and import summary.
- Patient directory and patient association on each bill.
- Billing counter with medicine search, batch selection, cart, quantity controls and Cash/UPI/Card selection.
- 80mm thermal and A4 invoice print layouts.
- Sales history and simple operational overview.
- Liquid-glass inspired visual theme; no pie charts or bar graphs.
- Demo data and browser localStorage persistence.

## Run locally

Requirements: Node.js 18+ recommended.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

Production build:

```bash
npm run build
npm run preview
```

## Demo behaviour

- Demo medicines, batches, patients and one sample sale are loaded on first run.
- Changes are stored in browser `localStorage`.
- Creating a bill deducts quantities from the selected batch and adds the invoice to sales history.
- Printing opens a browser print window. Allow pop-ups for the app.
- Excel import supports `.xlsx`, `.xls` and `.csv`; use the Template button to download the expected columns.

## Important limitations

This is a frontend-only prototype. It does not include a backend, MongoDB, server authentication, multi-computer synchronization, production invoice numbering, tax compliance validation, or secure server-side stock transactions. Browser localStorage is only demo persistence on the current browser/device. Do not use this prototype for live pharmacy billing until a backend and required operational/compliance checks are implemented.

GST calculation and invoice content are illustrative and must be verified/configured by the hospital's finance/compliance team before production.
