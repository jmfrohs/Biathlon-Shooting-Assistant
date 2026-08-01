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
 * Simple HTTP Server for Development
 * Serves files from the src directory
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = 8000;
const SRC_DIR = path.join(__dirname, '..', 'src');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[90m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

const server = http.createServer((req, res) => {
  let filePath = path.join(SRC_DIR, req.url === '/' ? 'index.html' : req.url);
  if (!filePath.startsWith(SRC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    console.log(`${colors.red}${colors.bright}[403]${colors.reset} ${req.url}`);
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 - File not found');
      console.log(`${colors.red}[404]${colors.reset} ${req.url}`);
      return;
    }

    const ext = path.extname(filePath);
    let contentType = 'text/plain';
    if (ext === '.html') contentType = 'text/html';
    else if (ext === '.js') contentType = 'application/javascript';
    else if (ext === '.css') contentType = 'text/css';
    else if (ext === '.json') contentType = 'application/json';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.svg') contentType = 'image/svg+xml';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
    console.log(`${colors.green}[200]${colors.reset} ${colors.dim}${req.url}${colors.reset}`);
  });
});
server.listen(PORT, () => {
  console.log(`\n${colors.green}${colors.bright}Development Server Running${colors.reset}`);
  console.log(`  URL:     ${colors.cyan}${colors.bright}http://localhost:${PORT}${colors.reset}`);
  console.log(`  Serving: ${colors.yellow}${SRC_DIR}${colors.reset}`);
  console.log(`\n${colors.dim}Press Ctrl+C to stop the server${colors.reset}\n`);
});
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `\n${colors.red}${colors.bright}Error: Port ${PORT} is already in use${colors.reset}`
    );
    process.exit(1);
  }
  throw err;
});
