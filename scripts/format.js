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
 * Formatieren aller Dateien, Entfernen von //-Kommentaren und 
 * Hinzufügen/Aktualisieren der MIT-Lizenz-Header.
 * Verwendung: node format.js
 *
 * Dieses Skript:
 * - Durchsucht alle .js/.html/.css Dateien in den angegebenen Verzeichnissen
 * - Entfernt einzeilige Kommentare (//) aus .js und .css Dateien (sicher vor Strings/URLs)
 * - Erkennt fehlende MIT-Lizenz-Header und fügt diese hinzu / aktualisiert sie
 * - Erstellt einen Statistikbericht über die verarbeiteten Dateien
 */

const fs = require("fs");
const path = require("path");

const MIT_LICENSE_JS_CSS = `/*
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

const MIT_LICENSE_HTML = `<!--
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
-->`;

const DIRS_TO_SCAN = ["src", "tests-src", "tests-src-old", "htmlcov", "scripts"];
const FILE_EXTENSIONS = [".js", ".html", ".css"];
const IGNORED_DIRS = new Set([
  ".git",
  ".github",
  "node_modules",
  ".vscode",
  ".qodo",
  ".husky",
  ".media",
]);

const stats = {
  total: 0,
  added: 0,
  updated: 0,
  skipped: 0,
  errors: 0,
};

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  error: "\x1b[31m",
  added: "\x1b[32m",
  updated: "\x1b[33m",
  skipped: "\x1b[90m",
  cyan: "\x1b[36m",
  orange: "\x1b[38;2;255;165;0m",
  jsYellow: "\x1b[33m",
  cssBlue: "\x1b[94m",
};

/**
 * Rekursives Finden aller Dateien mit den angegebenen Dateiendungen.
 */
function findFilesRecursive(directory, extensions = FILE_EXTENSIONS) {
  let files = [];
  let entries;

  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch (err) {
    return files;
  }

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        files = files.concat(findFilesRecursive(fullPath, extensions));
      }
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Prüfen, ob eine Datei am Anfang bereits einen Lizenz-Header besitzt.
 */
function hasLicenseHeader(content) {
  const contentWithoutShebang = content.replace(/^#!.*\n/, "").trimStart();
  return (
    (contentWithoutShebang.startsWith("/*") ||
      contentWithoutShebang.startsWith("<!--")) &&
    contentWithoutShebang.slice(0, 1000).includes("MIT License")
  );
}

/**
 * Extrahiert den Lizenz-Header und den restlichen Code-Body.
 */
function extractLicenseAndBody(content) {
  const hasShebang = content.startsWith("#!");
  let shebang = "";
  let rest = content;

  if (hasShebang) {
    const firstNewlinePos = content.indexOf("\n");
    if (firstNewlinePos !== -1) {
      shebang = content.slice(0, firstNewlinePos + 1);
      rest = content.slice(firstNewlinePos + 1);
    }
  }

  const trimmedRest = rest.trimStart();

  if (trimmedRest.startsWith("/*") && trimmedRest.slice(0, 1000).includes("MIT License")) {
    const endIdx = trimmedRest.indexOf("*/");
    if (endIdx !== -1) {
      const license = trimmedRest.slice(0, endIdx + 2);
      const body = trimmedRest.slice(endIdx + 2);
      return { shebang, license, body, hadLicense: true };
    }
  } else if (trimmedRest.startsWith("<!--") && trimmedRest.slice(0, 1000).includes("MIT License")) {
    const endIdx = trimmedRest.indexOf("-->");
    if (endIdx !== -1) {
      const license = trimmedRest.slice(0, endIdx + 3);
      const body = trimmedRest.slice(endIdx + 3);
      return { shebang, license, body, hadLicense: true };
    }
  }

  return { shebang, license: "", body: rest, hadLicense: false };
}

/**
 * Entfernt einzeilige Kommentare (//), ohne Strings oder Regex zu beschädigen.
 */
function stripSingleLineComments(code) {
  const pattern = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\/\/[^\n\r]*)/g;
  
  return code.replace(pattern, (match, stringLiteral, comment) => {
    if (stringLiteral) return stringLiteral;
    return "";
  });
}

/**
 * Verarbeitet eine einzelne Datei (bereinigt Kommentare und setzt/aktualisiert Lizenz-Header).
 */
function processFile(filePath) {
  stats.total += 1;

  if (filePath.endsWith("format.js") || filePath.endsWith("format.py")) {
    stats.skipped += 1;
    return `${colors.skipped}skipped${colors.reset}`;
  }

  try {
    const originalContent = fs.readFileSync(filePath, "utf-8");
    const { shebang, body, hadLicense } = extractLicenseAndBody(originalContent);

    const isHtml = filePath.endsWith(".html");
    const isJsOrCss = filePath.endsWith(".js") || filePath.endsWith(".css");
    const targetLicense = isHtml ? MIT_LICENSE_HTML : MIT_LICENSE_JS_CSS;

    let processedBody = body;

    if (isJsOrCss) {
      processedBody = stripSingleLineComments(processedBody);
      processedBody = processedBody
        .split("\n")
        .map((line) => line.trimEnd())
        .join("\n")
        .replace(/\n{3,}/g, "\n\n");
    }

    let finalContent = "";
    const cleanBody = processedBody.trimStart();

    if (cleanBody.length > 0) {
      finalContent = `${shebang}${targetLicense}\n\n${cleanBody}`;
    } else {
      finalContent = `${shebang}${targetLicense}\n`;
    }

    let rawStatus = "skipped";

    if (!hadLicense) {
      rawStatus = "added";
    } else if (finalContent !== originalContent) {
      rawStatus = "updated";
    }

    if (rawStatus !== "skipped") {
      fs.writeFileSync(filePath, finalContent, "utf-8");
    }

    stats[rawStatus] += 1;

    if (rawStatus === "added") {
      return `${colors.added}added${colors.reset}`;
    } else if (rawStatus === "updated") {
      return `${colors.updated}updated${colors.reset}`;
    }
    return `${colors.skipped}skipped${colors.reset}`;
  } catch (err) {
    console.error(`Error processing ${filePath}: ${err.message}`);
    stats.errors += 1;
    return `${colors.error}error${colors.reset}`;
  }
}

function main() {
  const baseDir = __dirname;
  let projectRoot;

  if (
    fs.existsSync(path.join(baseDir, "src")) ||
    fs.existsSync(path.join(baseDir, "scripts"))
  ) {
    projectRoot = baseDir;
  } else {
    projectRoot = path.normalize(path.join(baseDir, ".."));
  }

  let allFiles = [];
  for (const d of DIRS_TO_SCAN) {
    const fullDir = path.join(projectRoot, d);
    allFiles = allFiles.concat(findFilesRecursive(fullDir, FILE_EXTENSIONS));
  }

  if (allFiles.length === 0) {
    console.log(`${colors.bold}${colors.error}ERROR:${colors.reset} No files found to format.\n`);
    return;
  } else {
    console.log(`${colors.cyan}${colors.bold}Formatting ${allFiles.length} files${colors.reset}\n`);
  }

  for (const filePath of allFiles) {
    const processStatus = processFile(filePath);
    const relPath = path.relative(projectRoot, filePath);

    const dirname = path.dirname(relPath);
    const filename = path.basename(relPath);

    const dirPrefix = dirname && dirname !== "." ? `${dirname}/` : "";

    let coloredFilename = filename;
    if (filePath.endsWith(".html")) {
      coloredFilename = `${colors.orange}${filename}${colors.reset}`;
    } else if (filePath.endsWith(".js")) {
      coloredFilename = `${colors.jsYellow}${filename}${colors.reset}`;
    } else if (filePath.endsWith(".css")) {
      coloredFilename = `${colors.cssBlue}${filename}${colors.reset}`;
    }

    const formattedPath = `${dirPrefix}${coloredFilename}`;
    const colorPadding = formattedPath.length - relPath.length;
    const targetWidth = 60 + colorPadding;

    console.log(`${formattedPath.padEnd(targetWidth)} (${processStatus})`);
  }

  console.log(`\n${colors.cyan}Processing Results:${colors.reset}`);
  console.log("─".repeat(40));
  console.log(`${colors.bold}Total files processed:           ${colors.reset} ${stats.total}`);
  console.log(`* License headers added:          ${colors.added}${stats.added}${colors.reset}`);
  console.log(`* Format/license headers updated: ${colors.updated}${stats.updated}${colors.reset}`);
  console.log(`* Already formatted/licensed:     ${colors.skipped}${stats.skipped}${colors.reset}`);
  if (stats.errors > 0) {
    console.log(
      `* ${colors.bold}${colors.error}ERRORS:${colors.reset}                  ${colors.error}${stats.errors}${colors.reset}`
    );
  }
  console.log("─".repeat(40));
  console.log("\n");
}

if (require.main === module) {
  main();
}