const fs = require('fs');
let code = fs.readFileSync('src/controllers/analytics.controller.js', 'utf8');

const oldSort = `    // ── Sort by Date (oldest to newest) ───────────────────────────────────────
    const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));`;

const newSort = `    // ── Sort by Date (oldest to newest) safely handling DD-MM-YYYY ─────────
    const parseDate = (d) => {
      if (typeof d === 'string' && d.match(/^\\d{2}-\\d{2}-\\d{4}$/)) {
        const [dd, mm, yyyy] = d.split('-');
        return new Date(\`\${yyyy}-\${mm}-\${dd}\`);
      }
      return new Date(d);
    };
    const sorted = [...transactions].sort((a, b) => parseDate(a.date) - parseDate(b.date));`;

if (code.includes(oldSort)) {
  code = code.replace(oldSort, newSort);
  console.log('Successfully replaced sorting logic.');
} else {
  console.log('Failed to find sorting logic.');
}

const oldAllTimeIncome = `      allTimeIncome = sorted
        .filter((t) => t.type === 'income' && t.amount > 0)
        .reduce((s, t) => s + t.amount, 0);`;

const newAllTimeIncome = `      allTimeIncome = sorted
        .filter((t) => t.type === 'income' && t.amount > 0)
        .reduce((s, t) => s + t.amount, 0);
      
      if (allTimeIncome === 0) {
        allTimeIncome = sorted
          .filter((t) => t.amount > 0)
          .reduce((s, t) => s + t.amount, 0);
      }`;

if (code.includes(oldAllTimeIncome)) {
  code = code.replace(oldAllTimeIncome, newAllTimeIncome);
  console.log('Successfully replaced all-time income fallback logic.');
} else {
  console.log('Failed to find all-time income logic.');
}

const oldBalance = `    // ── Available Balance: last non-zero balance in sorted list ───────────────
    // Rule: NEVER sum balances. NEVER derive from income - expenses.
    const txWithBalance = sorted.filter((t) => t.balance != null && t.balance !== 0);
    const latestBalance = txWithBalance.length > 0
      ? txWithBalance[txWithBalance.length - 1].balance
      : 0;`;

const newBalance = `    // ── Available Balance: last balance in sorted list ───────────────
    // Rule: NEVER sum balances. NEVER derive from income - expenses.
    const latestBalance = sorted[sorted.length - 1]?.balance || 0;`;

if (code.includes(oldBalance)) {
  code = code.replace(oldBalance, newBalance);
  console.log('Successfully replaced available balance logic.');
} else {
  console.log('Failed to find available balance logic.');
}

fs.writeFileSync('src/controllers/analytics.controller.js', code);
console.log('Saved changes to analytics.controller.js');
