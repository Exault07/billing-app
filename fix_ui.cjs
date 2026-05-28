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
  content = content.replace(/<h1 className="text-2xl/g, '<h1 className="text-xl');
  content = content.replace(/<p className="text-surface-500 text-sm mt-1">.*?<\/p>\s*/g, '');
  if (content !== original) {
    fs.writeFileSync(f, content);
    console.log('Updated UI in', f);
  }
});
