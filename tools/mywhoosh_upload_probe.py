"""Probe locale per il flusso MyWhoosh (seduta 1 MTT W44 2026).

Modalita' predefinita: controlli locali, nessuna rete.
Comandi espliciti per login, backup, upload e verifica (eseguibili solo
dopo autorizzazione separata).
Usa solo la libreria standard Python.
"""

from __future__ import annotations

import argparse
import getpass
import json
import os
import sys
import time
import urllib.error
import urllib.request
import zipfile
import io
from pathlib import Path
from typing import Any

PREVIEW_PATH = Path(__file__).resolve().parent / "preview_seduta1_mywhoosh.json"
ATTEMPTS_DIR = Path(__file__).resolve().parent / "attempts"
ATTEMPT_ID_ARTIFACT = Path(__file__).resolve().parent / ".mywhoosh_attempt_id"

MYWHOOSH_LOGIN_URL = "https://services.mywhoosh.com/http-service/api/login"
MYWHOOSH_UPLOAD_URL = "https://coaching.mywhoosh.com/api/v2/client/custom-workout-upload"
MYWHOOSH_DOWNLOAD_URL = "https://services.mywhoosh.com/http-service/v1/mobile/workout/download"
MYWHOOSH_METADATA_URL_TEMPLATE = "https://coaching.mywhoosh.com/api/v2/client/custom-workout-upload/{whoosh_id}"
MYWHOOSH_WORKOUTS_URL = "https://coaching.mywhoosh.com/api/v2/workout-builder/my-workouts"

REDACTED = "[REDACTED]"


class InMemorySession:
    """Mantiene in memoria solo il token della sessione corrente.
    Non salva nulla su disco.
    """

    def __init__(self) -> None:
        self.access_token: str | None = None
        self.whoosh_id: str | None = None
        self.authenticated: bool = False


def load_preview(path: Path = PREVIEW_PATH) -> dict:
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def validate_structure(payload: dict) -> list[str]:
    errors: list[str] = []

    workouts = payload.get("WorkoutsData", [])
    if not isinstance(workouts, list) or len(workouts) != 1:
        errors.append(f"Expected exactly 1 workout in WorkoutsData, found {len(workouts)}")
        return errors

    workout = workouts[0]
    steps = workout.get("WorkoutStepsArray", [])
    if len(steps) != 4:
        errors.append(f"Expected exactly 4 steps, found {len(steps)}")

    declared_time = workout.get("Time")
    calculated_time = sum(s.get("Time", 0) for s in steps)
    if declared_time != 2520:
        errors.append(f"Declared Time is {declared_time}, expected 2520")
    if calculated_time != 2520:
        errors.append(f"Calculated step time sum is {calculated_time}, expected 2520")

    declared_times = [s.get("Time") for s in steps]
    expected_times = [300, 120, 1800, 300]
    if declared_times != expected_times:
        errors.append(f"Step durations are {declared_times}, expected {expected_times}")

    for s in steps:
        if s.get("StepType") != "E_FreeRide":
            errors.append(f"Step {s.get('Id')} is not E_FreeRide: {s.get('StepType')}")
        if s.get("Power") != 0 or s.get("StartPower") != 0 or s.get("EndPower") != 0:
            errors.append(f"Step {s.get('Id')} has non-zero power fields")
        if s.get("Rpm") != 0:
            errors.append(f"Step {s.get('Id')} has non-zero Rpm: {s.get('Rpm')}")
        msgs = s.get("WorkoutMessage", [])
        if len(msgs) != 1 or msgs[0].get("Time") != 0:
            errors.append(f"Step {s.get('Id')} missing WorkoutMessage at Time 0")

    description = workout.get("Description", "")
    if "sopra 80 rpm" in description.lower():
        errors.append("Description contains 'sopra 80 rpm' which belongs only to seduta 2")

    if workout.get("FTPMultiplier") != 0:
        errors.append(f"FTPMultiplier is {workout.get('FTPMultiplier')}, expected 0")
    if workout.get("FTPMode") != "E_NoFTP":
        errors.append(f"FTPMode is {workout.get('FTPMode')}, expected E_NoFTP")

    return errors


def mask_user_id(user_id: str | None) -> str:
    if not user_id or user_id == "USER_ID_PLACEHOLDER":
        return "[OSCURATO]"
    return f"{user_id[:4]}...{user_id[-4:]}" if len(user_id) > 8 else "[OSCURATO]"


def mask_token(token: str | None) -> str:
    if not token:
        return "[ASSENTE]"
    return f"{token[:4]}...{token[-4:]}" if len(token) > 8 else "[OSCURATO]"


def read_password_interactive() -> str:
    return getpass.getpass("Password MyWhoosh (non verrà mostrata): ")


def get_credentials() -> tuple[str, str]:
    """Legge credenziali da ambiente o input interattivo nascosto.
    Non accetta password come argomento CLI.
    """
    username = os.environ.get("MYWHOOSH_USERNAME", "")
    password = os.environ.get("MYWHOOSH_PASSWORD", "")

    if not username:
        username = input("Username MyWhoosh: ").strip()
    if not password:
        password = read_password_interactive()

    return username, password


def redact_error_body(raw: bytes, content_type: str) -> str:
    """Redige il corpo di una risposta di errore HTTP per la stampa diagnostica.

    Non stampa mai password, token, Authorization, cookie o URL prefirmati completi.
    Limita l'output a 2000 caratteri.
    """
    if not raw:
        return "<corpo vuoto>"

    try:
        text = raw.decode("utf-8", errors="replace")
    except Exception:
        return "<corpo non decodificabile>"

    # Redige pattern sensibili generici
    import re

    text = re.sub(r"Authorization\s*[:=]\s*\S+", "Authorization: [REDACTED]", text, flags=re.IGNORECASE)
    text = re.sub(r"password\s*[:=]\s*[^,}\s]+", "password: [REDACTED]", text, flags=re.IGNORECASE)
    text = re.sub(r"token\s*[:=]\s*[^,}\s]+", "token: [REDACTED]", text, flags=re.IGNORECASE)
    text = re.sub(r"cookie\s*[:=]\s*[^,}\s;]+", "cookie: [REDACTED]", text, flags=re.IGNORECASE)
    text = re.sub(
        r"https?://[^\"'\\s]+\.s3\.[a-z0-9-]+\.amazonaws\.com[^\"'\\s]*",
        "[URL_S3_REDACTED]",
        text,
    )

    return text[:2000]


def http_post_json(url: str, data: dict, token: str | None = None, timeout: int = 60) -> dict:
    """Esegue un POST JSON. Restituisce dizionario con esito.
    Non stampa mai body completo, token o URL prefirmati.
    """
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")

    start = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            text = resp.read().decode("utf-8")
            duration = time.monotonic() - start
            return {
                "http_status": resp.status,
                "content_type": resp.headers.get("content-type", ""),
                "duration_ms": round(duration * 1000),
                "body_len": len(text),
                "raw": text,
                "error": None,
            }
    except urllib.error.HTTPError as e:
        duration = time.monotonic() - start
        text = e.read().decode("utf-8", errors="replace")
        return {
            "http_status": e.code,
            "content_type": "",
            "duration_ms": round(duration * 1000),
            "body_len": len(text),
            "raw": text,
            "error": f"HTTP {e.code}",
        }
    except urllib.error.URLError as e:
        duration = time.monotonic() - start
        return {
            "http_status": 0,
            "content_type": "",
            "duration_ms": round(duration * 1000),
            "body_len": 0,
            "raw": "",
            "error": f"Errore di trasporto: {e.reason}",
        }
    except Exception as e:  # noqa: BLE001
        duration = time.monotonic() - start
        return {
            "http_status": 0,
            "content_type": "",
            "duration_ms": round(duration * 1000),
            "body_len": 0,
            "raw": "",
            "error": f"Errore imprevisto: {e}",
        }


def http_get(url: str, token: str | None = None, timeout: int = 60) -> dict:
    """Esegue un GET. Restituisce dizionario con esito."""
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(url, headers=headers, method="GET")

    start = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = resp.read()
            duration = time.monotonic() - start
            return {
                "http_status": resp.status,
                "content_type": resp.headers.get("content-type", ""),
                "duration_ms": round(duration * 1000),
                "body_len": len(data),
                "raw": data,
                "error": None,
            }
    except urllib.error.HTTPError as e:
        duration = time.monotonic() - start
        error_body = b""
        try:
            error_body = e.read()
        except Exception:
            error_body = b""
        content_type = e.headers.get("content-type", "") if hasattr(e, "headers") else ""
        request_id = e.headers.get("x-request-id", "") if hasattr(e, "headers") else ""
        return {
            "http_status": e.code,
            "content_type": content_type,
            "duration_ms": round(duration * 1000),
            "body_len": len(error_body),
            "raw": error_body,
            "error": f"HTTP {e.code}",
            "request_id": request_id,
        }
    except urllib.error.URLError as e:
        duration = time.monotonic() - start
        return {
            "http_status": 0,
            "content_type": "",
            "duration_ms": round(duration * 1000),
            "body_len": 0,
            "raw": b"",
            "error": f"Errore di trasporto: {e.reason}",
        }
    except Exception as e:  # noqa: BLE001
        duration = time.monotonic() - start
        return {
            "http_status": 0,
            "content_type": "",
            "duration_ms": round(duration * 1000),
            "body_len": 0,
            "raw": b"",
            "error": f"Errore imprevisto: {e}",
        }


def mywhoosh_login(session: InMemorySession) -> dict[str, Any]:
    """Esegue il login a MyWhoosh.
    Mantiene token e WhooshId solo in memoria (session), non su disco.
    Non stampa mai password, AccessToken o RefreshToken per intero.
    """
    username, password = get_credentials()

    body = {
        "Username": username,
        "Password": password,
        "Platform": "Android",
        "Action": 1001,
        "CorrelationId": os.urandom(16).hex(),
        "DeviceId": os.urandom(16).hex(),
        "Authorization": "",
    }

    result = http_post_json(MYWHOOSH_LOGIN_URL, body)

    if result["error"]:
        return {
            "ok": False,
            "error": result["error"],
            "http_status": result["http_status"],
        }

    try:
        parsed = json.loads(result["raw"])
    except json.JSONDecodeError:
        return {
            "ok": False,
            "error": "Risposta login non JSON",
            "http_status": result["http_status"],
        }

    if not parsed.get("Success"):
        return {
            "ok": False,
            "error": parsed.get("Message", "Login fallito"),
            "http_status": result["http_status"],
        }

    access_token = parsed.get("AccessToken")
    whoosh_id = parsed.get("WhooshId")

    if not access_token or not whoosh_id:
        return {
            "ok": False,
            "error": "Login senza AccessToken o WhooshId",
            "http_status": result["http_status"],
        }

    session.access_token = access_token
    session.whoosh_id = whoosh_id
    session.authenticated = True

    return {
        "ok": True,
        "whoosh_id": whoosh_id,
        "message": parsed.get("Message", "Login effettuato"),
        "http_status": result["http_status"],
    }


def prepare_definitive_payload(
    preview: dict,
    user_id: str,
    attempt_id_file: Path = ATTEMPT_ID_ARTIFACT,
) -> tuple[dict, str]:
    """Crea il payload definitivo con ID tentativo.
    Genera o riusa l'ID dal file artefatto. Non sovrascrive silently un
    payload diverso già presente.
    """
    if attempt_id_file.exists():
        attempt_id = attempt_id_file.read_text(encoding="utf-8").strip()
    else:
        attempt_id = str(abs(hash((user_id, preview["WorkoutsData"][0]["Name"]))) % 10_000_000_000)
        attempt_id_file.write_text(attempt_id, encoding="utf-8")

    definitive = json.loads(json.dumps(preview))
    definitive["UserId"] = user_id
    workout = definitive["WorkoutsData"][0]
    workout["Id"] = attempt_id
    workout["Name"] = "MTT TEST W44 2026 - Uscita libera 42min"

    return definitive, attempt_id


def save_attempt_artifact(
    attempt_id: str,
    user_id: str,
    payload: dict,
    attempts_dir: Path = ATTEMPTS_DIR,
) -> Path:
    """Salva il JSON del tentativo separato dall'anteprima.
    Conserva ID, nome, payload, stato. Non salva token né password.
    """
    attempts_dir.mkdir(parents=True, exist_ok=True)
    artifact = {
        "attempt_id": attempt_id,
        "user_id_masked": mask_user_id(user_id),
        "workout_name": payload["WorkoutsData"][0]["Name"],
        "workout_id": payload["WorkoutsData"][0]["Id"],
        "step_count": len(payload["WorkoutsData"][0]["WorkoutStepsArray"]),
        "total_time": payload["WorkoutsData"][0]["Time"],
        "payload": payload,
        "status": "preparato",
        "created_at": time.time(),
    }

    file_path = attempts_dir / f"attempt_{attempt_id}.json"
    counter = 1
    while file_path.exists():
        file_path = attempts_dir / f"attempt_{attempt_id}_{counter}.json"
        counter += 1

    with file_path.open("w", encoding="utf-8") as fh:
        json.dump(artifact, fh, indent=2, ensure_ascii=False)

    return file_path


def interactive_confirm(prompt: str) -> bool:
    """Chiede conferma esplicita interattiva."""
    answer = input(f"{prompt} [s/N]: ").strip().lower()
    return answer in ("s", "si", "sì", "y", "yes")


def cmd_local_checks() -> int:
    """Controlli locali senza rete e senza credenziali."""
    preview = load_preview()
    errors = validate_structure(preview)

    print("=== MyWhoosh Upload Probe (seduta 1) ===")
    print("Modalita': controlli locali (no rete, no credenziali)")
    print(f"File anteprima: {PREVIEW_PATH}")
    print()

    if errors:
        print("ERRORI DI VALIDAZIONE:")
        for e in errors:
            print(f"  - {e}")
        print()
        return 1

    print("Controlli locali superati:")
    print("  - JSON sintassi: OK")
    print("  - Esattamente 1 workout in WorkoutsData: OK")
    print("  - 4 step: OK")
    print("  - Durate step [300, 120, 1800, 300]: OK")
    print("  - Time totale 2520 s: OK")
    print("  - Tutti gli step E_FreeRide, Power/StartPower/EndPower/Rpm a zero: OK")
    print("  - WorkoutMessage con Time:0 in ogni step: OK")
    print("  - Assenza 'sopra 80 rpm' nella prima seduta: OK")
    print("  - Assenza target FTP inventati: OK")
    print()

    print("Pronto per preparazione definitiva.")
    print("Usa: MYWHOOSH_WHOOSH_ID=<id> python3 tools/mywhoosh_upload_probe.py --prepare")
    print()
    return 0


def cmd_prepare(user_id: str) -> int:
    """Prepara il payload definitivo e salva l'artefatto JSON."""
    preview = load_preview()
    errors = validate_structure(preview)
    if errors:
        print("ERRORI DI VALIDAZIONE:")
        for e in errors:
            print(f"  - {e}")
        return 1

    definitive, attempt_id = prepare_definitive_payload(preview, user_id)
    artifact_path = save_attempt_artifact(attempt_id, user_id, definitive)

    workout = definitive["WorkoutsData"][0]
    steps = workout["WorkoutStepsArray"]
    declared_times = [s["Time"] for s in steps]

    print("=== Payload definitivo preparato (non inviato) ===")
    print(f"  ID tentativo: {attempt_id}")
    print(f"  UserId: {mask_user_id(user_id)}")
    print(f"  Nome workout: {workout['Name']}")
    print(f"  StepCount: {len(steps)}")
    print(f"  Durate step: {declared_times}")
    print(f"  Time totale: {workout['Time']} s")
    print(f"  File artefatto: {artifact_path}")
    print()
    print("Stato del tentativo: preparato (nessun invio)")
    print()
    print("Comandi disponibili (solo dopo autorizzazione separata):")
    print("  python3 tools/mywhoosh_upload_probe.py --login")
    print("  python3 tools/mywhoosh_upload_probe.py --backup")
    print("  python3 tools/mywhoosh_upload_probe.py --upload")
    print("  python3 tools/mywhoosh_upload_probe.py --verify")
    print()
    return 0


def cmd_login() -> int:
    """Esegue il login e mantiene il token in memoria (sessione corrente).
    Non salva nulla su disco. Non stampa token completi.
    """
    session = InMemorySession()
    result = mywhoosh_login(session)

    print("=== Login MyWhoosh ===")
    if not result["ok"]:
        print(f"Esito: fallito")
        print(f"Errore: {result['error']}")
        print(f"HTTP status: {result.get('http_status')}")
        print()
        print("Il token non e' stato conservato.")
        return 1

    print(f"Esito: riuscito")
    print(f"WhooshId: {result['whoosh_id']}")
    print(f"Messaggio: {result.get('message', '')}")
    print(f"HTTP status: {result.get('http_status')}")
    print()
    print("Token mantenuto solo in memoria per questa esecuzione.")
    print("Non e' stato salvato su disco.")
    print()
    return 0


def cmd_backup(output_dir: Path | None = None) -> int:
    """Backup remoto in sola lettura (quando autorizzato).
    Login, GET workout-builder/my-workouts, salvataggio JSON, nessun upload.
    Se output_dir e' fornito, salva in quella directory (test); altrimenti
    usa tools/backups/ (uso operativo invariato).
    """
    session = InMemorySession()

    # Fase 1: Login
    print("=== Backup remoto (sola lettura) ===")
    print("Fase 1: Login MyWhoosh")
    login_result = mywhoosh_login(session)
    if not login_result["ok"]:
        print(f"Login fallito: {login_result['error']}")
        print(f"HTTP status: {login_result.get('http_status')}")
        return 1

    print(f"Login riuscito")
    print(f"WhooshId: {mask_user_id(session.whoosh_id)}")
    print()

    # Fase 2: Richiesta elenco workout (endpoint osservato nel Workout Builder)
    workouts_url = MYWHOOSH_WORKOUTS_URL

    print("Fase 2: Richiesta elenco workout")
    print(f"Endpoint: coaching.mywhoosh.com/api/v2/workout-builder/my-workouts")
    print()

    workouts_result = http_get(workouts_url, token=session.access_token)

    if workouts_result["error"]:
        print(f"Esito: errore")
        print(f"Fase: richiesta elenco workout")
        print(f"Metodo: GET")
        print(f"Host/path: coaching.mywhoosh.com/api/v2/workout-builder/my-workouts")
        print(f"HTTP status: {workouts_result['http_status']}")
        print(f"Content-Type: {workouts_result.get('content_type', '')}")
        rid = workouts_result.get("request_id") or ""
        if rid:
            print(f"Request-ID: {rid}")
        print(f"Corpo risposta (redatto, max 2000 char):")
        print(redact_error_body(workouts_result.get("raw", b""), workouts_result.get("content_type", "")))
        print()
        print("Non e' stato possibile recuperare l'elenco workout.")
        print("Non presumere che la raccolta sia vuota.")
        return 1

    print(f"Esito: HTTP {workouts_result['http_status']}")
    print()

    # Parsing JSON
    try:
        parsed = json.loads(workouts_result["raw"])
    except json.JSONDecodeError:
        print("Risposta non JSON leggibile.")
        print("Numero di elementi: non determinabile")
        return 1

    if not isinstance(parsed, dict):
        print("Struttura risposta inaspettata: oggetto JSON atteso.")
        print("Numero di elementi: non determinabile")
        return 1

    status = parsed.get("status")
    data = parsed.get("data")

    if status is not True:
        print(f"Risposta applicativa non valida: status={status}")
        print("Numero di elementi: non determinabile")
        return 1

    if not isinstance(data, list):
        print(f"Il campo 'data' non e' un array (tipo: {type(data).__name__}).")
        print("Numero di elementi: non determinabile")
        return 1

    workout_count = len(data)
    print(f"Numero di elementi in data: {workout_count}")
    print()

    # Mostra per ciascun elemento soltanto WorkoutId, Name, SportsModeType
    for item in data:
        if isinstance(item, dict):
            wid = item.get("WorkoutId", "")
            name = item.get("Name", "")
            smt = item.get("SportsModeType", "")
            print(f"  WorkoutId={wid} | Name={name} | SportsModeType={smt}")
    print()

    # Salvataggio locale senza sovrascrivere
    if output_dir is None:
        backup_dir = Path(__file__).resolve().parent / "backups"
    else:
        backup_dir = output_dir
    backup_dir.mkdir(parents=True, exist_ok=True)
    stamp = time.strftime("%Y%m%d_%H%M%S")
    base_name = f"backup_myworkouts_{stamp}"
    backup_path = backup_dir / f"{base_name}.json"
    counter = 1
    while backup_path.exists():
        backup_path = backup_dir / f"{base_name}_{counter}.json"
        counter += 1

    whoosh_id = session.whoosh_id
    account_masked = mask_user_id(whoosh_id) if whoosh_id else "[NON DISPONIBILE]"

    backup_content = {
        "saved_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "account_masked": account_masked,
        "workout_count": workout_count,
        "response": parsed,
    }

    with backup_path.open("w", encoding="utf-8") as fh:
        json.dump(backup_content, fh, indent=2, ensure_ascii=False)

    print(f"Backup salvato: {backup_path}")
    print(f"Account: {account_masked}")
    print(f"Elementi salvati: {workout_count}")
    print()
    print("Nessun upload eseguito.")
    return 0


def cmd_upload() -> int:
    """Upload isolato (quando autorizzato).
    Login, conferma interattiva, singolo POST, nessun retry.
    """
    session = InMemorySession()
    login_result = mywhoosh_login(session)
    if not login_result["ok"]:
        print(f"Login fallito: {login_result['error']}")
        return 1

    whoosh_id = session.whoosh_id

    # Carica l'ultimo artefatto di tentativo
    attempts_dir = ATTEMPTS_DIR
    if not attempts_dir.exists():
        print("Nessun artefatto di tentativo trovato. Esegui prima --prepare.")
        return 1

    artifacts = sorted(attempts_dir.glob("attempt_*.json"))
    if not artifacts:
        print("Nessun artefatto di tentativo trovato. Esegui prima --prepare.")
        return 1

    latest = artifacts[-1]
    with latest.open("r", encoding="utf-8") as fh:
        artifact = json.load(fh)

    attempt_id = artifact["attempt_id"]
    payload = artifact["payload"]
    workout = payload["WorkoutsData"][0]

    print("=== Upload isolato (singolo POST) ===")
    print(f"ID tentativo: {attempt_id}")
    print(f"WhooshId: {whoosh_id}")
    print(f"Nome workout: {workout['Name']}")
    print(f"ID workout: {workout['Id']}")
    print(f"StepCount: {len(workout['WorkoutStepsArray'])}")
    print(f"Time totale: {workout['Time']} s")
    print(f"UserId: {mask_user_id(payload.get('UserId'))}")
    print()

    if not interactive_confirm("Confermi l'invio di questo singolo workout?"):
        print("Invio annullato dall'utente.")
        return 0

    # Registra stato "invio iniziato" prima del POST
    artifact["status"] = "invio iniziato"
    artifact["submitted_at"] = time.time()
    with latest.open("w", encoding="utf-8") as fh:
        json.dump(artifact, fh, indent=2, ensure_ascii=False)

    print("Stato tentativo: invio iniziato")
    print()

    result = http_post_json(MYWHOOSH_UPLOAD_URL, payload, token=session.access_token)

    print(f"Esito HTTP: {result['http_status']}")
    if result["error"]:
        print(f"Errore: {result['error']}")
        print()
        print("Esito remoto incerto: verificare prima di reinviare.")
        print("Nessun retry automatico eseguito.")
        artifact["status"] = "remoto incerto"
        artifact["upload_error"] = result["error"]
        artifact["upload_http_status"] = result["http_status"]
        with latest.open("w", encoding="utf-8") as fh:
            json.dump(artifact, fh, indent=2, ensure_ascii=False)
        return 1

    try:
        parsed = json.loads(result["raw"])
    except json.JSONDecodeError:
        print("Risposta non JSON: esito remoto non confermato.")
        print("Nessun retry automatico eseguito.")
        artifact["status"] = "remoto incerto"
        artifact["upload_error"] = "risposta non JSON"
        artifact["upload_http_status"] = result["http_status"]
        with latest.open("w", encoding="utf-8") as fh:
            json.dump(artifact, fh, indent=2, ensure_ascii=False)
        return 1

    is_accepted = parsed.get("message") == "Custom workout is being uploaded."
    if is_accepted:
        print("Risposta applicativa: upload accettato.")
        artifact["status"] = "inviato"
        artifact["upload_http_status"] = result["http_status"]
        artifact["upload_response"] = {"message": parsed.get("message"), "display": parsed.get("display")}
        with latest.open("w", encoding="utf-8") as fh:
            json.dump(artifact, fh, indent=2, ensure_ascii=False)
        print("Presenza remota: NON verificata (richiede passo --verify).")
    else:
        print("Risposta applicativa inattesa: esito remoto non confermato.")
        print("Nessun retry automatico eseguito.")
        artifact["status"] = "remoto incerto"
        artifact["upload_error"] = "risposta inattesa"
        artifact["upload_http_status"] = result["http_status"]
        with latest.open("w", encoding="utf-8") as fh:
            json.dump(artifact, fh, indent=2, ensure_ascii=False)
        return 1

    print()
    print("Nessun secondo POST eseguito per questo tentativo.")
    return 0


def cmd_verify() -> int:
    """Verifica remota (quando autorizzata).
    Login, GET ZIP, cerca l'ID del tentativo. Nessun POST.
    """
    session = InMemorySession()
    login_result = mywhoosh_login(session)
    if not login_result["ok"]:
        print(f"Login fallito: {login_result['error']}")
        return 1

    whoosh_id = session.whoosh_id

    # Carica l'ultimo artefatto
    attempts_dir = ATTEMPTS_DIR
    if not attempts_dir.exists():
        print("Nessun artefatto di tentativo trovato.")
        return 1

    artifacts = sorted(attempts_dir.glob("attempt_*.json"))
    if not artifacts:
        print("Nessun artefatto di tentativo trovato.")
        return 1

    latest = artifacts[-1]
    with latest.open("r", encoding="utf-8") as fh:
        artifact = json.load(fh)

    attempt_id = artifact["attempt_id"]

    print("=== Verifica remota (nessun POST) ===")
    print(f"ID tentativo: {attempt_id}")
    print(f"WhooshId: {whoosh_id}")
    print()

    result = http_get(f"{MYWHOOSH_DOWNLOAD_URL}?whooshPlayerId={whoosh_id}", token=session.access_token)

    if result["error"]:
        print(f"Esito: errore")
        print(f"Dettaglio: {result['error']}")
        print(f"HTTP status: {result.get('http_status')}")
        return 1

    found_in_zip = False
    try:
        with zipfile.ZipFile(io.BytesIO(result["raw"])) as zf:
            for name in zf.namelist():
                if not name.lower().endswith(".json"):
                    continue
                try:
                    with zf.open(name) as fh:
                        data = fh.read(200_000)
                        content = json.loads(data)
                    # Cerca l'ID del tentativo nei campi Id o WorkoutsData[].Id
                    if isinstance(content, dict):
                        if content.get("Id") == attempt_id:
                            found_in_zip = True
                            break
                        wd = content.get("WorkoutsData", [])
                        if isinstance(wd, list) and len(wd) > 0:
                            if wd[0].get("Id") == attempt_id:
                                found_in_zip = True
                                break
                except Exception:
                    continue
    except zipfile.BadZipFile:
        print("Il corpo della risposta non e' uno ZIP valido.")
        return 1

    print(f"Richiesta GET: HTTP {result['http_status']}")
    print(f"ID tentativo trovato nello ZIP: {'Sì' if found_in_zip else 'No'}")
    print()

    if found_in_zip:
        print("Stato: workout presente nello ZIP remoto.")
        print("Comportamento nel gioco: ancora da verificare (richiede accesso all'app MyWhoosh).")
    else:
        print("Stato: ID non trovato nello ZIP.")
        print("Possibile causa: upload non completato o ID diverso.")

    print()
    print("Nessun POST eseguito durante la verifica.")
    return 0


def test_metadata_http500() -> None:
    """Test locale: diagnostica errore HTTP 500 sulla richiesta metadati.

    Usa unittest.mock per simulare una risposta HTTP 500 con corpo JSON di errore.
    Non effettua alcuna richiesta di rete reale.
    """
    import io
    from unittest.mock import patch, MagicMock
    from urllib.error import HTTPError

    error_body = (
        '{"error": "Internal Server Error", "message": "qualcosa è andato storto", "code": 500}'
    ).encode("utf-8")
    headers = {"content-type": "application/json", "x-request-id": "req-abc123-def456"}

    # Simula HTTPError sollevato da urllib per status >= 400
    fp = io.BytesIO(error_body)
    http_error = HTTPError(
        url="https://coaching.mywhoosh.com/api/v2/client/custom-workout-upload/abc123def",
        code=500,
        msg="Internal Server Error",
        hdrs=headers,
        fp=fp,
    )

    with patch("urllib.request.urlopen", side_effect=http_error):
        result = http_get("https://coaching.mywhoosh.com/api/v2/client/custom-workout-upload/abc123def", token="faketoken")

    print("=== Test locale: diagnostica HTTP 500 metadati ===")
    print(f"http_status: {result['http_status']}")
    print(f"content_type: {result['content_type']}")
    print(f"request_id: {result.get('request_id', '')}")
    print(f"error: {result['error']}")
    print(f"body_len: {result['body_len']}")
    print()
    print("Corpo redatto:")
    print(redact_error_body(result.get("raw", b""), result.get("content_type", "")))
    print()

    # Assertion
    assert result["http_status"] == 500, f"atteso 500, ottenuto {result['http_status']}"
    assert result["content_type"] == "application/json"
    assert result.get("request_id") == "req-abc123-def456"
    assert "Internal Server Error" in redact_error_body(result.get("raw", b""), result.get("content_type", ""))
    assert "qualcosa è andato storto" in redact_error_body(result.get("raw", b""), result.get("content_type", ""))
    assert "Authorization" not in redact_error_body(result.get("raw", b""), result.get("content_type", ""))
    assert "Password" not in redact_error_body(result.get("raw", b""), result.get("content_type", ""))
    assert "s3.amazonaws.com" not in redact_error_body(result.get("raw", b""), result.get("content_type", ""))

    print("Test HTTP 500: PASS")


def _mock_login_set_session(session: InMemorySession) -> dict:
    """Mock di mywhoosh_login: imposta attributi sulla sessione passata."""
    session.access_token = "fake_access_token"
    session.whoosh_id = "abc123def456"
    session.authenticated = True
    return {
        "ok": True,
        "whoosh_id": "abc123def456",
        "message": "Login effettuato",
        "http_status": 200,
    }


def _make_http_get_ok(payload: dict, status_code: int = 200) -> dict:
    raw = json.dumps(payload).encode("utf-8")
    return {
        "http_status": status_code,
        "content_type": "application/json",
        "duration_ms": 100,
        "body_len": len(raw),
        "raw": raw,
        "error": None,
    }


def _make_http_get_error(code: int, body: str = '{"error":"test"}') -> dict:
    import io
    from urllib.error import HTTPError

    error_body = body.encode("utf-8")
    headers = {"content-type": "application/json", "x-request-id": f"req-{code}"}
    fp = io.BytesIO(error_body)
    http_error = HTTPError(
        url="https://coaching.mywhoosh.com/api/v2/workout-builder/my-workouts",
        code=code,
        msg="Error",
        hdrs=headers,
        fp=fp,
    )
    return {
        "http_status": code,
        "content_type": headers["content-type"],
        "duration_ms": 100,
        "body_len": len(error_body),
        "raw": error_body,
        "error": f"HTTP {code}",
        "request_id": headers["x-request-id"],
    }


def test_backup_valid_2_workouts() -> None:
    """Test locale: risposta valida con due workout."""
    from unittest.mock import patch
    import tempfile

    payload = {
        "status": True,
        "message": "",
        "display": False,
        "data": [
            {"WorkoutId": "w1", "Name": "Ciclista 45 min", "SportsModeType": 0, "extra": "campo1"},
            {"WorkoutId": "w2", "Name": "Corsa 30 min", "SportsModeType": 1, "extra": "campo2"},
        ],
    }

    with tempfile.TemporaryDirectory() as tmp:
        backup_dir = Path(tmp)
        with patch("__main__.mywhoosh_login", side_effect=_mock_login_set_session), \
             patch("__main__.http_get", return_value=_make_http_get_ok(payload)):
            result = cmd_backup(output_dir=backup_dir)

    assert result == 0, f"atteso 0, ottenuto {result}"
    print("Test backup valido 2 workout: PASS")


def test_backup_empty_data() -> None:
    """Test locale: risposta valida con data: []."""
    from unittest.mock import patch
    import tempfile

    payload = {"status": True, "message": "", "display": False, "data": []}

    with tempfile.TemporaryDirectory() as tmp:
        backup_dir = Path(tmp)
        with patch("__main__.mywhoosh_login", side_effect=_mock_login_set_session), \
             patch("__main__.http_get", return_value=_make_http_get_ok(payload)):
            result = cmd_backup(output_dir=backup_dir)

    assert result == 0
    print("Test backup data vuoto: PASS")


def test_backup_http_401() -> None:
    """Test locale: HTTP 401."""
    from unittest.mock import patch
    import tempfile

    with tempfile.TemporaryDirectory() as tmp:
        backup_dir = Path(tmp)
        with patch("__main__.mywhoosh_login", side_effect=_mock_login_set_session), \
             patch("__main__.http_get", return_value=_make_http_get_error(401)):
            result = cmd_backup(output_dir=backup_dir)

    assert result == 1
    print("Test backup HTTP 401: PASS")


def test_backup_http_403() -> None:
    """Test locale: HTTP 403."""
    from unittest.mock import patch
    import tempfile

    with tempfile.TemporaryDirectory() as tmp:
        backup_dir = Path(tmp)
        with patch("__main__.mywhoosh_login", side_effect=_mock_login_set_session), \
             patch("__main__.http_get", return_value=_make_http_get_error(403)):
            result = cmd_backup(output_dir=backup_dir)

    assert result == 1
    print("Test backup HTTP 403: PASS")


def test_backup_http_500() -> None:
    """Test locale: HTTP 500."""
    from unittest.mock import patch
    import tempfile

    with tempfile.TemporaryDirectory() as tmp:
        backup_dir = Path(tmp)
        with patch("__main__.mywhoosh_login", side_effect=_mock_login_set_session), \
             patch("__main__.http_get", return_value=_make_http_get_error(500)):
            result = cmd_backup(output_dir=backup_dir)

    assert result == 1
    print("Test backup HTTP 500: PASS")


def test_backup_invalid_json() -> None:
    """Test locale: JSON non valido."""
    from unittest.mock import patch
    import tempfile

    raw = "non è json valido".encode("utf-8")
    result_get = {
        "http_status": 200,
        "content_type": "application/json",
        "duration_ms": 100,
        "body_len": len(raw),
        "raw": raw,
        "error": None,
    }

    with tempfile.TemporaryDirectory() as tmp:
        backup_dir = Path(tmp)
        with patch("__main__.mywhoosh_login", side_effect=_mock_login_set_session), \
             patch("__main__.http_get", return_value=result_get):
            result = cmd_backup(output_dir=backup_dir)

    assert result == 1
    print("Test backup JSON non valido: PASS")


def test_backup_status_false() -> None:
    """Test locale: status false."""
    from unittest.mock import patch
    import tempfile

    payload = {"status": False, "message": "errore", "data": [{"WorkoutId": "w1"}]}

    with tempfile.TemporaryDirectory() as tmp:
        backup_dir = Path(tmp)
        with patch("__main__.mywhoosh_login", side_effect=_mock_login_set_session), \
             patch("__main__.http_get", return_value=_make_http_get_ok(payload)):
            result = cmd_backup(output_dir=backup_dir)

    assert result == 1
    print("Test backup status false: PASS")


def test_backup_data_not_array() -> None:
    """Test locale: data non è array."""
    from unittest.mock import patch
    import tempfile

    payload = {"status": True, "data": "non array"}

    with tempfile.TemporaryDirectory() as tmp:
        backup_dir = Path(tmp)
        with patch("__main__.mywhoosh_login", side_effect=_mock_login_set_session), \
             patch("__main__.http_get", return_value=_make_http_get_ok(payload)):
            result = cmd_backup(output_dir=backup_dir)

    assert result == 1
    print("Test backup data non array: PASS")


def test_backup_save_without_overwrite() -> None:
    """Test locale: salvataggio senza sovrascrittura in directory temporanea."""
    from unittest.mock import patch
    import tempfile

    payload = {"status": True, "data": [{"WorkoutId": "w1", "Name": "Test", "SportsModeType": 0}]}

    with tempfile.TemporaryDirectory() as tmp:
        backup_dir = Path(tmp)
        before = sorted(backup_dir.glob("backup_myworkouts_*.json"))

        with patch("__main__.mywhoosh_login", side_effect=_mock_login_set_session), \
             patch("__main__.http_get", return_value=_make_http_get_ok(payload)):
            result = cmd_backup(output_dir=backup_dir)

        assert result == 0

        with patch("__main__.mywhoosh_login", side_effect=_mock_login_set_session), \
             patch("__main__.http_get", return_value=_make_http_get_ok(payload)):
            result = cmd_backup(output_dir=backup_dir)

        assert result == 0

        after = sorted(backup_dir.glob("backup_myworkouts_*.json"))
        assert len(after) > len(before), f"atteso più file, prima={len(before)} dopo={len(after)}"

        # Pulizia gestita da TemporaryDirectory; nessun unlink su file reali
        print("Test backup senza sovrascrittura: PASS")


def test_backup_no_secrets() -> None:
    """Test locale: assenza di token/password nei log e nel backup in directory temporanea."""
    from unittest.mock import patch
    import io
    import tempfile

    payload = {"status": True, "data": [{"WorkoutId": "w1", "Name": "Test", "SportsModeType": 0}]}

    with tempfile.TemporaryDirectory() as tmp:
        backup_dir = Path(tmp)
        captured_output = io.StringIO()

        with patch("sys.stdout", captured_output), \
             patch("__main__.mywhoosh_login", side_effect=_mock_login_set_session), \
             patch("__main__.http_get", return_value=_make_http_get_ok(payload)):
            result = cmd_backup(output_dir=backup_dir)

        assert result == 0
        output = captured_output.getvalue()
        assert "fake_access_token" not in output, "Token trovato nell'output!"
        assert "utente.test@example.com" not in output, "Username di test trovato nell'output!"
        assert "prova.pwd.12345" not in output, "Password di test trovata nell'output!"

        # Limite esplicito: verificare l'assenza di un valore che non compare nell'input
        # non prova che una eventuale redazione sia avvenuta.
        backup_files = sorted(backup_dir.glob("backup_myworkouts_*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
        if backup_files:
            latest = backup_files[0]
            content = latest.read_text(encoding="utf-8")
            assert "fake_access_token" not in content, "Token trovato nel backup!"
            assert "utente.test@example.com" not in content, "Username di test trovato nel backup!"
            assert "prova.pwd.12345" not in content, "Password di test trovata nel backup!"

    print("Test backup senza segreti: PASS")


def test_backup_save_with_sentinel() -> None:
    """Test regressione: sentinella con pattern backup_myworkouts_*.json non viene cancellata."""
    from unittest.mock import patch
    import tempfile

    payload = {"status": True, "data": [{"WorkoutId": "w1", "Name": "Test", "SportsModeType": 0}]}
    sentinel_name = "backup_myworkouts_preexisting.json"
    sentinel_content = "contenuto_sentinella_invariato"

    with tempfile.TemporaryDirectory() as tmp:
        backup_dir = Path(tmp)
        sentinel_path = backup_dir / sentinel_name
        sentinel_path.write_text(sentinel_content, encoding="utf-8")

        # Prima chiamata mocked
        with patch("__main__.mywhoosh_login", side_effect=_mock_login_set_session), \
             patch("__main__.http_get", return_value=_make_http_get_ok(payload)):
            result = cmd_backup(output_dir=backup_dir)

        assert result == 0

        # Seconda chiamata mocked
        with patch("__main__.mywhoosh_login", side_effect=_mock_login_set_session), \
             patch("__main__.http_get", return_value=_make_http_get_ok(payload)):
            result = cmd_backup(output_dir=backup_dir)

        assert result == 0

        # La sentinella deve essere intatta (byte invariati)
        assert sentinel_path.read_text(encoding="utf-8") == sentinel_content, "Sentinella modificata!"

        # Deve esserci la sentinella più esattamente due nuovi backup distinti
        all_files = sorted(backup_dir.glob("backup_myworkouts_*.json"))
        backup_files = [f for f in all_files if f.name != sentinel_name]
        assert len(backup_files) == 2, f"atteso 2 backup distinti, trovato {len(backup_files)}"

    print("Test backup con sentinella preesistente: PASS")


def test_backup_all() -> None:
    """Esegue tutti i test locali del comando --backup."""
    print("=== Test locali: comando --backup ===")
    print()
    test_backup_valid_2_workouts()
    test_backup_empty_data()
    test_backup_http_401()
    test_backup_http_403()
    test_backup_http_500()
    test_backup_invalid_json()
    test_backup_status_false()
    test_backup_data_not_array()
    test_backup_save_without_overwrite()
    test_backup_no_secrets()
    test_backup_save_with_sentinel()
    print()
    print("Tutti i test --backup: PASS")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="MyWhoosh upload probe (seduta 1)")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--local-checks", action="store_true", help="Controlli locali senza rete (default)")
    group.add_argument("--prepare", action="store_true", help="Prepara payload definitivo (richiede MYWHOOSH_WHOOSH_ID)")
    group.add_argument("--login", action="store_true", help="Esegue login MyWhoosh (token in memoria)")
    group.add_argument("--backup", action="store_true", help="Backup remoto in sola lettura (quando autorizzato)")
    group.add_argument("--upload", action="store_true", help="Upload singolo (richiede conferma interattiva)")
    group.add_argument("--verify", action="store_true", help="Verifica remota senza POST (quando autorizzato)")
    group.add_argument("--test-metadata-500", action="store_true", help="Test locale: diagnostica errore HTTP 500 metadati (mock, no rete)")
    group.add_argument("--test-backup", action="store_true", help="Test locali: comando --backup (mock, no rete)")
    args = parser.parse_args(argv)

    if args.local_checks or not any([args.prepare, args.login, args.backup, args.upload, args.verify, args.test_metadata_500, args.test_backup]):
        return cmd_local_checks()

    if args.prepare:
        user_id = os.environ.get("MYWHOOSH_WHOOSH_ID", "")
        if not user_id:
            print("ERRORE: --prepare richiede MYWHOOSH_WHOOSH_ID nelle variabili d'ambiente.")
            print("Non usare argomenti CLI per la password.")
            return 1
        return cmd_prepare(user_id)

    if args.login:
        return cmd_login()

    if args.backup:
        return cmd_backup()

    if args.upload:
        return cmd_upload()

    if args.verify:
        return cmd_verify()

    if args.test_metadata_500:
        test_metadata_http500()
        return 0

    if args.test_backup:
        test_backup_all()
        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
