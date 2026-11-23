import type { Sale } from './types'
import { money, numberToWords } from './utils'

export function printSaleInvoice(sale: Sale, format: '80mm' | 'A4') {
  const w = window.open('', '_blank', 'width=950,height=800')
  if (!w) {
    alert('Please allow popups in your browser to print the invoice.')
    return
  }

  if (format === '80mm') {
    printThermalReceipt(w, sale)
  } else {
    printA4TaxInvoice(w, sale)
  }
}

function printThermalReceipt(w: Window, sale: Sale) {
  const rows = sale.items
    .map(
      (i, index) =>
        `<tr>
          <td style="text-align:center;">${index + 1}</td>
          <td><b>${i.medicineName}</b> <span style="font-size:10px;color:#555;">(${i.strength})</span></td>
          <td style="text-align:center;">${i.qty}</td>
          <td style="text-align:right;">${money(i.price)}</td>
          <td style="text-align:right;">${money(i.qty * i.price)}</td>
        </tr>`
    )
    .join('')

  w.document.write(`
    <!doctype html>
    <html>
    <head>
      <title>Receipt - ${sale.invoiceNo}</title>
      <style>
        @page { size: 80mm auto; margin: 4mm 3mm; }
        body {
          font-family: Arial, -apple-system, sans-serif;
          color: #0f172a;
          max-width: 74mm;
          margin: auto;
          padding: 2mm;
          font-size: 11px;
        }
        .center { text-align: center; }
        .right { text-align: right; }
        .header { text-align: center; border-bottom: 2px dashed #0f172a; padding-bottom: 6px; margin-bottom: 8px; }
        .header h2 { margin: 0; font-size: 16px; font-weight: 800; }
        .header p { margin: 2px 0; font-size: 10px; color: #334155; }
        .meta { font-size: 11px; margin-bottom: 8px; line-height: 1.4; border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin: 6px 0; }
        th { background: #f1f5f9; border-bottom: 1px solid #0f172a; padding: 4px 2px; font-weight: bold; }
        td { padding: 4px 2px; border-bottom: 1px dashed #e2e8f0; }
        .summary { font-size: 11px; margin-top: 6px; text-align: right; }
        .summary-line { display: flex; justify-content: space-between; margin: 3px 0; }
        .grand-total { font-size: 14px; font-weight: 800; border-top: 1.5px solid #0f172a; border-bottom: 1.5px solid #0f172a; padding: 5px 0; margin-top: 5px; }
        .footer { text-align: center; font-size: 9.5px; color: #475569; margin-top: 12px; border-top: 1px dashed #94a3b8; padding-top: 6px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>CAREPLUS HOSPITAL PHARMACY</h2>
        <p>Main Market Road, Near City Hospital</p>
        <p>Phone: +91 98765 43210 | GSTIN: 09AAAPL1234F1Z5</p>
        <p><b>RETAIL SALE CASH MEMO</b></p>
      </div>

      <div class="meta">
        <div><b>Invoice:</b> ${sale.invoiceNo}</div>
        <div><b>Date:</b> ${new Date(sale.date).toLocaleString('en-IN')}</div>
        <div><b>Patient:</b> ${sale.patient.name}</div>
        <div><b>Mobile:</b> ${sale.patient.phone}</div>
        ${sale.patient.address ? `<div><b>Address:</b> ${sale.patient.address}</div>` : ''}
        <div><b>Payment:</b> ${sale.payment} ${
    sale.operatorName ? `| <b>Counter:</b> ${sale.operatorName}` : ''
  }</div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:16px;">#</th>
            <th style="text-align:left;">Item</th>
            <th>Qty</th>
            <th class="right">Rate</th>
            <th class="right">Amt</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div class="summary">
        <div class="summary-line"><span>Subtotal:</span> <span>${money(sale.subtotal)}</span></div>
        ${
          sale.discount > 0
            ? `<div class="summary-line"><span>Discount:</span> <span>-${money(
                sale.discount
              )}</span></div>`
            : ''
        }
        <div class="summary-line"><span>Tax (GST):</span> <span>${money(sale.tax)}</span></div>
        <div class="summary-line grand-total"><span>TOTAL AMOUNT:</span> <span>${money(
          sale.total
        )}</span></div>
      </div>

      <div class="footer">
        <p>*** Wish You A Speedy Recovery ***</p>
        <p>Goods once sold taken back only within 7 days with bill.</p>
      </div>

      <script>
        window.onload = () => { window.print(); }
      </script>
    </body>
    </html>
  `)
  w.document.close()
}

function printA4TaxInvoice(w: Window, sale: Sale) {
  const rows = sale.items
    .map(
      (i, index) =>
        `<tr>
          <td style="text-align:center; font-weight:600;">${index + 1}</td>
          <td>
            <div style="font-weight:700; font-size:12px; color:#000;">${i.medicineName}</div>
            <div style="font-size:10px; color:#444;">Strength: ${i.strength} | Unit: ${
          i.unit
        }</div>
          </td>
          <td style="text-align:center; font-family:monospace;">3004</td>
          <td style="text-align:center; font-weight:700; font-size:12px;">${i.qty} ${i.unit}</td>
          <td style="text-align:right; font-family:monospace;">${money(i.mrp)}</td>
          <td style="text-align:right; font-family:monospace; font-weight:600;">${money(
            i.price
          )}</td>
          <td style="text-align:center;">${i.discount > 0 ? money(i.discount) : '0.00'}</td>
          <td style="text-align:center; font-family:monospace;">${i.gst}%</td>
          <td style="text-align:right; font-family:monospace; font-weight:700; font-size:12px;">${money(
            i.qty * i.price - i.discount
          )}</td>
        </tr>`
    )
    .join('')

  const cgstAmount = sale.tax / 2
  const sgstAmount = sale.tax / 2
  const amountInWords = numberToWords(sale.total)

  w.document.write(`
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>Tax Invoice - ${sale.invoiceNo}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm 12mm 10mm 12mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
          color: #000000;
          background: #ffffff;
          margin: 0;
          padding: 0;
          font-size: 11px;
          line-height: 1.35;
        }
        .a4-container {
          width: 100%;
          max-width: 190mm;
          margin: 0 auto;
          border: 1.5px solid #000000;
          padding: 10px 14px;
          background: #ffffff;
        }
        
        /* HEADER SECTION */
        .clinic-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #000000;
          padding-bottom: 8px;
          margin-bottom: 8px;
        }
        .clinic-title {
          font-size: 20px;
          font-weight: 800;
          color: #0369a1;
          letter-spacing: -0.3px;
          margin: 0;
          text-transform: uppercase;
        }
        .clinic-sub {
          font-size: 11px;
          color: #333333;
          margin: 2px 0;
        }
        .clinic-reg {
          font-size: 10.5px;
          font-weight: 600;
          color: #111111;
        }
        .invoice-badge-box {
          text-align: right;
          border-left: 1.5px solid #000000;
          padding-left: 12px;
        }
        .invoice-type-pill {
          display: inline-block;
          background: #0284c7;
          color: #ffffff;
          font-weight: 800;
          font-size: 12px;
          padding: 4px 10px;
          border-radius: 4px;
          letter-spacing: 0.5px;
        }
        .inv-copy-label {
          font-size: 10px;
          color: #555555;
          margin-top: 3px;
          font-weight: bold;
        }

        /* 2-COLUMN METADATA GRID */
        .info-grid {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 10px;
          border: 1px solid #000000;
          margin-bottom: 10px;
          background: #fcfcfc;
        }
        .info-box {
          padding: 8px 10px;
        }
        .info-box.right-box {
          border-left: 1px solid #000000;
          background: #f8fafc;
        }
        .box-heading {
          font-size: 10px;
          font-weight: 800;
          color: #0369a1;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-bottom: 5px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 2px;
        }
        .info-row {
          display: flex;
          margin-bottom: 3px;
          font-size: 11px;
        }
        .info-row span.label {
          width: 95px;
          color: #555555;
          font-weight: 600;
          flex-shrink: 0;
        }
        .info-row span.val {
          color: #000000;
          font-weight: 700;
        }

        /* TABLE SECTION */
        table.invoice-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8px;
        }
        table.invoice-table th {
          background: #f1f5f9;
          border: 1px solid #000000;
          padding: 6px 4px;
          font-size: 10.5px;
          font-weight: 800;
          text-transform: uppercase;
          color: #000000;
        }
        table.invoice-table td {
          border: 1px solid #000000;
          padding: 5px 4px;
          font-size: 11px;
          vertical-align: middle;
        }
        table.invoice-table tbody tr:nth-child(even) {
          background: #fafafa;
        }

        /* TOTALS AND SUMMARY BLOCK */
        .summary-wrapper {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 10px;
          margin-bottom: 8px;
        }
        .terms-and-words {
          border: 1px solid #000000;
          padding: 8px 10px;
          background: #fafafa;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .amount-words-box b {
          font-size: 10.5px;
          color: #0369a1;
          display: block;
          margin-bottom: 2px;
        }
        .amount-words-text {
          font-weight: 700;
          font-size: 11.5px;
          color: #000000;
          background: #ffffff;
          padding: 4px 6px;
          border: 1px dashed #cbd5e1;
        }
        .terms-box {
          margin-top: 8px;
          font-size: 9.5px;
          color: #444444;
          line-height: 1.4;
        }
        .terms-box b {
          color: #111111;
        }

        .totals-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #000000;
        }
        .totals-table td {
          padding: 4px 8px;
          font-size: 11px;
          border-bottom: 1px solid #e2e8f0;
        }
        .totals-table td.label-cell {
          font-weight: 600;
          color: #444444;
          background: #f8fafc;
        }
        .totals-table td.val-cell {
          text-align: right;
          font-weight: 700;
          font-family: monospace;
          font-size: 11.5px;
        }
        .totals-table tr.grand-row td {
          background: #0284c7;
          color: #ffffff;
          font-size: 13.5px;
          font-weight: 800;
          border-top: 1.5px solid #000000;
          border-bottom: 0;
          padding: 6px 8px;
        }
        .totals-table tr.grand-row td.val-cell {
          font-size: 15px;
          font-family: monospace;
          color: #ffffff;
        }

        /* TAX BREAKUP */
        .gst-breakup-strip {
          border: 1px solid #000000;
          padding: 4px 8px;
          background: #f8fafc;
          font-size: 10px;
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .gst-breakup-strip span b {
          font-family: monospace;
        }

        /* SIGNATURE FOOTER */
        .footer-signatures {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-top: 1px dashed #000000;
          padding-top: 10px;
          margin-top: 6px;
        }
        .patient-ack {
          font-size: 9.5px;
          color: #555555;
          max-width: 280px;
        }
        .pharmacy-sign-box {
          text-align: center;
          width: 220px;
        }
        .sign-line {
          height: 38px;
          border-bottom: 1px solid #000000;
          margin-bottom: 4px;
        }
        .sign-title {
          font-size: 10.5px;
          font-weight: 700;
          color: #000000;
        }
        .sign-sub {
          font-size: 9px;
          color: #555555;
        }
        .blessing-footer {
          text-align: center;
          font-size: 11px;
          font-weight: 800;
          color: #0369a1;
          margin-top: 6px;
          letter-spacing: 0.5px;
        }
      </style>
    </head>
    <body>
      <div class="a4-container">
        <!-- CLINIC LETTERHEAD HEADER -->
        <div class="clinic-header">
          <div>
            <h1 class="clinic-title">CAREPLUS HOSPITAL MEDICAL STORE</h1>
            <div class="clinic-sub">City Healthcare Complex, Main GT Road, Civil Lines</div>
            <div class="clinic-sub">Phone: +91 98765 43210 / 0512-2849100 | Email: pharmacy@careplus.in</div>
            <div class="clinic-reg">GSTIN: 09AAAPL1234F1Z5 &nbsp;|&nbsp; D.L. No.: UP-20B-9812 / UP-21B-9813</div>
          </div>
          <div class="invoice-badge-box">
            <span class="invoice-type-pill">TAX INVOICE</span>
            <div class="inv-copy-label">ORIGINAL FOR RECIPIENT</div>
          </div>
        </div>

        <!-- METADATA BOXES -->
        <div class="info-grid">
          <!-- LEFT: PATIENT INFORMATION -->
          <div class="info-box">
            <div class="box-heading">Patient / Customer Information</div>
            <div class="info-row">
              <span class="label">Patient Name:</span>
              <span class="val">${sale.patient.name}</span>
            </div>
            <div class="info-row">
              <span class="label">Mobile Number:</span>
              <span class="val">${sale.patient.phone}</span>
            </div>
            <div class="info-row">
              <span class="label">Address / City:</span>
              <span class="val">${sale.patient.address || 'Local Walk-in Patient'}</span>
            </div>
            <div class="info-row">
              <span class="label">Consultant Dr.:</span>
              <span class="val">Duty Medical Officer / OPD</span>
            </div>
          </div>

          <!-- RIGHT: INVOICE INFORMATION -->
          <div class="info-box right-box">
            <div class="box-heading">Invoice Details</div>
            <div class="info-row">
              <span class="label">Invoice No:</span>
              <span class="val" style="font-family:monospace; color:#0284c7; font-size:12px;">${
                sale.invoiceNo
              }</span>
            </div>
            <div class="info-row">
              <span class="label">Date &amp; Time:</span>
              <span class="val">${new Date(sale.date).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}</span>
            </div>
            <div class="info-row">
              <span class="label">Payment Mode:</span>
              <span class="val" style="text-transform:uppercase;">${sale.payment}</span>
            </div>
            <div class="info-row">
              <span class="label">Billed By:</span>
              <span class="val">${sale.operatorName || 'Billing Desk #1'}</span>
            </div>
          </div>
        </div>

        <!-- MEDICINE TABLE -->
        <table class="invoice-table">
          <thead>
            <tr>
              <th style="width:26px; text-align:center;">#</th>
              <th style="text-align:left;">Medicine / Product Description</th>
              <th style="width:45px; text-align:center;">HSN</th>
              <th style="width:65px; text-align:center;">Quantity</th>
              <th style="width:65px; text-align:right;">MRP</th>
              <th style="width:65px; text-align:right;">Rate</th>
              <th style="width:50px; text-align:center;">Disc</th>
              <th style="width:45px; text-align:center;">GST</th>
              <th style="width:85px; text-align:right;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <!-- TOTALS & WORDS SECTION -->
        <div class="summary-wrapper">
          <!-- LEFT: WORDS & TERMS -->
          <div class="terms-and-words">
            <div class="amount-words-box">
              <b>Invoice Amount in Words:</b>
              <div class="amount-words-text">${amountInWords}</div>
            </div>

            <div class="terms-box">
              <b>Terms &amp; Conditions:</b>
              <div>1. All medicines sold are storage-verified &amp; genuine.</div>
              <div>2. Return/Exchange allowed within 7 days along with this original bill.</div>
              <div>3. Cold-chain items (Injections/Insulin) once sold are non-returnable.</div>
            </div>
          </div>

          <!-- RIGHT: FINANCIAL BREAKUP TABLE -->
          <div>
            <table class="totals-table">
              <tr>
                <td class="label-cell">Gross Subtotal:</td>
                <td class="val-cell">${money(sale.subtotal)}</td>
              </tr>
              ${
                sale.discount > 0
                  ? `<tr>
                      <td class="label-cell" style="color:#b91c1c;">Special Discount:</td>
                      <td class="val-cell" style="color:#b91c1c;">-${money(sale.discount)}</td>
                    </tr>`
                  : ''
              }
              <tr>
                <td class="label-cell">Taxable Value:</td>
                <td class="val-cell">${money(Math.max(0, sale.subtotal - sale.discount))}</td>
              </tr>
              <tr>
                <td class="label-cell">CGST (Calculated):</td>
                <td class="val-cell">${money(cgstAmount)}</td>
              </tr>
              <tr>
                <td class="label-cell">SGST (Calculated):</td>
                <td class="val-cell">${money(sgstAmount)}</td>
              </tr>
              <tr class="grand-row">
                <td>NET AMOUNT PAYABLE:</td>
                <td class="val-cell">${money(sale.total)}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- GST SUMMARY STRIP -->
        <div class="gst-breakup-strip">
          <span>HSN: <b>3004 (Medicaments)</b></span>
          <span>Taxable: <b>${money(Math.max(0, sale.subtotal - sale.discount))}</b></span>
          <span>CGST: <b>${money(cgstAmount)}</b></span>
          <span>SGST: <b>${money(sgstAmount)}</b></span>
          <span>Total Tax: <b>${money(sale.tax)}</b></span>
        </div>

        <!-- SIGNATURE BLOCK -->
        <div class="footer-signatures">
          <div class="patient-ack">
            <div>Patient/Receiver Signature: __________________</div>
            <div style="margin-top:4px;">Received the above medicines in good condition with seals intact.</div>
          </div>
          <div class="pharmacy-sign-box">
            <div class="sign-line"></div>
            <div class="sign-title">For CAREPLUS HOSPITAL PHARMACY</div>
            <div class="sign-sub">Authorized Pharmacist / Signatory</div>
          </div>
        </div>

        <div class="blessing-footer">
          *** WISH YOU A SPEEDY RECOVERY &amp; GOOD HEALTH ***
        </div>
      </div>

      <script>
        window.onload = () => {
          window.print();
        }
      </script>
    </body>
    </html>
  `)
  w.document.close()
}
