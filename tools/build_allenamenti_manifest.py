#!/usr/bin/env python3
"""Genera docs/project/allenamenti-archivio/manifest.csv dall'archivio Drive di Luca.

L'archivio vive nella cartella condivisa Google Drive `Allenamenti` (storico del
Milano Triathlon Team). I binari vengono copiati in `raw/` (gitignored) con rclone:

    rclone copy "gdrive:Allenamenti" docs/project/allenamenti-archivio/raw/ \
        --drive-shared-with-me

Questo script cataloga quei file: ricava anno/mese/fase/disciplina dal nome,
segnala i documenti scansionati (senza testo estraibile) e i casi dubbi, e
scrive `manifest.csv` con le colonne previste dal README dell'archivio.

Uso:
    python3 tools/build_allenamenti_manifest.py --dry-run
    python3 tools/build_allenamenti_manifest.py
    python3 tools/build_allenamenti_manifest.py --drive-ids /tmp/lsjson.json

`--drive-ids` accetta l'output di
`rclone lsjson "gdrive:Allenamenti" --drive-shared-with-me > /tmp/lsjson.json`
e popola la colonna `link_drive`.

La fase e' dedotta dal mese con la periodizzazione del club (nov-feb base,
mar-apr build, mag-ago peak, set-ott transition): va verificata in normalizzazione.
"""

import argparse
import csv
import json
import os
import re
import subprocess
import sys
import zipfile
from collections import Counter

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARCHIVIO = os.path.join(REPO, "docs", "project", "allenamenti-archivio")
RAW = os.path.join(ARCHIVIO, "raw")
MANIFEST = os.path.join(ARCHIVIO, "manifest.csv")

FIELDS = [
    "id",
    "anno",
    "mese",
    "fase",
    "disciplina",
    "periodo",
    "file_originale",
    "formato",
    "link_drive",
    "file_normalizzato",
    "stato",
    "note",
]

MESI = {
    "gennaio": 1,
    "febbraio": 2,
    "marzo": 3,
    "aprile": 4,
    "maggio": 5,
    "giugno": 6,
    "luglio": 7,
    "agosto": 8,
    "settembre": 9,
    "ottobre": 10,
    "novembre": 11,
    "dicembre": 12,
}

DISCIPLINA_ORDER = {"misto": 0, "nuoto": 1, "bici": 2, "corsa": 3, "palestra": 4}

# File gia' normalizzati: nome originale -> percorso relativo in normalizzato/.
NORMALIZZATI = {
    "Scheda Settimanale Gemini per 11 2026.docx": "normalizzato/2026-11_base_misto_01.md",
    "allenamento nuoto bici corsa 2024 11 1-2.docx": "normalizzato/2024-11_base_misto_01.md",
}


def fase_da_mese(mese):
    if mese is None:
        return ""
    if mese in (11, 12, 1, 2):
        return "base"
    if mese in (3, 4):
        return "build"
    if mese in (5, 6, 7, 8):
        return "peak"
    return "transition"


def disciplina_da_nome(nome):
    low = nome.lower()
    if "nuoto bici corsa" in low:
        return "misto"
    if "gemini" in low or low.startswith("week"):
        return "misto"
    if "stile libero" in low:
        return "nuoto"
    if "running" in low:
        return "corsa"
    if "nuoto" in low:
        return "nuoto"
    if "corsa" in low:
        return "corsa"
    return "altro"


def normalizza_periodo(rest):
    """'1' -> 'sett. 1', '1-2' -> 'sett. 1-2', '3 4' -> 'sett. 3-4'."""
    rest = rest.strip()
    if not rest:
        return "", None
    nums = re.findall(r"\d+", rest)
    if not nums:
        return "", None
    if len(nums) == 1:
        return "sett. {}".format(nums[0]), nums[0]
    return "sett. {}-{}".format(nums[0], nums[-1]), nums[0]


def parse_nome(nome):
    """Estrae anno, mese, periodo, disciplina e note dal nome del file."""
    stem, ext = os.path.splitext(nome)
    low = stem.lower()
    anno = None
    mese = None
    periodo = ""
    note = []

    def nota_variante(rest):
        nonlocal periodo
        rest = (rest or "").strip()
        if not rest:
            return
        if rest.isdigit():
            periodo = "seduta {}".format(rest)
            return
        note.append("variante: {}".format(rest))
        nums = re.findall(r"\d+", rest)
        if len(nums) > 1:
            periodo = "sedute {}-{}".format(nums[0], nums[-1])

    # Piano settimanale completo: "allenamento nuoto bici corsa 2025 11 1-2"
    m = re.match(r"allenamento nuoto bici corsa (\d{4}) (\d{2})(?:\s+(.+))?$", low)
    if m:
        anno, mese = int(m.group(1)), int(m.group(2))
        periodo, _ = normalizza_periodo(m.group(3) or "")
    else:
        # "Allenamento Corsa 2022 11 1" (anno prima del mese)
        m = re.match(r"allenamento (?:nuoto|corsa) (\d{4}) (\d{2})(?:\s+(.+))?$", low)
        if m:
            anno, mese = int(m.group(1)), int(m.group(2))
            nota_variante(m.group(3))
        else:
            # "Allenamento Nuoto 11 2023 1" (mese prima dell'anno)
            m = re.match(r"allenamento (?:nuoto|corsa) (\d{2}) (\d{4})(?:\s+(.+))?$", low)
            if m:
                mese, anno = int(m.group(1)), int(m.group(2))
                nota_variante(m.group(3))
            else:
                # "CORSA NOVEMBRE 1 MTT" / "CORSA GENNAIO 2022 1 MTT"
                m = re.match(r"corsa ([a-z]+)(?:\s+(\d{4}))?\s+(\d+)\s+mtt$", low)
                if m and m.group(1) in MESI:
                    mese = MESI[m.group(1)]
                    anno = int(m.group(2)) if m.group(2) else None
                    periodo = "seduta {}".format(m.group(3))
                else:
                    # "Corsa Agosto 2021 1"
                    m = re.match(r"corsa ([a-z]+) (\d{4}) (\d+)$", low)
                    if m and m.group(1) in MESI:
                        mese = MESI[m.group(1)]
                        anno = int(m.group(2))
                        periodo = "seduta {}".format(m.group(3))
                    else:
                        # "Week 1_2 Maggio"
                        m = re.match(r"week (\d+)_(\d+) ([a-z]+)$", low)
                        if m and m.group(3) in MESI:
                            mese = MESI[m.group(3)]
                            periodo = "sett. {}-{}".format(m.group(1), m.group(2))
                        else:
                            # "Scheda Settimanale Gemini per 11 2026"
                            m = re.search(r"per (\d{2}) (\d{4})$", low)
                            if m:
                                mese, anno = int(m.group(1)), int(m.group(2))

    if anno is None:
        y = re.search(r"(20\d{2})", stem)
        if y:
            anno = int(y.group(1))
    if mese is None:
        for parola, num in MESI.items():
            if parola in low:
                mese = num
                break

    if "gemini" in low:
        periodo = periodo or "settimana tipo"
        note.append(
            "RIFERIMENTO novembre 2026 indicato da Luca (struttura 3+2 con palestra); "
            "Luca chiama novembre 'transizione + base aerobica + forza', il codice lo mappa a base"
        )
    if "2024 11 1-2" in low:
        note.append("contiene la regola di struttura del club (2 palestra + 1 nuoto + 1 corsa + 1 bici)")

    return {
        "anno": anno,
        "mese": mese,
        "periodo": periodo,
        "ext": ext.lower().lstrip("."),
        "note": note,
        "stem": stem,
        "low": low,
    }


def docx_ha_testo(path):
    try:
        with zipfile.ZipFile(path) as z:
            xml = z.read("word/document.xml").decode("utf-8", "ignore")
    except Exception:
        return False
    return len(re.findall(r"<w:t[ >]", xml)) > 0


def pdf_ha_testo(path):
    try:
        out = subprocess.run(
            ["pdftotext", path, "-"],
            capture_output=True,
            text=True,
            timeout=60,
        ).stdout
    except Exception:
        return False
    return len(out.strip()) > 40


def pdf_titolo(path):
    try:
        out = subprocess.run(
            ["pdftotext", path, "-"],
            capture_output=True,
            text=True,
            timeout=60,
        ).stdout
    except Exception:
        return ""
    for riga in out.splitlines():
        riga = riga.strip()
        if riga:
            return riga
    return ""


def carica_ids(path):
    with open(path, encoding="utf-8") as f:
        dati = json.load(f)
    return {d["Name"]: d["ID"] for d in dati if d.get("ID")}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--drive-ids", help="output di rclone lsjson con i file ID")
    parser.add_argument("--raw", default=RAW)
    args = parser.parse_args()

    if not os.path.isdir(args.raw):
        sys.exit("Cartella raw assente: {}".format(args.raw))

    ids = carica_ids(args.drive_ids) if args.drive_ids else {}

    righe = []
    for nome in sorted(os.listdir(args.raw)):
        path = os.path.join(args.raw, nome)
        if not os.path.isfile(path) or nome.startswith("."):
            continue
        info = parse_nome(nome)
        ext = info["ext"]
        if ext not in ("docx", "pdf", "xlsx"):
            continue

        note = list(info["note"])
        has_text = None
        interno = ""
        if ext == "docx":
            has_text = docx_ha_testo(path)
        elif ext == "pdf":
            has_text = pdf_ha_testo(path)
            interno = pdf_titolo(path)
        if has_text is False:
            note.append("scansionato: nessun testo estraibile, serve OCR")

        if interno and interno.upper().startswith("CORSA "):
            m_int = re.match(r"CORSA ([A-Za-z]+)", interno, re.I)
            if m_int and m_int.group(1).lower() in MESI:
                if info["mese"] and MESI[m_int.group(1).lower()] != info["mese"]:
                    note.append(
                        "titolo interno «{}» diverso dal nome file (probabile copia-incolla)".format(
                            interno
                        )
                    )

        note = list(dict.fromkeys(note))
        if not info["anno"] or not info["mese"]:
            note = [n for n in note if n != "anno non indicato nel nome"]
            note.append("anno/mese non indicati nel nome: da verificare")
        if info["low"].endswith(" 23") or info["low"].endswith(" 3 4"):
            note.append("numero finale composto: verificare a quali settimane corrisponde")

        righe.append(
            {
                "anno": info["anno"],
                "mese": info["mese"],
                "fase": fase_da_mese(info["mese"]),
                "disciplina": disciplina_da_nome(nome),
                "periodo": info["periodo"],
                "file_originale": nome,
                "formato": ext,
                "link_drive": "https://drive.google.com/file/d/{}/view".format(ids[nome])
                if nome in ids
                else "",
                "note": "; ".join(note),
            }
        )

    righe.sort(
        key=lambda r: (
            r["anno"] or 9999,
            r["mese"] or 99,
            DISCIPLINA_ORDER.get(r["disciplina"], 9),
            r["file_originale"],
        )
    )

    contatori = Counter()
    for r in righe:
        base = "{}-{:02d}_{}_{}".format(
            r["anno"] if r["anno"] else "ND",
            r["mese"] if r["mese"] else 0,
            r["fase"] or "nd",
            r["disciplina"],
        )
        contatori[base] += 1
        r["id"] = "{}_{:02d}".format(base, contatori[base])

    print("File catalogati: {}".format(len(righe)))
    print("Per formato: {}".format(dict(Counter(r["formato"] for r in righe))))
    print("Per disciplina: {}".format(dict(Counter(r["disciplina"] for r in righe))))
    print(
        "Senza testo (OCR): {}".format(
            sum(1 for r in righe if "serve OCR" in r["note"])
        )
    )
    print(
        "Link Drive risolti: {}/{}".format(
            sum(1 for r in righe if r["link_drive"]), len(righe)
        )
    )
    print(
        "Senza anno/mese: {}".format(
            sum(1 for r in righe if "da verificare" in r["note"])
        )
    )

    if args.dry_run:
        return

    with open(MANIFEST, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        for r in righe:
            writer.writerow(
                {
                    "id": r["id"],
                    "anno": r["anno"] or "",
                    "mese": "{:02d}".format(r["mese"]) if r["mese"] else "",
                    "fase": r["fase"],
                    "disciplina": r["disciplina"],
                    "periodo": r["periodo"],
                    "file_originale": r["file_originale"],
                    "formato": r["formato"],
                    "link_drive": r["link_drive"],
                    "file_normalizzato": NORMALIZZATI.get(r["file_originale"], ""),
                    "stato": "normalizzato"
                    if r["file_originale"] in NORMALIZZATI
                    else "da_normalizzare",
                    "note": r["note"],
                }
            )
    print("Scritto {}".format(os.path.relpath(MANIFEST, REPO)))


if __name__ == "__main__":
    main()
