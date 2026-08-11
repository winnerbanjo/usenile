const fs = require('fs');

try {
  let code = fs.readFileSync('server.js', 'utf8');
  
  // Find all multi-line content fields starting with backticks and ending before status:
  const regex = /content:\s*`([\s\S]*?)`,\s*status:/g;
  
  let matches = 0;
  code = code.replace(regex, (match, p1) => {
    matches++;
    // Remove newlines and reduce multiple spaces to a single space
    let compressed = p1.replace(/\r?\n/g, '').replace(/\s{2,}/g, ' ').trim();
    
    // Replace single quotes with escaped single quotes if we wrap in single quotes
    let escaped = compressed.replace(/'/g, "\\'");
    
    // Return the formatted string using single quotes like the original code
    return `content: '${escaped}',\n      status:`;
  });

  fs.writeFileSync('server.js', code);
  console.log(`Successfully fixed ${matches} multiline content blocks.`);
} catch (err) {
  console.error("Error:", err);
}
