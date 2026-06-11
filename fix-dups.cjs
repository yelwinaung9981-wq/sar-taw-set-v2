const fs = require('fs');
const linesToRemove = [
130, 135, 197, 261, 266, 276, 277, 278, 279, 281, 289, 290, 313, 315, 335, 336, 344, 345, 349, 350, 351, 352, 356, 357, 366, 367, 405, 1943, 1970, 1999, 2118, 2123, 2176, 2178, 2207, 2243
];

let content = fs.readFileSync('src/lib/translations.ts', 'utf8');
let lines = content.split('\n');

for (let lineNum of linesToRemove) {
    if (lines[lineNum - 1].includes('loginError')) {
       console.warn('Wait, loginError is on this line? ' + lineNum + ' -> ' + lines[lineNum-1]);
    }
    // Comment it out instead of deleting so line numbers don't shift during manual edits if we needed, but script is one-shot.
    // Actually we can just comment them out.
    lines[lineNum - 1] = '// ' + lines[lineNum - 1];
}

fs.writeFileSync('src/lib/translations.ts', lines.join('\n'));
console.log('Fixed duplicate keys.');
