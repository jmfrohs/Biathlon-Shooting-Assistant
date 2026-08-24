#!/usr/bin/env python3
"""
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
"""

"""
Formatieren aller Dateien, Entfernen von //-Kommentaren und 
Hinzufügen/Aktualisieren der MIT-Lizenz-Header.
Verwendung: python3 format.py

Dieses Skript:
- Durchsucht alle .js/.html/.css Dateien in den angegebenen Verzeichnissen
- Entfernt einzeilige Kommentare (//) aus .js Dateien (sicher vor Strings/URLs)
- Erkennt fehlende MIT-Lizenz-Header und fügt diese hinzu / aktualisiert sie
- Erstellt einen Statistikbericht über die verarbeiteten Dateien
"""

import os
import re

MIT_LICENSE_JS_CSS = """/*
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
*/"""

MIT_LICENSE_HTML = """<!--
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
-->"""

DIRS_TO_SCAN = ["src", "tests", "scripts"]
FILE_EXTENSIONS = (".js", ".html", ".css")
IGNORED_DIRS = {
    ".git",
    ".github",
    "node_modules",
    ".vscode",
    ".qodo",
    ".husky",
    ".media",
    "coverage",
    "htmlcov",
}

stats = {
    "total": 0,
    "added": 0,
    "updated": 0,
    "skipped": 0,
    "errors": 0,
}


class Color:
    reset = "\033[0m"
    bold = "\033[1m"
    error = "\033[31m"
    added = "\033[32m"
    updated = "\033[33m"
    skipped = "\033[90m"
    cyan = "\033[36m"
    orange = "\033[38;2;255;165;0m"
    js_yellow = "\033[33m"
    css_blue = "\033[94m"


color = Color()


def find_files_recursive(directory, extensions=FILE_EXTENSIONS):
    """Rekursives Finden aller Dateien mit den angegebenen Dateiendungen."""
    files = []
    try:
        entries = os.scandir(directory)
    except OSError:
        return files

    with entries:
        for entry in entries:
            full_path = os.path.join(directory, entry.name)
            if entry.is_dir():
                if entry.name not in IGNORED_DIRS:
                    files.extend(find_files_recursive(full_path, extensions))
            elif entry.name.endswith(extensions):
                files.append(full_path)
    return files


def extract_license_and_body(content):
    """Extrahiert Shebang, Lizenz-Header und den restlichen Datei-Body."""
    has_shebang = content.startswith("#!")
    shebang = ""
    rest = content

    if has_shebang:
        parts = content.split("\n", 1)
        shebang = parts[0] + "\n"
        rest = parts[1] if len(parts) > 1 else ""

    trimmed_rest = rest.lstrip()

    if trimmed_rest.startswith("/*") and "MIT License" in trimmed_rest[:1000]:
        end_idx = trimmed_rest.find("*/")
        if end_idx != -1:
            return shebang, trimmed_rest[end_idx + 2 :], True
    elif trimmed_rest.startswith("<!--") and "MIT License" in trimmed_rest[:1000]:
        end_idx = trimmed_rest.find("-->")
        if end_idx != -1:
            return shebang, trimmed_rest[end_idx + 3 :], True

    return shebang, rest, False


def strip_js_single_line_comments(code):
    """Entfernt einzeilige Kommentare (//), ohne Strings oder Templates zu beschädigen."""
    pattern = re.compile(
        r'("(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|`(?:\\.|[^`\\])*`)|(//[^\n\r]*)'
    )

    def replacer(match):
        string_literal = match.group(1)
        if string_literal:
            return string_literal
        return ""

    return pattern.sub(replacer, code)


def process_file(file_path):
    """Verarbeitet eine Datei (prüft/setzt Lizenz-Header und formatiert Kommentare)."""
    stats["total"] += 1

    if os.path.basename(file_path).startswith("format."):
        stats["skipped"] += 1
        return f"{color.skipped}skipped{color.reset}"

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            original_content = f.read()

        shebang, body, had_license = extract_license_and_body(original_content)

        is_html = file_path.endswith(".html")
        is_js = file_path.endswith(".js")
        target_license = MIT_LICENSE_HTML if is_html else MIT_LICENSE_JS_CSS

        processed_body = body

        if is_js:
            processed_body = strip_js_single_line_comments(processed_body)

        if file_path.endswith(".js") or file_path.endswith(".css"):
            lines = [line.rstrip() for line in processed_body.split("\n")]
            processed_body = "\n".join(lines)
            processed_body = re.sub(r"\n{3,}", "\n\n", processed_body)

        clean_body = processed_body.lstrip()

        if len(clean_body) > 0:
            final_content = f"{shebang}{target_license}\n\n{clean_body}"
        else:
            final_content = f"{shebang}{target_license}\n"

        raw_status = "skipped"

        if not had_license:
            raw_status = "added"
        elif final_content != original_content:
            raw_status = "updated"

        if raw_status != "skipped":
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(final_content)

        stats[raw_status] += 1

        if raw_status == "added":
            return f"{color.added}added{color.reset}"
        elif raw_status == "updated":
            return f"{color.updated}updated{color.reset}"
        return f"{color.skipped}skipped{color.reset}"

    except Exception as err:
        print(f"Error processing {file_path}: {err}")
        stats["errors"] += 1
        return f"{color.error}error{color.reset}"


def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))

    if os.path.exists(os.path.join(base_dir, "src")) or os.path.exists(
        os.path.join(base_dir, "scripts")
    ):
        project_root = base_dir
    else:
        project_root = os.path.normpath(os.path.join(base_dir, ".."))

    all_files = []
    for d in DIRS_TO_SCAN:
        full_dir = os.path.join(project_root, d)
        all_files.extend(find_files_recursive(full_dir, FILE_EXTENSIONS))

    if not all_files:
        print(f"{color.bold}{color.error}ERROR:{color.reset} No files found to format.\n")
        return

    print(f"{color.cyan}{color.bold}Formatting {len(all_files)} files{color.reset}\n")

    for file_path in all_files:
        process_status = process_file(file_path)
        rel_path = os.path.relpath(file_path, project_root)

        dirname = os.path.dirname(rel_path)
        filename = os.path.basename(rel_path)

        dir_prefix = f"{dirname}/" if dirname and dirname != "." else ""

        if file_path.endswith(".html"):
            colored_filename = f"{color.orange}{filename}{color.reset}"
        elif file_path.endswith(".js"):
            colored_filename = f"{color.js_yellow}{filename}{color.reset}"
        elif file_path.endswith(".css"):
            colored_filename = f"{color.css_blue}{filename}{color.reset}"
        else:
            colored_filename = filename

        formatted_path = f"{dir_prefix}{colored_filename}"
        color_padding = len(formatted_path) - len(rel_path)
        target_width = 60 + color_padding

        print(f"{formatted_path:<{target_width}} ({process_status})")

    print(f"\n{color.cyan}Processing Results:{color.reset}")
    print("─" * 40)
    print(f"{color.bold}Total files processed:           {color.reset} {stats['total']}")
    print(f"* License headers added:          {color.added}{stats['added']}{color.reset}")
    print(f"* Format/license headers updated: {color.updated}{stats['updated']}{color.reset}")
    print(f"* Already formatted/licensed:     {color.skipped}{stats['skipped']}{color.reset}")
    if stats["errors"] > 0:
        print(
            f"* {color.bold}{color.error}ERRORS:{color.reset}                  {color.error}{stats['errors']}{color.reset}"
        )
    print("─" * 40 + "\n")


if __name__ == "__main__":
    main()
