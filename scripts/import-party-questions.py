"""Import the public seven-tab party workbook into the server's versioned answer bank.

Usage: python scripts/import-party-questions.py workbook.xlsx
Download: https://docs.google.com/spreadsheets/d/1dAZZ8PrtNkbqsl6DTnnaScOaQXDU2jxv7lGxE387Wz4/export?format=xlsx
The workbook is input only; no guest submissions or database data are exported.
"""
import json
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
z = zipfile.ZipFile(sys.argv[1])
strings = ["".join(item.itertext()) for item in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", ns)]
questions = []
for number in range(1, 8):
    root = ET.fromstring(z.read(f"xl/worksheets/sheet{number}.xml"))
    rows = []
    for row in root.findall(".//m:row", ns):
        cells = {}
        for cell in row.findall("m:c", ns):
            value = cell.find("m:v", ns)
            if value is not None:
                col = "".join(ch for ch in cell.attrib["r"] if ch.isalpha())
                cells[col] = (strings[int(value.text)] if cell.get("t") == "s" else value.text).strip()
        if any(cells.values()):
            rows.append(cells)
    headers = rows[1]
    answers = []
    for row in rows[2:]:
        for col, text in row.items():
            if text and col in headers:
                answers.append({"answer": text, "sourceTier": headers[col]})
    questions.append({"prompt": next(iter(rows[0].values())), "answers": answers})
target = Path("artifacts/api-server/src/data/party-questions.json")
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(questions, indent=2, ensure_ascii=False) + "\n")
print(f"Imported {len(questions)} questions and {sum(len(q['answers']) for q in questions)} answers.")
