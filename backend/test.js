const fs = require('fs');
const mlService = require('./src/services/ml.service');
const csvContent = `Date,Description,Type,Amount (INR),Balance (INR),Category
01/01/2026,Salary,Credit,1000,1000,Income
02/01/2026,Groceries,Debit,50,950,Food`;

fs.writeFileSync('test.csv', csvContent);

(async () => {
  try {
    const buffer = fs.readFileSync('test.csv');
    const res = await mlService.parseAndAnalyze(buffer, 'test.csv');
    console.log(JSON.stringify(res.transactions, null, 2));
  } catch (err) {
    console.error(err);
  }
})();
