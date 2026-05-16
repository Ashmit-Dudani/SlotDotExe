const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx') || file.endsWith('.css') || file.endsWith('.js')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('src');
let changed = 0;
files.forEach(file => {
  let original = fs.readFileSync(file, 'utf8');
  let content = original;
  
  // Replace specific background classes for a true black/dark grey theme
  content = content.replace(/bg-slate-950/g, 'bg-black');
  content = content.replace(/bg-slate-900/g, 'bg-black');
  content = content.replace(/bg-slate-800/g, 'bg-zinc-900');
  content = content.replace(/bg-slate-700/g, 'bg-zinc-800');
  content = content.replace(/border-slate-800/g, 'border-zinc-900');
  content = content.replace(/border-slate-700/g, 'border-zinc-800');
  content = content.replace(/border-slate-600/g, 'border-zinc-700');

  // Catch-all for remaining slate colors
  content = content.replace(/slate-/g, 'zinc-');

  // Hex colors in TimeInput.jsx or others
  content = content.replace(/#020617/ig, '#000000'); // slate-950 -> black
  content = content.replace(/#0f172a/ig, '#18181b'); // slate-900 -> zinc-900
  content = content.replace(/#1e293b/ig, '#27272a'); // slate-800 -> zinc-800
  content = content.replace(/#334155/ig, '#3f3f46'); // slate-700 -> zinc-700
  content = content.replace(/#475569/ig, '#52525b');
  content = content.replace(/#64748b/ig, '#71717a');
  content = content.replace(/#94a3b8/ig, '#a1a1aa');
  content = content.replace(/#cbd5e1/ig, '#d4d4d8');
  content = content.replace(/#e2e8f0/ig, '#e4e4e7');

  if (content !== original) {
    fs.writeFileSync(file, content);
    changed++;
  }
});
console.log('Replaced colors in ' + changed + ' files.');
