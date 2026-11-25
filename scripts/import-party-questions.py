"""Import numbered question tabs from a Google Sheets XLSX export.

Usage: python scripts/import-party-questions.py workbook.xlsx
Download: https://docs.google.com/spreadsheets/d/1dAZZ8PrtNkbqsl6DTnnaScOaQXDU2jxv7lGxE387Wz4/export?format=xlsx
Only prompts are exported to the browser; answer keys stay on the server.
"""
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path, PurePosixPath

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
TIERS = {"Plankton", "Too Clever", "Schooler", "Rare", "Deep Cut", "Krillion"}
ROOT = Path(__file__).resolve().parents[1]


def read_questions(path):
    with zipfile.ZipFile(path) as book:
        def xml(file):
            return ET.fromstring(book.read(file))

        strings = []
        if "xl/sharedStrings.xml" in book.namelist():
            strings = ["".join(s.itertext()) for s in xml("xl/sharedStrings.xml").findall("m:si", NS)]
        targets = {r.attrib["Id"]: r.attrib["Target"] for r in xml("xl/_rels/workbook.xml.rels")}
        tabs = sorted((int(match[1]), targets[s.attrib[REL]]) for s in xml("xl/workbook.xml").findall("m:sheets/m:sheet", NS)
                      if (match := re.fullmatch(r"Question (\d+)", s.attrib["name"], re.IGNORECASE)))
        if not tabs or [n for n, _ in tabs] != list(range(1, len(tabs) + 1)):
            raise ValueError("Expected consecutively numbered tabs starting with Question 1.")
        if len(tabs) > 10:
            raise ValueError("The game API supports at most 10 rounds.")

        questions = []
        for number, target in tabs:
            file = target.lstrip("/") if target.startswith("/") else str(PurePosixPath("xl", target))
            rows = []
            for row in xml(file).findall(".//m:row", NS):
                cells = {}
                for cell in row.findall("m:c", NS):
                    text = cell.findtext("m:v", default="", namespaces=NS)
                    if cell.get("t") == "s" and text:
                        text = strings[int(text)]
                    if cell.get("t") == "inlineStr":
                        inline = cell.find("m:is", NS)
                        text = "".join(inline.itertext()) if inline is not None else ""
                    if text.strip():
                        cells[re.match(r"[A-Z]+", cell.attrib["r"])[0]] = text.strip()
                if cells:
                    rows.append(cells)
            if len(rows) < 3 or len(rows[0]) != 1:
                raise ValueError(f"Question {number} must have one prompt, a tier header row, and answers.")
            headers = rows[1]
            if set(headers.values()) - TIERS:
                raise ValueError(f"Question {number} has an unknown answer tier.")
            answers = []
            for row in rows[2:]:
                for column, text in row.items():
                    if column not in headers:
                        raise ValueError(f"Question {number} has an answer in column {column} without a tier.")
                    if any(not part.strip() or len(part.strip()) > 120 for part in text.split("|")):
                        raise ValueError(f"Question {number} has an empty or overlong answer.")
                    answers.append({"answer": text, "sourceTier": headers[column]})
            questions.append({"prompt": next(iter(rows[0].values())), "answers": answers})
        return questions


def write_json(path, content):
    (ROOT / path).write_text(json.dumps(content, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    questions = read_questions(sys.argv[1])
    write_json("artifacts/api-server/src/data/party-questions.json", questions)
    write_json("artifacts/sweetest-scoop/src/game/party-prompts.json", [q["prompt"] for q in questions])
    print(f"Imported {len(questions)} questions and {sum(len(q['answers']) for q in questions)} answer entries.")
