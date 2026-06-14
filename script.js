'use strict';

const form         = document.getElementById('loanForm');
const reportDiv    = document.getElementById('report');
const scheduleBody = document.getElementById('scheduleBody');
const exportBtn    = document.getElementById('exportBtn');
const resetBtn     = document.getElementById('resetBtn');

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getVal(id) {
  return document.getElementById(id).value.trim();
}

function setError(id, msg) {
  const el = document.getElementById(id + 'Error');
  const input = document.getElementById(id);
  el.textContent = msg;
  if (msg) input.classList.add('invalid');
  else input.classList.remove('invalid');
}

// ── Validation ─────────────────────────────────────────────────────────────

function validate() {
  let ok = true;

  const amtRaw  = getVal('loanAmount');
  const rateRaw = getVal('interestRate');
  const tenRaw  = getVal('tenure');

  // Loan Amount
  if (amtRaw === '') {
    setError('loanAmount', 'Loan amount is required.');
    ok = false;
  } else if (!Number.isInteger(Number(amtRaw)) || Number(amtRaw) <= 0) {
    setError('loanAmount', 'Enter a positive whole number.');
    ok = false;
  } else {
    setError('loanAmount', '');
  }

  // Interest Rate
  if (rateRaw === '') {
    setError('interestRate', 'Interest rate is required.');
    ok = false;
  } else if (isNaN(Number(rateRaw)) || Number(rateRaw) <= 0) {
    setError('interestRate', 'Enter a positive number (e.g. 12 or 10.5).');
    ok = false;
  } else {
    setError('interestRate', '');
  }

  // Tenure
  if (tenRaw === '') {
    setError('tenure', 'Tenure is required.');
    ok = false;
  } else if (!Number.isInteger(Number(tenRaw)) || Number(tenRaw) <= 0) {
    setError('tenure', 'Enter a positive whole number of months.');
    ok = false;
  } else {
    setError('tenure', '');
  }

  return ok;
}

// ── EMI formula: P * r * (1+r)^n / ((1+r)^n - 1) ─────────────────────────

function calcEMI(principal, annualRate, months) {
  const r = annualRate / 12 / 100;
  if (r === 0) return principal / months;
  const pow = Math.pow(1 + r, months);
  return (principal * r * pow) / (pow - 1);
}

// ── Build amortisation schedule ────────────────────────────────────────────

function buildSchedule(principal, annualRate, months) {
  const emi = calcEMI(principal, annualRate, months);
  const monthlyRate = annualRate / 12 / 100;
  const rows = [];
  let balance = principal;

  for (let m = 1; m <= months; m++) {
    const interestPaid   = balance * monthlyRate;
    let   principalPaid  = emi - interestPaid;
    const opening        = balance;

    // Last month: clear any floating-point residue
    if (m === months) {
      principalPaid = balance;
    }

    const closing = Math.max(0, opening - principalPaid);

    rows.push({ month: m, opening, principalPaid, interestPaid, closing });
    balance = closing;
  }

  return { emi, rows };
}

// ── Render report ──────────────────────────────────────────────────────────

function renderReport(principal, annualRate, months, emi, rows) {
  const totalPaid     = emi * months;
  const totalInterest = totalPaid - principal;

  document.getElementById('s-loan').textContent    = '₹ ' + fmt(principal);
  document.getElementById('s-rate').textContent    = annualRate + ' %';
  document.getElementById('s-tenure').textContent  = months + ' months';
  document.getElementById('s-emi').textContent     = '₹ ' + fmt(emi);
  document.getElementById('s-total').textContent   = '₹ ' + fmt(totalPaid);
  document.getElementById('s-interest').textContent = '₹ ' + fmt(totalInterest);

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

// ── Export CSV (matches original CSV layout) ───────────────────────────────

function exportCSV(principal, annualRate, months, emi, rows) {
  const totalPaid     = emi * months;
  const totalInterest = totalPaid - principal;

  const lines = [];

  lines.push('Loan Taken,,Interest Rate,Tenure,');
  lines.push(`${principal},,${annualRate.toFixed(3)},${months},`);
  lines.push(',,,,');
  lines.push(`Installment Per Month,,Total to be Paid after ${months} Months,Total Interest to be Paid,`);
  lines.push(`"${fmt(emi)}",,${Math.round(totalPaid)},${Math.round(totalInterest)},`);
  lines.push(',,,,');
  lines.push('Month,Starting Principal Amount,Principal Amount Paid,Interest Paid,Remaining Principal Amount');

  rows.forEach(r => {
    lines.push([
      r.month,
      `"${fmt(r.opening)}"`,
      `"${fmt(r.principalPaid)}"`,
      `"${fmt(r.interestPaid)}"`,
      `"${fmt(r.closing)}"`
    ].join(','));
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'Loan_Calculation.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ── Event listeners ────────────────────────────────────────────────────────

let lastCalc = null;

form.addEventListener('submit', e => {
  e.preventDefault();
  if (!validate()) return;

  const principal  = parseInt(getVal('loanAmount'), 10);
  const annualRate = parseFloat(getVal('interestRate'));
  const months     = parseInt(getVal('tenure'), 10);

  const { emi, rows } = buildSchedule(principal, annualRate, months);
  lastCalc = { principal, annualRate, months, emi, rows };

  renderReport(principal, annualRate, months, emi, rows);
});

exportBtn.addEventListener('click', () => {
  if (!lastCalc) return;
  const { principal, annualRate, months, emi, rows } = lastCalc;
  exportCSV(principal, annualRate, months, emi, rows);
});

resetBtn.addEventListener('click', () => {
  form.reset();
  ['loanAmount', 'interestRate', 'tenure'].forEach(id => setError(id, ''));
  reportDiv.classList.add('hidden');
  lastCalc = null;
});
