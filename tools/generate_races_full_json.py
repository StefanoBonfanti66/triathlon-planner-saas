#!/usr/bin/env python3
"""Genera app/src/races_full.json a partire dall'export Supabase della tabella `races`.

Il catalogo statico `app/src/races_full.json` e' l'unica fonte delle gare per l'app
(DashboardPage, TeamCalendarPage, RaceDetailPage, AdminPage): il DB Supabase viene
usato solo come override di `is_removed` / `status`. Se una gara non e' nel JSON
non compare da nessuna parte, anche se il DB la contiene.

Uso:
    python3 tools/generate_races_full_json.py --dry-run
    python3 tools/generate_races_full_json.py

Perche' esiste: fino al 30/09/2026 il JSON era stato rigenerato a mano ed era fermo
al 05/05/2026, con 69 gare del calendario FITRI 2026 invisibili (tra cui Paullo/UNATRI
4139). Questo script rende l'operazione ripetibile.
"""

import argparse
import json
import os
import re
import sys
from collections import Counter

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Stesso ordine di chiavi del JSON gia' in produzione.
FIELDS = [
    "date",
    "title",
    "event",
    "location",
    "region",
    "type",
    "distance",
    "rank",
    "category",
    "link",
    "id",
    "is_removed",
]

# Solo le gare con progressivo ("3897-1"). L'export contiene anche righe a livello
# di evento con id senza progressivo (es. "3897") che non sono mai state incluse nel
# catalogo: mantenerle fuori evita voci fantasma in lista.
RACE_ID_RE = re.compile(r"^(\d+)-(\d+)$")

ALLOWED_TYPES = {"Triathlon", "Duathlon", "Aquathlon", "Winter", "Cross"}


def latest_backup(backups_dir):
    """Restituisce il percorso del backup piu' recente contenente races.json."""
    if not os.path.isdir(backups_dir):
        sys.exit("Directory backup non trovata: %s" % backups_dir)
    candidates = []
    for name in sorted(os.listdir(backups_dir)):
        path = os.path.join(backups_dir, name, "races.json")
        if os.path.isfile(path):
            candidates.append(path)
    if not candidates:
        sys.exit("Nessun races.json trovato in %s" % backups_dir)
    return candidates[-1]


def iso_date(value):
    """'10-01-2026' -> '2026-01-10' (le date sono gia' dd-mm-yyyy nell'export)."""
    if not isinstance(value, str) or len(value) != 10 or value[2] != "-" or value[5] != "-":
        return None
    dd, mm, yy = value.split("-")
    return "%s-%s-%s" % (yy, mm, dd)


def sort_key(row):
    m = RACE_ID_RE.match(row["id"])
    return (iso_date(row["date"]) or "9999-99-99", int(m.group(1)), int(m.group(2)))


def build(source_path, force_removed):
    with open(source_path, encoding="utf-8") as fh:
        raw = json.load(fh)

    events_forced = set()
    rows = []
    skipped_no_suffix = 0
    for record in raw:
        race_id = str(record.get("id", ""))
        if not RACE_ID_RE.match(race_id):
            skipped_no_suffix += 1
            continue

        event_id = RACE_ID_RE.match(race_id).group(1)
        is_removed = bool(record.get("is_removed"))
        if event_id in force_removed:
            is_removed = True
            events_forced.add(event_id)

        row = {"id": race_id}
        for field in FIELDS:
            if field == "id":
                continue
            value = record.get(field, "")
            row[field] = "" if value is None else value
        row["is_removed"] = is_removed
        row = {field: row[field] for field in FIELDS}

        if iso_date(row["date"]) is None:
            sys.exit("Data non valida nel record %s: %r" % (race_id, record.get("date")))
        if row["type"] not in ALLOWED_TYPES:
            sys.exit("Tipo non previsto nel record %s: %r" % (race_id, row["type"]))
        rows.append(row)

    rows.sort(key=sort_key)
    return rows, skipped_no_suffix, sorted(events_forced)


def diff(old_path, rows):
    """Confronto col catalogo corrente: restituisce (added, dropped, changed, old_by_id, new_by_id)."""
    try:
        with open(old_path, encoding="utf-8") as fh:
            old = json.load(fh)
    except (IOError, OSError):
        return [], [], [], {}, {}

    old_by_id = {r["id"]: r for r in old}
    new_by_id = {r["id"]: r for r in rows}

    added = sorted(set(new_by_id) - set(old_by_id))
    dropped = sorted(set(old_by_id) - set(new_by_id))
    changed = sorted(
        rid for rid in set(old_by_id) & set(new_by_id) if old_by_id[rid] != new_by_id[rid]
    )
    return added, dropped, changed, old_by_id, new_by_id


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source",
        default=None,
        help="Export races.json da usare (default: backup piu' recente in backups_history/).",
    )
    parser.add_argument(
        "--out",
        default=os.path.join(REPO, "app", "src", "races_full.json"),
        help="File JSON di destinazione.",
    )
    parser.add_argument(
        "--force-removed",
        nargs="*",
        default=[],
        metavar="ID_EVENTO",
        help="Eventi FITRI da marcare is_removed=true (es. 4100).",
    )
    parser.add_argument("--dry-run", action="store_true", help="Non scrive il file.")
    args = parser.parse_args()

    source = args.source or latest_backup(os.path.join(REPO, "backups_history"))
    rows, skipped, forced = build(source, set(args.force_removed))

    added, dropped, changed, old_by_id, new_by_id = diff(args.out, rows)
    print("Sorgente           : %s" % os.path.relpath(source, REPO))
    print("Gare generate      : %d (scartate %d righe senza progressivo)" % (len(rows), skipped))
    print("Eventi force-removed: %s" % (", ".join(forced) if forced else "-"))
    if old_by_id:
        print("Aggiunte           : %d" % len(added))
        print("Rimosse            : %d" % len(dropped))
        touched_fields = Counter(
            field
            for rid in changed
            for field in FIELDS
            if old_by_id[rid][field] != new_by_id[rid][field]
        )
        print("Modificate         : %d (%s)" % (
            len(changed),
            ", ".join("%s=%d" % (k, v) for k, v in sorted(touched_fields.items())) or "-",
        ))
    else:
        print("Catalogo           : non esistente, verra' creato")
    print("Totale is_removed  : %d" % sum(1 for r in rows if r["is_removed"]))
    print("Tipi               : %s" % dict(Counter(r["type"] for r in rows)))
    print("Range date         : %s -> %s" % (min(r["date"] for r in rows), max(r["date"] for r in rows)))

    if args.dry_run:
        print("\n--dry-run: nessuna scrittura.")
        return

    if len({r["id"] for r in rows}) != len(rows):
        sys.exit("Abortito: id duplicati nel catalogo generato.")

    with open(args.out, "w", encoding="utf-8") as fh:
        fh.write(json.dumps(rows, indent=2, ensure_ascii=False))

    print("\nScritto: %s (%d record)" % (os.path.relpath(args.out, REPO), len(rows)))


if __name__ == "__main__":
    main()
