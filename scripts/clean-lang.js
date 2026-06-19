const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/context/LanguageContext.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const searchStr = "'footer.dev': 'Design & Development',";
const targetIndex = content.indexOf(searchStr);
if (targetIndex === -1) {
  console.error("Could not find search string in LanguageContext.tsx");
  process.exit(1);
}

const restOfContent = content.substring(targetIndex + searchStr.length);
const closeIndex = restOfContent.indexOf("const LanguageContext");
if (closeIndex === -1) {
  console.error("Could not find const LanguageContext in rest of content");
  process.exit(1);
}

const cleaned = content.substring(0, targetIndex + searchStr.length) + "\r\n  }\r\n};\r\n\r\n" + restOfContent.substring(closeIndex);
fs.writeFileSync(filePath, cleaned, 'utf8');
console.log("Successfully cleaned LanguageContext.tsx!");
