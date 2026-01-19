#!/usr/bin/env node
/*
MIT License

Copyright (c) 2026 jmfrohs

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/**
 * Format all files and add/update MIT license headers
 * Usage: node scripts/format-with-licenses.js
 * 
 * This script:
 * - Scans all .js files in src/, tests/, and scripts/
 * - Detects missing MIT license headers
 * - Adds or updates license headers with current year
 * - Reports statistics about processed files
 */

const fs = require('fs');
const path = require('path');

const MIT_LICENSE = `/*
MIT License

Copyright (c) 2026 jmfrohs

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/`;

const DIRS_TO_SCAN = ['src', 'tests', 'scripts'];
const FILE_EXTENSIONS = ['.js', '.html'];

let stats = {
  total: 0,
  added: 0,
  updated: 0,
  skipped: 0,
  errors: 0
};

/**
 * Recursively find all files with specified extensions
 */
function findFiles(dir, ext = ['.js']) {
  const files = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        files.push(...findFiles(fullPath, ext));
      } else if (ext.includes(path.extname(entry.name))) {
        files.push(fullPath);
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err.message);
  }
  
  return files;
}

/**
 * Check if file already has a license header
 */
function hasLicenseHeader(content) {
  // Remove shebang line if present for license check
  const contentWithoutShebang = content.replace(/^#!.*\n/, '');
  return contentWithoutShebang.trim().startsWith('/*') && contentWithoutShebang.includes('MIT License');
}

/**
 * Extract existing license block and its end position
 */
function getLicenseBlockEnd(content) {
  // Remove shebang line if present
  const contentWithoutShebang = content.replace(/^#!.*\n/, '');
  const match = contentWithoutShebang.match(/^\/\*[\s\S]*?\*\//);
  if (match) {
    return match[0].length;
  }
  return -1;
}

/**
 * Process a single file
 */
function processFile(filePath) {
  // Skip this script itself to prevent self-modification
  if (filePath.endsWith('format-with-licenses.js')) {
    stats.skipped++;
    return 'skipped';
  }
  
  stats.total++;
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const hasShebang = content.startsWith('#!');
    const shebang = hasShebang ? content.split('\n')[0] + '\n' : '';
    const contentWithoutShebang = content.replace(/^#!.*\n/, '');
    const hasLicense = hasLicenseHeader(content);
    
    if (hasLicense) {
      // Check if year needs updating
      if (!contentWithoutShebang.includes('2026')) {
        const updated = contentWithoutShebang.replace(
          /Copyright \(c\) \d{4} jmfrohs/,
          'Copyright (c) 2026 jmfrohs'
        );
        fs.writeFileSync(filePath, shebang + updated, 'utf-8');
        stats.updated++;
        return 'updated';
      }
      stats.skipped++;
      return 'skipped';
    } else {
      // Add license header (preserving shebang if present)
      const updated = MIT_LICENSE + '\n\n' + contentWithoutShebang;
      fs.writeFileSync(filePath, shebang + updated, 'utf-8');
      stats.added++;
      return 'added';
    }
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err.message);
    stats.errors++;
    return 'error';
  }
}

/**
 * Main function
 */
function main() {
  console.log('🔧 Formatting files and managing licenses...\n');
  
  const allFiles = [];
  
  // Collect all files
  for (const dir of DIRS_TO_SCAN) {
    const fullDir = path.join(__dirname, '..', dir);
    if (fs.existsSync(fullDir)) {
      allFiles.push(...findFiles(fullDir, FILE_EXTENSIONS));
    }
  }
  
  if (allFiles.length === 0) {
    console.log('❌ No files found to process.');
    return;
  }
  
  console.log(`📂 Found ${allFiles.length} files to process\n`);
  
  // Process each file
  const results = {};
  for (const file of allFiles) {
    const result = processFile(file);
    const relative = path.relative(path.join(__dirname, '..'), file);
    
    if (results[result]) {
      results[result]++;
    } else {
      results[result] = 1;
    }
  }
  
  // Print statistics
  console.log('\n📊 Processing Results:');
  console.log('─'.repeat(40));
  console.log(`Total files processed:  ${stats.total}`);
  console.log(`✅ License headers added:  ${stats.added}`);
  console.log(`🔄 License headers updated: ${stats.updated}`);
  console.log(`⏭️  Already licensed:      ${stats.skipped}`);
  if (stats.errors > 0) {
    console.log(`❌ Errors:               ${stats.errors}`);
  }
  console.log('─'.repeat(40));
  console.log('\n✨ License management complete!');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { processFile, hasLicenseHeader };
