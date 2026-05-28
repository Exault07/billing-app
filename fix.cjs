const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  fs.readdirSync(dir).forEach(file => {
    file = path.join(dir, file);
    if (fs.statSync(file).isDirectory()) results = results.concat(walk(file));
    else if (file.endsWith('.js') || file.endsWith('.jsx')) results.push(file);
  });
  return results;
}
walk('d:/Billing App/src').forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;
  content = content.replace(/\bRs\.\s*/g, '₹');
  content = content.replace(/\bINR\b/g, '₹');
  content = content.replace(/"Sample Product"/g, '""');
  if (content !== original) {
    fs.writeFileSync(f, content);
    console.log('Updated', f);
  }
});
