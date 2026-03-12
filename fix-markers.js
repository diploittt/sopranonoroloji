const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps/api/src/chat/chat.gateway.ts');
let content = fs.readFileSync(filePath, 'utf8');

const regexHeadToEquals = /<<<<<<< HEAD[\s\S]*?=======\r?\n/g;
content = content.replace(regexHeadToEquals, '');

const regexTrailingMarker = />>>>>>> 2a4b46592931e0071e1280158602315f3c375626\r?\n/g;
content = content.replace(regexTrailingMarker, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed markers in chat.gateway.ts');
