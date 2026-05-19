const fs = require('fs');
let code = fs.readFileSync('src/controllers/analytics.controller.js', 'utf8');

// Normalize newlines for easier regex matching
code = code.replace(/\r\n/g, '\n');

let replacedSort = false;
code = code.replace(
  /const sorted = \[\.\.\.transactions\]\.sort\(\(a, b\) => new Date\(a\.date\) - new Date\(b\.date\)\);/,
  (match) => {
    replacedSort = true;
    return `const parseDate = (d) => {
      if (typeof d === 'string' && d.match(/^\\d{2}-\\d{2}-\\d{4}$/)) {
        const [dd, mm, yyyy] = d.split('-');
        return new Date(\`\${yyyy}-\${mm}-\${dd}\`);
      }
      return new Date(d);
    };
    const sorted = [...transactions].sort((a, b) => parseDate(a.date) - parseDate(b.date));`;
  }
);
console.log('Replaced Sort:', replacedSort);

let replacedIncome = false;
code = code.replace(
  /allTimeIncome = sorted\s*\n\s*\.filter\(\(t\) => t\.type === 'income' && t\.amount > 0\)\s*\n\s*\.reduce\(\(s, t\) => s \+ t\.amount, 0\);/,
  (match) => {
    replacedIncome = true;
    return `allTimeIncome = sorted
        .filter((t) => t.type === 'income' && t.amount > 0)
        .reduce((s, t) => s + t.amount, 0);

      if (allTimeIncome === 0) {
        allTimeIncome = sorted
          .filter((t) => t.amount > 0)
          .reduce((s, t) => s + t.amount, 0);
      }`;
  }
);
console.log('Replaced Income:', replacedIncome);

let replacedBalance = false;
code = code.replace(
  /const txWithBalance = sorted\.filter\(\(t\) => t\.balance != null && t\.balance !== 0\);\s*\n\s*const latestBalance = txWithBalance\.length > 0\s*\n\s*\? txWithBalance\[txWithBalance\.length - 1\]\.balance\s*\n\s*: 0;/,
  (match) => {
    replacedBalance = true;
    return `const latestBalance = sorted[sorted.length - 1]?.balance || 0;`;
  }
);
console.log('Replaced Balance:', replacedBalance);

fs.writeFileSync('src/controllers/analytics.controller.js', code);
console.log('Saved changes to analytics.controller.js');
