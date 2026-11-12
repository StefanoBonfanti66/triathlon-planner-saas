# Archivio allenamenti MTT

Base storica degli allenamenti del Milano Triathlon Team, usata come riferimento ("memoria" del club) per generare e validare gli allenamenti settimanali. Contesto: [mtt-allenamenti-come-funzionano.md](../mtt-allenamenti-come-funzionano.md).

## Stato

**Catalogato il 12/11/2026.** Luca Bacci ha condiviso la cartella Google Drive `Allenamenti` (non `MTT – Allenamenti storici`: il nome reale è più corto). Contenuto al momento della catalogazione: **297 file** — 276 docx, 20 pdf, 1 xlsx; anni 2016–2026.

- **2 schede normalizzate** (novembre 2026 di riferimento e novembre 2024 con la regola di struttura).
- **119 file senza testo estraibile** (docx/pdf con scansione o immagine): servono OCR prima della normalizzazione.
- **17 file senza anno o mese nel nome**: da verificare con Luca.
- I file del 2016–2023 sono quasi tutti **soli allenamenti di nuoto**; dal 2023-12 compaiono i piani settimanali multi-disciplina (`allenamento nuoto bici corsa AAAA MM N`).
- Il `manifest.csv` è generato da `tools/build_allenamenti_manifest.py` (vedi sotto), non va compilato a mano.

## Struttura

```
allenamenti-archivio/
├── README.md            # questo file: convenzioni e flusso
├── manifest.csv         # indice unico di tutti i file
├── raw/                 # file originali di Luca (NON committati, vedi .gitignore)
└── normalizzato/        # file .md pronti per il LLM e il fallback statico
    └── _TEMPLATE.md     # modello di scheda normalizzata
```

- **`raw/`** è solo una copia di lavoro locale. La fonte primaria dei file originali resta la cartella Google Drive condivisa `Allenamenti` (condivisa da Luca Bacci). I binari non vanno in git.
- **`normalizzato/`** è ciò che leggono l'Edge Function e gli admin: testo pulito, struttura fissa.

## Convenzione di naming (file normalizzati)

```
AAAA-MM_<fase>_<disciplina>_<NN>.md
```

- `AAAA-MM`: anno e mese dell'allenamento (es. `2025-11`)
- `<fase>`: `base` | `build` | `peak` | `transition`
- `<disciplina>`: `nuoto` | `bici` | `corsa` | `palestra` | `misto`
- `<NN>`: progressivo a due cifre se nello stesso mese/fase/disciplina ci sono più sedute

Esempi: `2025-11_base_nuoto_01.md`, `2025-11_base_palestra_01.md`, `2025-12_base_misto_01.md`.

## `manifest.csv` — colonne

| Colonna | Significato |
|---|---|
| `id` | identificativo univoco, slug: `AAAA-MM_<fase>_<disciplina>_<NN>`; `ND` al posto dell'anno se non è ricavabile dal nome |
| `anno` | anno dell'allenamento |
| `mese` | mese `01`–`12` |
| `fase` | `base` / `build` / `peak` / `transition` (dedotta dal mese, da verificare in normalizzazione) |
| `disciplina` | `nuoto` / `bici` / `corsa` / `palestra` / `misto` |
| `periodo` | settimana o data se nota (es. `sett. 3`, `2025-11-18`) |
| `file_originale` | nome del file caricato da Luca |
| `formato` | `docx` / `pdf` / `xlsx` / `jpg` / `txt` / altro |
| `link_drive` | link al file nella cartella Drive condivisa |
| `file_normalizzato` | percorso relativo in `normalizzato/` (vuoto finché non normalizzato) |
| `stato` | `da_normalizzare` / `normalizzato` / `verificato` |
| `note` | ambiguità, riferimenti, cosa manca |

Esempio di riga (da non incollare nel manifest reale):

```csv
id,anno,mese,fase,disciplina,periodo,file_originale,formato,link_drive,file_normalizzato,stato,note
2025-11_base_nuoto_01,2025,11,base,nuoto,sett. 2,Allenamenti novembre 2025.docx,docx,https://drive.google.com/...,normalizzato/2025-11_base_nuoto_01.md,da_normalizzare,"volume 2300-2500m, blocchi tecnica"
```

## Rigenerare il manifest

```bash
# 1. copia locale dei binari (gitignored)
rclone copy "gdrive:Allenamenti" docs/project/allenamenti-archivio/raw/ --drive-shared-with-me

# 2. catalogo + link Drive
rclone lsjson "gdrive:Allenamenti" --drive-shared-with-me > /tmp/mtt_lsjson.json
python3 tools/build_allenamenti_manifest.py --drive-ids /tmp/mtt_lsjson.json
```

Lo script ricava anno/mese/disciplina dal nome, segnala le scansioni e i titoli interni incoerenti, e preserva lo stato dei file già normalizzati.

## Flusso di lavoro

1. **Raccolta** — Luca carica i file originali nella cartella Drive condivisa (qualsiasi formato).
2. **Catalogazione** — per ogni file si aggiunge una riga in `manifest.csv` con `stato = da_normalizzare` e il link Drive.
3. **Normalizzazione** — si crea il file `.md` in `normalizzato/` partendo da `_TEMPLATE.md`, si compila `file_normalizzato` e si porta `stato = normalizzato`.
4. **Verifica** — un admin MTT rilegge la scheda normalizzata e porta `stato = verificato`.
5. **Uso** — solo le righe `verificato` entrano nel prompt del LLM e nel fallback statico (step C).
6. **Crescita automatica** — da qui in avanti ogni settimana approvata/inviata (già in `team_workouts`) viene esportata in `normalizzato/` e aggiunta al manifest, così la memoria si aggiorna senza lavoro manuale.

## Privacy

I file possono contenere nomi di atleti o dati personali: restano su Drive e in `raw/` (non committato). Nei file normalizzati si riportano solo i contenuti di allenamento, evitando nomi non necessari.
