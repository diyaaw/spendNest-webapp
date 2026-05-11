const fs = require('fs');
const mlService = require('./src/services/ml.service');
const csvContent = `Junk row 1,,,,
Junk row 2,,,,
Junk row 3,,,,
Junk row 4,,,,
Junk row 5,,,,
Junk row 6,,,,
Date,Description,Type,Amount (INR),Balance (INR),Category
01/01/2026,Salary,Credit,1000,1000,Income
02/01/2026,Groceries,Debit,50,950,Food
Junk footer,,,,`;

fs.writeFileSync('test2.csv', csvContent);

(async () => {
  try {
    const buffer = fs.readFileSync('test2.csv');
    const res = await mlService.parseAndAnalyze(buffer, 'test2.csv');
    console.log(JSON.stringify(res.transactions, null, 2));
  } catch (err) {
    console.error(err);
  }
})();
