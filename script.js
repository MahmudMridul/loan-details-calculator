'use strict';

const form         = document.getElementById('loanForm');
const reportDiv    = document.getElementById('report');
const scheduleBody = document.getElementById('scheduleBody');
const resetBtn     = document.getElementById('resetBtn');

// ── Tenure unit toggle ─────────────────────────────────────────────────────

let tenureUnit = 'months'; // 'months' | 'years'

document.getElementById('btnMonths').addEventListener('click', () => setTenureUnit('months'));
document.getElementById('btnYears').addEventListener('click',  () => setTenureUnit('years'));

function setTenureUnit(unit) {
  tenureUnit = unit;
  const tenureInput = document.getElementById('tenure');
  document.getElementById('btnMonths').classList.toggle('active', unit === 'months');
  document.getElementById('btnYears').classList.toggle('active',  unit === 'years');
  tenureInput.placeholder = unit === 'months' ? 'e.g. 36' : 'e.g. 3';
  tenureInput.value = '';
  setError('tenure', '');
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getVal(id) {
  return document.getElementById(id).value.trim();
}

function setError(id, msg) {
  const el    = document.getElementById(id + 'Error');
  const input = document.getElementById(id);
  el.textContent = msg;
  if (msg) input.classList.add('invalid');
  else     input.classList.remove('invalid');
}

// ── Validation ─────────────────────────────────────────────────────────────

function validate() {
  let ok = true;

  const amtRaw  = getVal('loanAmount');
  const rateRaw = getVal('interestRate');
  const tenRaw  = getVal('tenure');

  if (amtRaw === '') {
    setError('loanAmount', 'Loan amount is required.');
    ok = false;
  } else if (!Number.isInteger(Number(amtRaw)) || Number(amtRaw) <= 0) {
    setError('loanAmount', 'Enter a positive whole number.');
    ok = false;
  } else {
    setError('loanAmount', '');
  }

  if (rateRaw === '') {
    setError('interestRate', 'Interest rate is required.');
    ok = false;
  } else if (isNaN(Number(rateRaw)) || Number(rateRaw) <= 0) {
    setError('interestRate', 'Enter a positive number (e.g. 12 or 10.5).');
    ok = false;
  } else {
    setError('interestRate', '');
  }

  if (tenRaw === '') {
    setError('tenure', 'Tenure is required.');
    ok = false;
  } else if (!Number.isInteger(Number(tenRaw)) || Number(tenRaw) <= 0) {
    setError('tenure', `Enter a positive whole number of ${tenureUnit}.`);
    ok = false;
  } else {
    setError('tenure', '');
  }

  return ok;
}

// ── EMI  P * r * (1+r)^n / ((1+r)^n - 1) ─────────────────────────────────

function calcEMI(principal, annualRate, months) {
  const r = annualRate / 12 / 100;
  if (r === 0) return principal / months;
  const pow = Math.pow(1 + r, months);
  return (principal * r * pow) / (pow - 1);
}

// ── Build amortisation schedule ────────────────────────────────────────────

function buildSchedule(principal, annualRate, months) {
  const emi         = calcEMI(principal, annualRate, months);
  const monthlyRate = annualRate / 12 / 100;
  const rows        = [];
  let   balance     = principal;

  for (let m = 1; m <= months; m++) {
    const interestPaid  = balance * monthlyRate;
    let   principalPaid = emi - interestPaid;
    const opening       = balance;

    if (m === months) principalPaid = balance; // clear floating-point residue on last month

    const closing = Math.max(0, opening - principalPaid);
    rows.push({ month: m, opening, principalPaid, interestPaid, closing });
    balance = closing;
  }

  return { emi, rows };
}

// ── Render report ──────────────────────────────────────────────────────────

function renderReport(principal, annualRate, months, emi, rows, tenureLabel) {
  const totalPaid     = emi * months;
  const totalInterest = totalPaid - principal;

  document.getElementById('s-loan').textContent     = fmt(principal);
  document.getElementById('s-rate').textContent     = annualRate + ' %';
  document.getElementById('s-tenure').textContent   = tenureLabel;
  document.getElementById('s-emi').textContent      = fmt(emi);
  document.getElementById('s-total').textContent    = fmt(totalPaid);
  document.getElementById('s-interest').textContent = fmt(totalInterest);

  scheduleBody.innerHTML = '';
  rows.forEach(r => {
    const tr = document.createElement('tr');
    const closingClass = r.closing < 0.005 ? ' class="closing-zero"' : '';
    tr.innerHTML = `
      <td>${r.month}</td>
      <td>${fmt(r.opening)}</td>
      <td>${fmt(r.principalPaid)}</td>
      <td>${fmt(r.interestPaid)}</td>
      <td${closingClass}>${fmt(r.closing)}</td>
    `;
    scheduleBody.appendChild(tr);
  });

  reportDiv.classList.remove('hidden');
  reportDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Export: CSV ────────────────────────────────────────────────────────────

function exportCSV(principal, annualRate, months, emi, rows) {
  const totalPaid     = emi * months;
  const totalInterest = totalPaid - principal;

  const lines = [
    'Loan Taken,,Interest Rate,Tenure,',
    `${principal},,${annualRate.toFixed(3)},${months},`,
    ',,,,',
    `Installment Per Month,,Total to be Paid after ${months} Months,Total Interest to be Paid,`,
    `"${fmt(emi)}",,${Math.round(totalPaid)},${Math.round(totalInterest)},`,
    ',,,,',
    'Month,Starting Principal Amount,Principal Amount Paid,Interest Paid,Remaining Principal Amount',
  ];

  rows.forEach(r => {
    lines.push([
      r.month,
      `"${fmt(r.opening)}"`,
      `"${fmt(r.principalPaid)}"`,
      `"${fmt(r.interestPaid)}"`,
      `"${fmt(r.closing)}"`,
    ].join(','));
  });

  triggerDownload(
    new Blob([lines.join('\n')], { type: 'text/csv' }),
    'Loan_Calculation.csv'
  );
}

// ── Export: PDF ────────────────────────────────────────────────────────────

function exportPDF(principal, annualRate, months, emi, rows) {
  const { jsPDF } = window.jspdf;
  const doc        = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const totalPaid     = emi * months;
  const totalInterest = totalPaid - principal;

  const brandBlue  = [37, 99, 235];
  const lightBlue  = [239, 246, 255];
  const darkText   = [15, 23, 42];
  const mutedText  = [100, 116, 139];
  const pageW      = doc.internal.pageSize.getWidth();

  // Header bar
  doc.setFillColor(...brandBlue);
  doc.rect(0, 0, pageW, 50, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Loan Amortisation Report', 40, 33);

  // Summary section
  const summaryY = 70;
  const cards = [
    ['Loan Amount',          fmt(principal)],
    ['Annual Interest Rate', annualRate + ' %'],
    ['Tenure',               months + ' months'],
    ['Monthly EMI',          fmt(emi)],
    ['Total Payable',        fmt(totalPaid)],
    ['Total Interest',       fmt(totalInterest)],
  ];

  const cardW   = (pageW - 80) / 3;
  const cardH   = 52;
  const cardGap = 10;

  cards.forEach((card, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x   = 40 + col * (cardW + cardGap);
    const y   = summaryY + row * (cardH + cardGap);

    if (i === 3) doc.setFillColor(...lightBlue);
    else         doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, cardW, cardH, 5, 5, 'F');

    if (i === 3) {
      doc.setDrawColor(...brandBlue);
      doc.setLineWidth(1);
      doc.roundedRect(x, y, cardW, cardH, 5, 5, 'S');
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mutedText);
    doc.text(card[0].toUpperCase(), x + 10, y + 16);

    doc.setFontSize(i === 3 ? 13 : 11);
    doc.setFont('helvetica', 'bold');
    if (i === 3) doc.setTextColor(...brandBlue);
    else         doc.setTextColor(...darkText);
    doc.text(card[1], x + 10, y + 36);
  });

  // Amortisation table
  const tableY = summaryY + 2 * (cardH + cardGap) + 20;

  doc.autoTable({
    startY: tableY,
    head: [['Month', 'Opening Balance', 'Principal Paid', 'Interest Paid', 'Closing Balance']],
    body: rows.map(r => [
      r.month,
      fmt(r.opening),
      fmt(r.principalPaid),
      fmt(r.interestPaid),
      fmt(r.closing),
    ]),
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 5,
      textColor: darkText,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: brandBlue,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'right',
    },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold', textColor: mutedText },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 40, right: 40 },
    didDrawPage: (data) => {
      // Page number footer
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(...mutedText);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageW / 2,
        doc.internal.pageSize.getHeight() - 15,
        { align: 'center' }
      );
    },
  });

  doc.save('Loan_Calculation.pdf');
}

// ── Export: JPG ────────────────────────────────────────────────────────────

async function exportJPG() {
  const btn = document.getElementById('exportJpgBtn');
  btn.textContent = 'Capturing...';
  btn.disabled    = true;

  try {
    const canvas = await html2canvas(reportDiv, {
      scale: 2,           // 2× for sharp output
      useCORS: true,
      backgroundColor: '#f1f5f9',
      scrollY: -window.scrollY,
    });

    canvas.toBlob(blob => {
      triggerDownload(blob, 'Loan_Calculation.jpg');
    }, 'image/jpeg', 0.95);
  } finally {
    btn.textContent = 'Export JPG';
    btn.disabled    = false;
  }
}

// ── Utility ────────────────────────────────────────────────────────────────

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

// ── Event listeners ────────────────────────────────────────────────────────

let lastCalc = null;

form.addEventListener('submit', e => {
  e.preventDefault();
  if (!validate()) return;

  const principal    = parseInt(getVal('loanAmount'), 10);
  const annualRate   = parseFloat(getVal('interestRate'));
  const tenureRaw    = parseInt(getVal('tenure'), 10);
  const months       = tenureUnit === 'years' ? tenureRaw * 12 : tenureRaw;
  const tenureLabel  = tenureUnit === 'years'
    ? `${tenureRaw} year${tenureRaw !== 1 ? 's' : ''} (${months} months)`
    : `${months} months`;

  const { emi, rows } = buildSchedule(principal, annualRate, months);
  lastCalc = { principal, annualRate, months, emi, rows };

  renderReport(principal, annualRate, months, emi, rows, tenureLabel);
});

document.getElementById('exportCsvBtn').addEventListener('click', () => {
  if (!lastCalc) return;
  const { principal, annualRate, months, emi, rows } = lastCalc;
  exportCSV(principal, annualRate, months, emi, rows);
});

document.getElementById('exportPdfBtn').addEventListener('click', () => {
  if (!lastCalc) return;
  const { principal, annualRate, months, emi, rows } = lastCalc;
  exportPDF(principal, annualRate, months, emi, rows);
});

document.getElementById('exportJpgBtn').addEventListener('click', () => {
  if (!lastCalc) return;
  exportJPG();
});

resetBtn.addEventListener('click', () => {
  form.reset();
  ['loanAmount', 'interestRate', 'tenure'].forEach(id => setError(id, ''));
  setTenureUnit('months');
  reportDiv.classList.add('hidden');
  lastCalc = null;
});
