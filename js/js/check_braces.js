
const fs = require('fs');
const path = 'C:/Users/sakei/OneDrive/Desktop/popgame/js/game.js';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');
let depth = 0;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Ignore strings and comments for a better estimate (basic)
    const cleanLine = line.replace(/(\".*?\"|\'.*?\'|\`.*?\`|\/\/.*|\/\*.*?\*\/)/g, '');
    const open = (cleanLine.match(/\{/g) || []).length;
    const close = (cleanLine.match(/\}/g) || []).length;
    depth += open - close;
    if (depth < 0) {
        console.log(`[ERROR] Depth negative at line ${i + 1}: ${depth}`);
    }
}
console.log(`Final depth: ${depth}`);
