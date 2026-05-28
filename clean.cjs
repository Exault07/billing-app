const fs = require('fs');
const path = require('path');

function walkSync(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try {
      if (fs.statSync(dirFile).isDirectory()) {
        if (!dirFile.includes('node_modules') && !dirFile.includes('.git') && !dirFile.includes('components')) {
          filelist = walkSync(dirFile, filelist);
        }
      } else if (dirFile.endsWith('.jsx')) {
        filelist.push(dirFile);
      }
    } catch(e) {}
  });
  return filelist;
}

const files = walkSync(path.join(__dirname, 'src/pages'));
let count = 0;

files.forEach(file => {
  let text = fs.readFileSync(file, 'utf8');
  let original = text;
  
  // Find the FIRST 'return (' that has a div right after it
  // and remove the wrapper classes.
  // Actually, just removing these specific wrapper classes globally from className strings
  // is mostly safe because they are page-level layout classes.
  
  const toRemove = [
    'max-w-[1400px]', 'max-w-[1600px]', 'max-w-7xl', 'max-w-6xl', 'max-w-5xl', 'max-w-4xl', 
    'mx-auto', 'min-h-screen', 'min-h-\\[50vh\\]', 'min-h-\\[60vh\\]', 'bg-surface-50', 'bg-gray-50'
  ];
  
  toRemove.forEach(cls => {
    text = text.replace(new RegExp('\\\\b' + cls + '\\\\b', 'g'), '');
  });
  
  // Remove trailing padding from the root wrapper, usually pb-16 or py-8 or p-6
  // This is a bit risky globally, so let's just do it for the first match after return (
  const returnIndex = text.indexOf('return (');
  if (returnIndex !== -1) {
    const divIndex = text.indexOf('<div className="', returnIndex);
    if (divIndex !== -1 && divIndex < returnIndex + 150) {
      const endQuote = text.indexOf('"', divIndex + 16);
      let classStr = text.substring(divIndex + 16, endQuote);
      
      // Remove padding classes
      classStr = classStr.replace(/\b(px-4|px-6|sm:px-6|lg:px-8|py-8|pb-16|pb-12|p-6|pt-6)\b/g, '');
      
      // Reassemble
      text = text.substring(0, divIndex + 16) + classStr + text.substring(endQuote);
    }
  }

  // cleanup multiple spaces
  text = text.replace(/className=\"\s+/g, 'className="');
  text = text.replace(/\s+\"/g, '"');
  text = text.replace(/className=\"\"/g, '');
  text = text.replace(/  +/g, ' ');

  if (text !== original) {
    fs.writeFileSync(file, text, 'utf8');
    count++;
    console.log('Cleaned wrapper in ' + path.basename(file));
  }
});

console.log('Fixed ' + count + ' files.');
