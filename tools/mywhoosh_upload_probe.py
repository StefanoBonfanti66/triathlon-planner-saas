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


def _is_number(value: object) -> bool:
    """Restituisce True se il valore è un numero (int o float, escluso bool)."""
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def validate_two_ramps(workout: dict) -> list[str]:
    """Valida un workout a due rampe (E_WarmUp + E_CoolDown).
    Vincoli solo per questo caso di prova, non regole generali MyWhoosh.
    Non modifica l'input.
    """
    errors: list[str] = []

    if not isinstance(workout, dict):
        errors.append(f"Workout non è un oggetto: {type(workout).__name__}")
        return errors

    steps = workout.get("WorkoutStepsArray")
    if not isinstance(steps, list):
        errors.append(f"WorkoutStepsArray non è una lista: {type(steps).__name__ if steps is not None else 'None'}")
        return errors

    if len(steps) != 2:
        errors.append(f"Expected exactly 2 steps in WorkoutStepsArray, found {len(steps)}")
        return errors

    warmup = steps[0]
    cooldown = steps[1]

    if not isinstance(warmup, dict):
        errors.append(f"Step 0 non è un oggetto: {type(warmup).__name__}")
    else:
        if warmup.get("StepType") != "E_WarmUp":
            errors.append(f"Step 0 StepType is {warmup.get('StepType')}, expected E_WarmUp")
        if warmup.get("Power") != 0:
            errors.append(f"Step 0 Power is {warmup.get('Power')}, expected 0")
        if warmup.get("StartPower") != 0.25:
            errors.append(f"Step 0 StartPower is {warmup.get('StartPower')}, expected 0.25")
        if warmup.get("EndPower") != 0.75:
            errors.append(f"Step 0 EndPower is {warmup.get('EndPower')}, expected 0.75")
        if not _is_number(warmup.get("Time")) or warmup.get("Time") != 360:
            errors.append(f"Step 0 Time non numerico o diverso da 360: {warmup.get('Time')}")

    if not isinstance(cooldown, dict):
        errors.append(f"Step 1 non è un oggetto: {type(cooldown).__name__}")
    else:
        if cooldown.get("StepType") != "E_CoolDown":
            errors.append(f"Step 1 StepType is {cooldown.get('StepType')}, expected E_CoolDown")
        if cooldown.get("Power") != 0:
            errors.append(f"Step 1 Power is {cooldown.get('Power')}, expected 0")
        if cooldown.get("StartPower") != 0.75:
            errors.append(f"Step 1 StartPower is {cooldown.get('StartPower')}, expected 0.75")
        if cooldown.get("EndPower") != 0.25:
            errors.append(f"Step 1 EndPower is {cooldown.get('EndPower')}, expected 0.25")
        if not _is_number(cooldown.get("Time")) or cooldown.get("Time") != 360:
            errors.append(f"Step 1 Time non numerico o diverso da 360: {cooldown.get('Time')}")

    declared_time = workout.get("Time")
    if not _is_number(declared_time):
        errors.append(f"Time totale non numerico: {declared_time}")
    elif declared_time != 720:
        errors.append(f"Declared Time is {declared_time}, expected 720")

    calculated_time = 0
    calculated_error = False
    for s in steps:
        if isinstance(s, dict) and _is_number(s.get("Time")):
            calculated_time += s["Time"]
        else:
            calculated_error = True
    if calculated_error:
        errors.append("Calculated step time sum non determinabile: Time mancante o non numerico")
    elif calculated_time != 720:
        errors.append(f"Calculated step time sum is {calculated_time}, expected 720")

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


def extract_error_message(raw: bytes | str, content_type: str) -> str:
    """Estrae un messaggio di diagnostica dal corpo di una risposta d'errore HTTP.

    Oscura dati personali, token e identificativi utente. Limita l'output a 500
    caratteri. Non stampa mai il request body completo.
    Accetta sia bytes (es. http_get) che str già decodato (es. http_post_json).
    """
    if not raw:
        return "<corpo vuoto>"

    if isinstance(raw, bytes):
        try:
            text = raw.decode("utf-8", errors="replace")
        except Exception:
            return "<corpo non decodificabile>"
    else:
        text = raw

    # Prova a estrarre messaggio applicativo da JSON
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            msg = parsed.get("message") or parsed.get("error") or parsed.get("Message") or parsed.get("Error")
            if msg:
                return str(msg)[:500]
            return redact_error_body(text.encode("utf-8"), content_type)[:500]
    except (json.JSONDecodeError, ValueError):
        pass

    # Corpo testuale: redige e limita
    return redact_error_body(text.encode("utf-8"), content_type)[:500]


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
        content_type = e.headers.get("content-type", "") if hasattr(e, "headers") else ""
        request_id = e.headers.get("x-request-id", "") if hasattr(e, "headers") else ""
        return {
            "http_status": e.code,
            "content_type": content_type,
            "duration_ms": round(duration * 1000),
            "body_len": len(text),
            "raw": text,
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


def prepare_two_ramps_payload(workout: dict, user_id: str, attempt_id: str) -> dict:
    """Prepara il wrapper per il test due rampe.
    Conserva tutti i campi dell'export, sostituisce Name con suffisso tentativo.
    Assegna attempt_id (stringa di sole cifre ASCII) come nuovo workout.Id intero.
    Rifiuta se attempt_id non e' solo cifre ASCII o se coincide con l'Id originale dell'export.
    Separa l'identificativo locale del tentativo (stringa) dal campo Id del workout (intero).
    Non modifica l'input originale. Aggiunge SportsModeType: 0 al wrapper accanto a UserId e WorkoutsData.
    Non aggiunge SportsModeType al workout.
    """
    if not isinstance(attempt_id, str) or not attempt_id or not attempt_id.isascii() or not attempt_id.isdigit():
        raise ValueError(f"attempt_id deve essere una stringa di sole cifre ASCII non vuota, ottenuto: {attempt_id!r}")
    new_workout_id = int(attempt_id)
    if new_workout_id <= 0:
        raise ValueError(f"attempt_id deve convertire in intero positivo, ottenuto: {attempt_id!r}")

    definitive = json.loads(json.dumps(workout))
    original_id = definitive.get("Id")
    if original_id == new_workout_id:
        raise ValueError(
            f"Il nuovo workout.Id ({new_workout_id}) coincide con l'Id originale dell'export ({original_id}). "
            "Usa un attempt_id diverso."
        )

    original_name = definitive.get("Name", "workout senza nome")
    definitive["Name"] = f"{original_name} - Tentativo {attempt_id}"
    definitive["Id"] = new_workout_id

    wrapper = {
        "UserId": user_id,
        "SportsModeType": 0,
        "WorkoutsData": [definitive],
    }
    return wrapper


def save_two_ramps_artifact(
    attempt_id: str,
    user_id: str,
    payload: dict,
    attempts_dir: Path = Path(__file__).resolve().parent / "attempts",
    source_workout_id: Any = None,
) -> Path:
    """Salva l'artefatto del tentativo due rampe senza sovrascrivere file esistenti.
    Non salva password né token. Il payload contiene l'UserId reale quando preparato per l'invio.
    source_workout_id conserva l'Id dell'export originale separato dal nuovo workout.Id.
    """
    attempts_dir.mkdir(parents=True, exist_ok=True)
    workout = payload["WorkoutsData"][0]
    workout_id = workout.get("Id", workout.get("WorkoutId"))
    artifact = {
        "attempt_id": attempt_id,
        "attempt_id_type": type(attempt_id).__name__,
        "user_id_masked": mask_user_id(user_id),
        "workout_name": workout["Name"],
        "workout_id": workout_id,
        "workout_id_type": type(workout_id).__name__ if workout_id is not None else "NoneType",
        "source_workout_id": source_workout_id,
        "source_workout_id_type": type(source_workout_id).__name__ if source_workout_id is not None else "NoneType",
        "step_count": len(workout["WorkoutStepsArray"]),
        "total_time": workout["Time"],
        "payload": payload,
        "status": "preparato",
        "created_at": time.time(),
    }

    base_name = f"attempt_two_ramps_{attempt_id}"
    file_path = attempts_dir / f"{base_name}.json"
    counter = 1
    while True:
        try:
            with file_path.open("x", encoding="utf-8") as fh:
                json.dump(artifact, fh, indent=2, ensure_ascii=False)
            break
        except FileExistsError:
            file_path = attempts_dir / f"{base_name}_{counter}.json"
            counter += 1

    return file_path


def get_user_id_local() -> str:
    """Legge UserId da variabile d'ambiente MYWHOOSH_USER_ID o input interattivo nascosto.
    Non accetta file .env.
    """
    user_id = os.environ.get("MYWHOOSH_USER_ID", "")
    if not user_id:
        user_id = getpass.getpass("UserId locale (non verrà mostrato): ").strip()
    if not user_id:
        print("ERRORE: UserId non può essere vuoto.")
        return ""
    return user_id


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


def cmd_local_checks_two_ramps(preview_path: Path) -> int:
    """Controlli locali sul workout due rampe (no rete, no credenziali)."""
    try:
        with preview_path.open("r", encoding="utf-8") as fh:
            workout = json.load(fh)
    except FileNotFoundError:
        print(f"File non trovato: {preview_path}")
        return 1
    except json.JSONDecodeError as e:
        print(f"JSON non valido in {preview_path}: {e}")
        return 1

    print("=== MyWhoosh Upload Probe (seduta due rampe) ===")
    print("Modalita': controlli locali (no rete, no credenziali)")
    print(f"File input: {preview_path}")
    print()

    errors = validate_two_ramps(workout)
    if errors:
        print("ERRORI DI VALIDAZIONE:")
        for e in errors:
            print(f"  - {e}")
        print()
        return 1

    steps = workout["WorkoutStepsArray"]
    print("Controlli locali due rampe superati:")
    print("  - JSON sintassi: OK")
    print("  - Esattamente 2 step in WorkoutStepsArray: OK")
    print(f"  - Step 0 E_WarmUp Power=0 StartPower=0.25 EndPower=0.75 Time=360: OK")
    print(f"  - Step 1 E_CoolDown Power=0 StartPower=0.75 EndPower=0.25 Time=360: OK")
    print(f"  - Time totale {workout['Time']} s (somma step {sum(s.get('Time', 0) for s in steps)} s): OK")
    print()
    print("Pronto per preparazione definitiva.")
    print(f"Usa: MYWHOOSH_USER_ID=<id> python3 tools/mywhoosh_upload_probe.py --preview {preview_path} --prepare-two-ramps")
    print()
    return 0


def cmd_prepare_two_ramps(preview_path: Path, user_id: str) -> int:
    """Prepara il payload definitivo per il test due rampe e salva l'artefatto."""
    try:
        with preview_path.open("r", encoding="utf-8") as fh:
            workout = json.load(fh)
    except FileNotFoundError:
        print(f"File non trovato: {preview_path}")
        return 1
    except json.JSONDecodeError as e:
        print(f"JSON non valido in {preview_path}: {e}")
        return 1

    errors = validate_two_ramps(workout)
    if errors:
        print("ERRORI DI VALIDAZIONE:")
        for e in errors:
            print(f"  - {e}")
        return 1

    source_workout_id = workout.get("Id", workout.get("WorkoutId"))
    attempt_id = str(int(time.time()))
    payload = prepare_two_ramps_payload(workout, user_id, attempt_id)
    artifact_path = save_two_ramps_artifact(attempt_id, user_id, payload, source_workout_id=source_workout_id)

    workout_out = payload["WorkoutsData"][0]
    steps = workout_out["WorkoutStepsArray"]

    print("=== Payload definitivo due rampe preparato (non inviato) ===")
    print(f"  ID tentativo: {attempt_id} (tipo: {type(attempt_id).__name__})")
    print(f"  ID workout originale (export): {source_workout_id} (tipo: {type(source_workout_id).__name__ if source_workout_id is not None else 'NoneType'})")
    print(f"  ID workout nuovo (payload): {workout_out['Id']} (tipo: {type(workout_out['Id']).__name__})")
    print(f"  UserId: {mask_user_id(user_id)}")
    print(f"  Nome workout: {workout_out['Name']}")
    print(f"  StepCount: {len(steps)}")
    print(f"  Durate step: {[s['Time'] for s in steps]}")
    print(f"  Time totale: {workout_out['Time']} s")
    print(f"  File artefatto: {artifact_path}")
    print()
    print("Stato del tentativo: preparato (nessun invio)")
    print("Il payload contiene l'UserId reale: non esportare questo artefatto.")
    print()
    print("Comandi disponibili (solo dopo autorizzazione separata):")
    print("  python3 tools/mywhoosh_upload_probe.py --login")
    print("  python3 tools/mywhoosh_upload_probe.py --backup")
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


def cmd_upload(artifact_path: Path) -> int:
    """Upload isolato (quando autorizzato).
    Login, conferma interattiva, singolo POST, nessun retry.
    Legge esattamente il file indicato da --artifact.
    """
    # Fase 0: lettura e validazione del file artefatto PRIMA del login
    if not artifact_path.exists():
        print(f"File artefatto non trovato: {artifact_path}")
        return 1

    try:
        with artifact_path.open("r", encoding="utf-8") as fh:
            artifact = json.load(fh)
    except json.JSONDecodeError as e:
        print(f"JSON non valido in {artifact_path}: {e}")
        return 1
    except OSError as e:
        print(f"Impossibile leggere il file {artifact_path}: {e}")
        return 1

    if not isinstance(artifact, dict):
        print(f"Struttura artefatto invalida in {artifact_path}: oggetto JSON atteso.")
        return 1

    payload = artifact.get("payload")
    if not isinstance(payload, dict):
        print(f"Payload mancante o non oggetto in {artifact_path}.")
        return 1

    user_id = payload.get("UserId")
    if not isinstance(user_id, str) or not user_id:
        print(f"UserId mancante o vuoto nel payload di {artifact_path}.")
        return 1

    workouts_data = payload.get("WorkoutsData")
    if not isinstance(workouts_data, list) or len(workouts_data) != 1:
        print(f"WorkoutsData deve contenere esattamente 1 workout in {artifact_path}.")
        return 1

    workout = workouts_data[0]
    if not isinstance(workout, dict):
        print(f"Il workout in WorkoutsData non è un oggetto in {artifact_path}.")
        return 1

    workout_id_metadata = artifact.get("workout_id")
    workout_id_payload = workout.get("Id")
    if workout_id_metadata is not None and workout_id_payload is not None and workout_id_metadata != workout_id_payload:
        print(
            f"Incoerenza ID workout in {artifact_path}: "
            f"metadati={workout_id_metadata!r}, payload={workout_id_payload!r}."
        )
        return 1

    workout_name = workout.get("Name", "senza nome")

    sports_mode_type = payload.get("SportsModeType")
    if not isinstance(sports_mode_type, int) or sports_mode_type != 0:
        print(f"SportsModeType mancante o non valido nel wrapper del payload di {artifact_path}.")
        print("Deve essere un intero con valore 0 (posizionato accanto a UserId e WorkoutsData).")
        return 1

    print("=== Upload isolato (singolo POST) ===")
    print(f"File artefatto: {artifact_path}")
    print(f"ID workout: {workout_id_payload}")
    print(f"Nome workout: {workout_name}")
    print(f"StepCount: {len(workout.get('WorkoutStepsArray', []))}")
    print(f"Time totale: {workout.get('Time', 'n/d')} s")
    print()

    session = InMemorySession()
    login_result = mywhoosh_login(session)
    if not login_result["ok"]:
        print(f"Login fallito: {login_result['error']}")
        return 1

    whoosh_id = session.whoosh_id
    print(f"WhooshId: {whoosh_id}")
    print()

    try:
        conferma = interactive_confirm("Confermi l'invio di questo singolo workout?")
    except EOFError:
        print("Input non disponibile (EOF): invio annullato.")
        return 0
    if not conferma:
        print("Invio annullato dall'utente.")
        return 0

    # Registra stato "invio iniziato" prima del POST
    artifact["status"] = "invio iniziato"
    artifact["submitted_at"] = time.time()
    try:
        with artifact_path.open("w", encoding="utf-8") as fh:
            json.dump(artifact, fh, indent=2, ensure_ascii=False)
    except OSError as e:
        print(f"Impossibile aggiornare lo stato dell'artefatto: {e}")
        return 1

    print("Stato tentativo: invio iniziato")
    print()

    result = http_post_json(MYWHOOSH_UPLOAD_URL, payload, token=session.access_token)

    print(f"Esito HTTP: {result['http_status']}")
    if result["error"]:
        error_body_raw = result.get("raw", b"")
        error_message = extract_error_message(error_body_raw, result.get("content_type", ""))
        print(f"Errore HTTP {result['http_status']}: {error_message}")
        print()
        print("Esito remoto incerto: verificare prima di reinviare.")
        print("Nessun retry automatico eseguito.")
        artifact["status"] = "remoto incerto"
        artifact["upload_error"] = f"HTTP {result['http_status']}"
        artifact["upload_http_status"] = result["http_status"]
        artifact["upload_response"] = {"message": error_message}
        try:
            with artifact_path.open("w", encoding="utf-8") as fh:
                json.dump(artifact, fh, indent=2, ensure_ascii=False)
        except OSError as e:
            print(f"Impossibile aggiornare lo stato dell'artefatto: {e}")
        return 1

    try:
        parsed = json.loads(result["raw"])
    except json.JSONDecodeError:
        error_body_raw = result.get("raw", b"")
        error_message = extract_error_message(error_body_raw, result.get("content_type", ""))
        print(f"Risposta non JSON: esito remoto non confermato. Corpo: {error_message}")
        print("Nessun retry automatico eseguito.")
        artifact["status"] = "remoto incerto"
        artifact["upload_error"] = "risposta non JSON"
        artifact["upload_http_status"] = result["http_status"]
        artifact["upload_response"] = {"message": error_message}
        try:
            with artifact_path.open("w", encoding="utf-8") as fh:
                json.dump(artifact, fh, indent=2, ensure_ascii=False)
        except OSError as e:
            print(f"Impossibile aggiornare lo stato dell'artefatto: {e}")
        return 1

    is_accepted = parsed.get("message") == "Custom workout is being uploaded."
    if is_accepted:
        print("Risposta applicativa: upload accettato.")
        artifact["status"] = "inviato"
        artifact["upload_http_status"] = result["http_status"]
        artifact["upload_response"] = {"message": parsed.get("message"), "display": parsed.get("display")}
        try:
            with artifact_path.open("w", encoding="utf-8") as fh:
                json.dump(artifact, fh, indent=2, ensure_ascii=False)
        except OSError as e:
            print(f"Impossibile aggiornare lo stato dell'artefatto: {e}")
        print("Presenza remota: NON verificata (richiede passo --verify).")
    else:
        error_body_raw = result.get("raw", b"")
        error_message = extract_error_message(error_body_raw, result.get("content_type", ""))
        print(f"Risposta applicativa inattesa: esito remoto non confermato. Corpo: {error_message}")
        print("Nessun retry automatico eseguito.")
        artifact["status"] = "remoto incerto"
        artifact["upload_error"] = "risposta inattesa"
        artifact["upload_http_status"] = result["http_status"]
        artifact["upload_response"] = {"message": error_message}
        try:
            with artifact_path.open("w", encoding="utf-8") as fh:
                json.dump(artifact, fh, indent=2, ensure_ascii=False)
        except OSError as e:
            print(f"Impossibile aggiornare lo stato dell'artefatto: {e}")
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


def test_two_ramps_valid_input() -> None:
    """Test locale: input valido con due rampe."""
    workout = {
        "Name": "MTT TEST W44 2026 - Due rampe 360s",
        "Time": 720,
        "WorkoutStepsArray": [
            {
                "StepType": "E_WarmUp",
                "Power": 0,
                "StartPower": 0.25,
                "EndPower": 0.75,
                "Time": 360,
            },
            {
                "StepType": "E_CoolDown",
                "Power": 0,
                "StartPower": 0.75,
                "EndPower": 0.25,
                "Time": 360,
            },
        ],
    }
    errors = validate_two_ramps(workout)
    assert errors == [], f"atteso nessun errore, ottenuto {errors}"
    print("Test due rampe input valido: PASS")


def test_two_ramps_invalid_step_count() -> None:
    """Test locale: numero di step errato."""
    workout = {
        "Name": "Test",
        "Time": 720,
        "WorkoutStepsArray": [
            {"StepType": "E_WarmUp", "Power": 0, "StartPower": 0.25, "EndPower": 0.75, "Time": 360},
            {"StepType": "E_Normal", "Power": 0, "StartPower": 0, "EndPower": 0, "Time": 360},
            {"StepType": "E_CoolDown", "Power": 0, "StartPower": 0.75, "EndPower": 0.25, "Time": 360},
        ],
    }
    errors = validate_two_ramps(workout)
    assert len(errors) > 0, "atteso almeno un errore per 3 step"
    print("Test due rampe step count errato: PASS")


def test_two_ramps_invalid_power() -> None:
    """Test locale: Power != 0 su E_WarmUp."""
    workout = {
        "Name": "Test",
        "Time": 720,
        "WorkoutStepsArray": [
            {"StepType": "E_WarmUp", "Power": 0.5, "StartPower": 0.25, "EndPower": 0.75, "Time": 360},
            {"StepType": "E_CoolDown", "Power": 0, "StartPower": 0.75, "EndPower": 0.25, "Time": 360},
        ],
    }
    errors = validate_two_ramps(workout)
    assert any("Power" in e for e in errors), f"atteso errore su Power, ottenuto {errors}"
    print("Test due rampe Power errato: PASS")


def test_two_ramps_invalid_startpower() -> None:
    """Test locale: StartPower errato su E_CoolDown."""
    workout = {
        "Name": "Test",
        "Time": 720,
        "WorkoutStepsArray": [
            {"StepType": "E_WarmUp", "Power": 0, "StartPower": 0.25, "EndPower": 0.75, "Time": 360},
            {"StepType": "E_CoolDown", "Power": 0, "StartPower": 0.25, "EndPower": 0.25, "Time": 360},
        ],
    }
    errors = validate_two_ramps(workout)
    assert any("StartPower" in e for e in errors), f"atteso errore su StartPower, ottenuto {errors}"
    print("Test due rampe StartPower errato: PASS")


def test_two_ramps_invalid_total_time() -> None:
    """Test locale: Time totale errato."""
    workout = {
        "Name": "Test",
        "Time": 600,
        "WorkoutStepsArray": [
            {"StepType": "E_WarmUp", "Power": 0, "StartPower": 0.25, "EndPower": 0.75, "Time": 300},
            {"StepType": "E_CoolDown", "Power": 0, "StartPower": 0.75, "EndPower": 0.25, "Time": 300},
        ],
    }
    errors = validate_two_ramps(workout)
    assert any("Time" in e for e in errors), f"atteso errore su Time, ottenuto {errors}"
    print("Test due rampe Time totale errato: PASS")


def test_two_ramps_input_non_oggetto() -> None:
    """Test locale: workout non oggetto."""
    errors = validate_two_ramps("non sono un oggetto")
    assert any("non è un oggetto" in e for e in errors), f"atteso errore oggetto, ottenuto {errors}"
    print("Test due rampe input non oggetto: PASS")


def test_two_ramps_workoutstepsarray_non_lista() -> None:
    """Test locale: WorkoutStepsArray non lista."""
    workout = {
        "Name": "Test",
        "Time": 720,
        "WorkoutStepsArray": "non lista",
    }
    errors = validate_two_ramps(workout)
    assert any("non è una lista" in e for e in errors), f"atteso errore lista, ottenuto {errors}"
    print("Test due rampe WorkoutStepsArray non lista: PASS")


def test_two_ramps_workoutstepsarray_nullo() -> None:
    """Test locale: WorkoutStepsArray nullo."""
    workout = {
        "Name": "Test",
        "Time": 720,
        "WorkoutStepsArray": None,
    }
    errors = validate_two_ramps(workout)
    assert any("non è una lista" in e for e in errors), f"atteso errore lista nullo, ottenuto {errors}"
    print("Test due rampe WorkoutStepsArray nullo: PASS")


def test_two_ramps_elemento_non_oggetto() -> None:
    """Test locale: elemento WorkoutStepsArray non oggetto."""
    workout = {
        "Name": "Test",
        "Time": 720,
        "WorkoutStepsArray": [
            {"StepType": "E_WarmUp", "Power": 0, "StartPower": 0.25, "EndPower": 0.75, "Time": 360},
            "non sono un oggetto",
        ],
    }
    errors = validate_two_ramps(workout)
    assert any("non è un oggetto" in e for e in errors), f"atteso errore oggetto step, ottenuto {errors}"
    print("Test due rampe elemento non oggetto: PASS")


def test_two_ramps_time_non_numerico() -> None:
    """Test locale: Time non numerico."""
    workout = {
        "Name": "Test",
        "Time": "non numerico",
        "WorkoutStepsArray": [
            {"StepType": "E_WarmUp", "Power": 0, "StartPower": 0.25, "EndPower": 0.75, "Time": "abc"},
            {"StepType": "E_CoolDown", "Power": 0, "StartPower": 0.75, "EndPower": 0.25, "Time": 360},
        ],
    }
    errors = validate_two_ramps(workout)
    assert any("Time" in e for e in errors), f"atteso errore Time non numerico, ottenuto {errors}"
    print("Test due rampe Time non numerico: PASS")


def test_conservazione_campi_workout() -> None:
    """Test locale: preparazione conserva tutti i campi dell'export salvo Name e Id."""
    original = {
        "Id": 8433544,
        "Name": "MTT TEST W44 2026 - Due rampe 360s",
        "Time": 720,
        "Description": "Descrizione esportata",
        "WorkoutStepsArray": [
            {"StepType": "E_WarmUp", "Power": 0, "StartPower": 0.25, "EndPower": 0.75, "Time": 360, "Id": 1},
            {"StepType": "E_CoolDown", "Power": 0, "StartPower": 0.75, "EndPower": 0.25, "Time": 360, "Id": 2},
        ],
    }
    import copy
    before = copy.deepcopy(original)
    attempt_id = "9999999"
    payload = prepare_two_ramps_payload(original, "user-test", attempt_id)

    # Input originale non mutato
    assert original == before, "input originale mutato dalla preparazione"

    # Wrapper corretto
    assert payload["UserId"] == "user-test"
    assert len(payload["WorkoutsData"]) == 1

    workout_out = payload["WorkoutsData"][0]
    # Nuovo Id derivato da attempt_id (diverso dall'originale)
    assert workout_out["Id"] == 9999999, f"Nuovo Id non assegnato da attempt_id: {workout_out.get('Id')}"
    # Name modificato con suffisso tentativo
    assert workout_out["Name"] == "MTT TEST W44 2026 - Due rampe 360s - Tentativo 9999999"
    # Gli unici campi diversi dall'originale sono Name e Id
    for key in original:
        if key in ("Id", "Name"):
            continue
        assert workout_out[key] == original[key], f"Campo {key} modificato inaspettatamente: {workout_out.get(key)!r} != {original[key]!r}"
    # Steps conservati con Id invariati
    assert workout_out["WorkoutStepsArray"][0]["Id"] == 1
    assert workout_out["WorkoutStepsArray"][1]["Id"] == 2
    assert workout_out["WorkoutStepsArray"][0]["Power"] == 0
    assert workout_out["WorkoutStepsArray"][1]["Power"] == 0
    # SportsModeType NON e' nel workout, e' nel wrapper
    assert "SportsModeType" not in workout_out, "SportsModeType non deve essere nel workout"
    # SportsModeType e' nel wrapper con valore 0
    assert payload.get("SportsModeType") == 0, f"SportsModeType wrapper atteso 0, ottenuto {payload.get('SportsModeType')!r}"
    assert type(payload["SportsModeType"]) is int, f"SportsModeType wrapper atteso int, ottenuto {type(payload['SportsModeType']).__name__}"
    print("Test conservazione campi workout: PASS")


def test_sportsmodetype_valore_zero() -> None:
    """Test locale: SportsModeType e' sempre 0 nel wrapper del payload."""
    workout = {
        "Id": 8433544,
        "Name": "Test",
        "Time": 720,
        "WorkoutStepsArray": [
            {"StepType": "E_WarmUp", "Power": 0, "StartPower": 0.25, "EndPower": 0.75, "Time": 360, "Id": 1},
            {"StepType": "E_CoolDown", "Power": 0, "StartPower": 0.75, "EndPower": 0.25, "Time": 360, "Id": 2},
        ],
    }
    payload = prepare_two_ramps_payload(workout, "user-test", "1111111")
    assert payload.get("SportsModeType") == 0
    assert type(payload["SportsModeType"]) is int
    assert "SportsModeType" not in payload["WorkoutsData"][0]
    assert payload["WorkoutsData"][0]["Id"] == 1111111
    print("Test SportsModeType = 0: PASS")


def test_attempt_id_non_valido() -> None:
    """Test locale: attempt_id non composto da sole cifre ASCII solleva ValueError."""
    workout = {
        "Id": 8433544,
        "Name": "MTT TEST",
        "Time": 720,
        "WorkoutStepsArray": [
            {"StepType": "E_WarmUp", "Power": 0, "StartPower": 0.25, "EndPower": 0.75, "Time": 360, "Id": 1},
            {"StepType": "E_CoolDown", "Power": 0, "StartPower": 0.75, "EndPower": 0.25, "Time": 360, "Id": 2},
        ],
    }
    for invalid in ["abc123", "attempt-8433544", "", " 123 ", "12.5", "8433544a"]:
        try:
            prepare_two_ramps_payload(workout, "user-test", invalid)
        except ValueError:
            continue
        raise AssertionError(f"attempt_id {invalid!r} avrebbe dovuto sollevare ValueError")
    print("Test attempt_id non valido: PASS")


def test_attempt_id_coincide_con_id_originale() -> None:
    """Test locale: attempt_id uguale all'Id originale solleva ValueError."""
    workout = {
        "Id": 8433544,
        "Name": "MTT TEST",
        "Time": 720,
        "WorkoutStepsArray": [
            {"StepType": "E_WarmUp", "Power": 0, "StartPower": 0.25, "EndPower": 0.75, "Time": 360, "Id": 1},
            {"StepType": "E_CoolDown", "Power": 0, "StartPower": 0.75, "EndPower": 0.25, "Time": 360, "Id": 2},
        ],
    }
    try:
        prepare_two_ramps_payload(workout, "user-test", "8433544")
    except ValueError as e:
        assert "coincide" in str(e), f"Messaggio atteso 'coincide', ottenuto: {e}"
        print("Test attempt_id coincide con Id originale: PASS")
        return
    raise AssertionError("attempt_id uguale all'Id originale avrebbe dovuto sollevare ValueError")


def test_two_ramps_prepare_does_not_mutate_input() -> None:
    """Test locale: input sorgente non mutato dalla preparazione."""
    original = {
        "Name": "Original Name",
        "Time": 720,
        "WorkoutStepsArray": [
            {"StepType": "E_WarmUp", "Power": 0, "StartPower": 0.25, "EndPower": 0.75, "Time": 360, "Id": 1},
            {"StepType": "E_CoolDown", "Power": 0, "StartPower": 0.75, "EndPower": 0.25, "Time": 360, "Id": 2},
        ],
    }
    import copy
    before = copy.deepcopy(original)
    attempt_id = "12345"
    payload = prepare_two_ramps_payload(original, "user-test", attempt_id)
    assert original == before, "input originale mutato dalla preparazione"
    assert payload["WorkoutsData"][0]["Name"] == "Original Name - Tentativo 12345"
    print("Test due rampe input non mutato: PASS")


def test_two_ramps_attempt_id_separate_from_workout_id() -> None:
    """Test locale: attempt_id (stringa) e workout.Id (intero) sono distinti come tipo ma uguali come valore."""
    workout = {
        "Name": "Test",
        "Time": 720,
        "Id": 999,
        "WorkoutStepsArray": [
            {"StepType": "E_WarmUp", "Power": 0, "StartPower": 0.25, "EndPower": 0.75, "Time": 360, "Id": 1},
            {"StepType": "E_CoolDown", "Power": 0, "StartPower": 0.75, "EndPower": 0.25, "Time": 360, "Id": 2},
        ],
    }
    attempt_id = "12345"
    payload = prepare_two_ramps_payload(workout, "user-test", attempt_id)
    workout_out = payload["WorkoutsData"][0]
    # workout.Id diventa il valore intero di attempt_id
    assert workout_out["Id"] == 12345, f"atteso 12345, ottenuto {workout_out.get('Id')}"
    assert type(workout_out["Id"]) is int, f"atteso int, ottenuto {type(workout_out['Id']).__name__}"
    # attempt_id resta stringa distinta
    assert type(attempt_id) is str
    assert attempt_id == "12345"
    assert int(attempt_id) == workout_out["Id"]
    print("Test due rampe attempt_id separato da workout Id: PASS")


def test_two_ramps_artifact_no_overwrite(tmp_path=None) -> None:
    """Test locale: artefatto creato senza sovrascrivere file esistenti."""
    import tempfile
    import os as _os

    workout = {
        "Name": "Test",
        "Time": 720,
        "WorkoutId": 42,
        "WorkoutStepsArray": [
            {"StepType": "E_WarmUp", "Power": 0, "StartPower": 0.25, "EndPower": 0.75, "Time": 360, "Id": 1},
            {"StepType": "E_CoolDown", "Power": 0, "StartPower": 0.75, "EndPower": 0.25, "Time": 360, "Id": 2},
        ],
    }
    payload = prepare_two_ramps_payload(workout, "user-test", "1")

    with tempfile.TemporaryDirectory() as tmp:
        attempts_dir = Path(tmp)
        path1 = save_two_ramps_artifact("attempt-001", "user-test", payload, attempts_dir)
        assert path1.exists()
        path2 = save_two_ramps_artifact("attempt-001", "user-test", payload, attempts_dir)
        assert path2.exists()
        assert path1 != path2, "atteso due file diversi per evitare sovrascrittura"
        assert path1.name == "attempt_two_ramps_attempt-001.json"
        assert path2.name == "attempt_two_ramps_attempt-001_1.json"
    print("Test due rampe protezione sovrascrittura: PASS")


def _make_http_post_ok(payload: dict, status_code: int = 200) -> dict:
    raw = json.dumps({"message": "Custom workout is being uploaded.", "display": True}).encode("utf-8")
    return {
        "http_status": status_code,
        "content_type": "application/json",
        "duration_ms": 100,
        "body_len": len(raw),
        "raw": raw,
        "error": None,
    }


def _make_artifact(tmp: Path, filename: str, payload: dict, metadata: dict | None = None) -> Path:
    artifact = {
        "attempt_id": "test-123",
        "user_id_masked": "[OSCURATO]",
        "workout_name": payload["WorkoutsData"][0].get("Name", ""),
        "workout_id": payload["WorkoutsData"][0].get("Id"),
        "payload": payload,
        "status": "preparato",
        "created_at": time.time(),
    }
    if metadata:
        artifact.update(metadata)
    path = tmp / filename
    path.write_text(json.dumps(artifact, ensure_ascii=False), encoding="utf-8")
    return path


def test_upload_senza_artifact_ferma_prima_del_login() -> None:
    """--upload senza --artifact restituisce errore prima del login."""
    from unittest.mock import patch

    login_called: list[bool] = []

    def fake_login() -> int:
        login_called.append(True)
        return 0

    with patch("__main__.cmd_login", side_effect=fake_login):
        result = main(["--upload"])

    assert result == 1, f"atteso 1, ottenuto {result}"
    assert len(login_called) == 0, "login non doveva essere chiamato senza --artifact"
    print("Test upload senza artifact: PASS")


def test_upload_path_esplicito_seleziona_file_correto() -> None:
    """Path esplicito seleziona quel file anche se altri nomi sarebbero ordinati dopo."""
    import tempfile
    from unittest.mock import patch

    payload = {
        "UserId": "utente-test@example.com",
        "SportsModeType": 0,
        "WorkoutsData": [{"Id": 777, "Name": "Workout target", "Time": 360, "WorkoutStepsArray": []}],
    }
    metadata = {"workout_id": 777, "attempt_id": "test-123"}

    with tempfile.TemporaryDirectory() as tmp:
        target = _make_artifact(Path(tmp), "attempt_aaa.json", payload, metadata)
        # file che verrebbe scelto alfabeticamente dopo
        _make_artifact(Path(tmp), "attempt_zzz.json", payload, metadata)

        posted: list[tuple[str, dict, str | None]] = []

        def fake_post(url: str, data: dict, token: str | None = None, timeout: int = 60) -> dict:
            posted.append((url, data, token))
            return _make_http_post_ok(data)

        login_ok: list[bool] = []

        def fake_login_set_session(session: InMemorySession) -> dict:
            login_ok.append(True)
            session.access_token = "tok"
            session.whoosh_id = "wid"
            session.authenticated = True
            return {"ok": True, "whoosh_id": "wid", "message": "ok", "http_status": 200}

        confirm: list[bool] = []

        def fake_confirm(prompt: str) -> bool:
            confirm.append(True)
            return True

        with patch("__main__.mywhoosh_login", side_effect=fake_login_set_session), \
             patch("__main__.http_post_json", side_effect=fake_post), \
             patch("__main__.interactive_confirm", side_effect=fake_confirm):
            result = main(["--upload", "--artifact", str(target)])

    assert result == 0, f"atteso 0, ottenuto {result}"
    assert len(posted) == 1, f"atteso 1 POST, ottenuto {len(posted)}"
    assert posted[0][1] == payload, "payload inviato non corrisponde"
    assert posted[0][0] == MYWHOOSH_UPLOAD_URL, f"URL errato: {posted[0][0]}"
    assert posted[0][2] == "tok", "token non passato correttamente"
    assert login_ok, "login doveva essere chiamato"
    assert confirm, "conferma doveva essere chiesta"
    print("Test upload path esplicito: PASS")


def test_upload_file_assente_ferma_prima_del_login() -> None:
    """File assente: errore prima del login."""
    from unittest.mock import patch

    login_called: list[bool] = []

    def fake_login() -> int:
        login_called.append(True)
        return 0

    with patch("__main__.cmd_login", side_effect=fake_login):
        result = main(["--upload", "--artifact", "/percorso/inesistente.json"])

    assert result == 1, f"atteso 1, ottenuto {result}"
    assert len(login_called) == 0, "login non doveva essere chiamato per file assente"
    print("Test upload file assente: PASS")


def test_upload_json_non_valido_ferma_prima_del_login() -> None:
    """JSON non valido: errore prima del login."""
    import tempfile

    from unittest.mock import patch

    with tempfile.TemporaryDirectory() as tmp:
        bad = Path(tmp) / "bad.json"
        bad.write_text("{ non è json", encoding="utf-8")

        login_called: list[bool] = []

        def fake_login() -> int:
            login_called.append(True)
            return 0

        with patch("__main__.cmd_login", side_effect=fake_login):
            result = main(["--upload", "--artifact", str(bad)])

    assert result == 1, f"atteso 1, ottenuto {result}"
    assert len(login_called) == 0, "login non doveva essere chiamato per JSON non valido"
    print("Test upload JSON non valido: PASS")


def test_upload_struttura_incoerente_ferma_prima_del_login() -> None:
    """Struttura payload incoerente: errore prima del login."""
    import tempfile

    from unittest.mock import patch

    payload_senza_userid = {"WorkoutsData": [{"Id": 1, "Name": "X"}]}
    payload_workouts_vuoto = {"UserId": "u", "WorkoutsData": []}
    payload_workouts_due = {"UserId": "u", "WorkoutsData": [{"Id": 1}, {"Id": 2}]}
    payload_id_incoerente = {"UserId": "u", "WorkoutsData": [{"Id": 5, "Name": "X"}]}
    metadata_incoerente = {"workout_id": 999, "attempt_id": "x"}

    casi = [
        ("payload mancante", None, None),
        ("UserId mancante", payload_senza_userid, None),
        ("WorkoutsData vuoto", payload_workouts_vuoto, None),
        ("WorkoutsData due elementi", payload_workouts_due, None),
        ("workout_id incoerente", payload_id_incoerente, metadata_incoerente),
    ]

    for label, p, m in casi:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / f"{label}.json"
            artifact = {"attempt_id": "x"} if p is None else {"attempt_id": "x", "payload": p}
            if m:
                artifact.update(m)
            path.write_text(json.dumps(artifact), encoding="utf-8")

            login_called: list[bool] = []

            def fake_login() -> int:
                login_called.append(True)
                return 0

            with patch("__main__.cmd_login", side_effect=fake_login):
                result = main(["--upload", "--artifact", str(path)])

        assert result == 1, f"{label}: atteso 1, ottenuto {result}"
        assert len(login_called) == 0, f"{label}: login non doveva essere chiamato"
    print("Test upload struttura incoerente: PASS")


def test_upload_conferma_negata_zero_post() -> None:
    """Conferma negata: zero POST."""
    import tempfile

    from unittest.mock import patch

    payload = {
        "UserId": "utente-test@example.com",
        "SportsModeType": 0,
        "WorkoutsData": [{"Id": 777, "Name": "Workout target", "Time": 360, "WorkoutStepsArray": []}],
    }
    metadata = {"workout_id": 777, "attempt_id": "test-123"}

    with tempfile.TemporaryDirectory() as tmp:
        target = _make_artifact(Path(tmp), "attempt_aaa.json", payload, metadata)

        posted: list[tuple[str, dict, str | None]] = []

        def fake_post(url: str, data: dict, token: str | None = None, timeout: int = 60) -> dict:
            posted.append((url, data, token))
            return _make_http_post_ok(data)

        login_ok: list[bool] = []

        def fake_login_set_session(session: InMemorySession) -> dict:
            login_ok.append(True)
            session.access_token = "tok"
            session.whoosh_id = "wid"
            session.authenticated = True
            return {"ok": True, "whoosh_id": "wid", "message": "ok", "http_status": 200}

        def fake_confirm_no(prompt: str) -> bool:
            return False

        with patch("__main__.mywhoosh_login", side_effect=fake_login_set_session), \
             patch("__main__.http_post_json", side_effect=fake_post), \
             patch("__main__.interactive_confirm", side_effect=fake_confirm_no):
            result = main(["--upload", "--artifact", str(target)])

    assert result == 0, f"atteso 0, ottenuto {result}"
    assert len(posted) == 0, f"atteso 0 POST, ottenuto {len(posted)}"
    print("Test upload conferma negata: PASS")


def test_upload_conferma_eof_zero_post() -> None:
    """Conferma EOF: zero POST senza eccezione."""
    import tempfile

    from unittest.mock import patch

    payload = {
        "UserId": "utente-test@example.com",
        "SportsModeType": 0,
        "WorkoutsData": [{"Id": 777, "Name": "Workout target", "Time": 360, "WorkoutStepsArray": []}],
    }
    metadata = {"workout_id": 777, "attempt_id": "test-123"}

    with tempfile.TemporaryDirectory() as tmp:
        target = _make_artifact(Path(tmp), "attempt_aaa.json", payload, metadata)

        posted: list[tuple[str, dict, str | None]] = []

        def fake_post(url: str, data: dict, token: str | None = None, timeout: int = 60) -> dict:
            posted.append((url, data, token))
            return _make_http_post_ok(data)

        login_ok: list[bool] = []

        def fake_login_set_session(session: InMemorySession) -> dict:
            login_ok.append(True)
            session.access_token = "tok"
            session.whoosh_id = "wid"
            session.authenticated = True
            return {"ok": True, "whoosh_id": "wid", "message": "ok", "http_status": 200}

        def fake_confirm_eof(prompt: str) -> bool:
            raise EOFError

        with patch("__main__.mywhoosh_login", side_effect=fake_login_set_session), \
             patch("__main__.http_post_json", side_effect=fake_post), \
             patch("__main__.interactive_confirm", side_effect=fake_confirm_eof):
            result = main(["--upload", "--artifact", str(target)])

    assert result == 0, f"atteso 0, ottenuto {result}"
    assert len(posted) == 0, f"atteso 0 POST, ottenuto {len(posted)}"
    print("Test upload conferma EOF: PASS")


def test_upload_conferma_positiva_un_solo_post() -> None:
    """Conferma positiva: un solo POST con il solo payload dell'artefatto selezionato."""
    import tempfile

    from unittest.mock import patch

    payload = {
        "UserId": "utente-test@example.com",
        "SportsModeType": 0,
        "WorkoutsData": [{"Id": 777, "Name": "Workout target", "Time": 360, "WorkoutStepsArray": []}],
    }
    metadata = {"workout_id": 777, "attempt_id": "test-123"}

    with tempfile.TemporaryDirectory() as tmp:
        target = _make_artifact(Path(tmp), "attempt_aaa.json", payload, metadata)

        posted: list[tuple[str, dict, str | None]] = []

        def fake_post(url: str, data: dict, token: str | None = None, timeout: int = 60) -> dict:
            posted.append((url, data, token))
            return _make_http_post_ok(data)

        login_ok: list[bool] = []

        def fake_login_set_session(session: InMemorySession) -> dict:
            login_ok.append(True)
            session.access_token = "tok"
            session.whoosh_id = "wid"
            session.authenticated = True
            return {"ok": True, "whoosh_id": "wid", "message": "ok", "http_status": 200}

        def fake_confirm_si(prompt: str) -> bool:
            return True

        with patch("__main__.mywhoosh_login", side_effect=fake_login_set_session), \
             patch("__main__.http_post_json", side_effect=fake_post), \
             patch("__main__.interactive_confirm", side_effect=fake_confirm_si):
            result = main(["--upload", "--artifact", str(target)])

    assert result == 0, f"atteso 0, ottenuto {result}"
    assert len(posted) == 1, f"atteso 1 POST, ottenuto {len(posted)}"
    assert posted[0][0] == MYWHOOSH_UPLOAD_URL, f"URL errato: {posted[0][0]}"
    assert posted[0][1] == payload, "payload inviato non corrisponde"
    assert posted[0][2] == "tok", "token non passato correttamente"
    print("Test upload conferma positiva: PASS")


def test_upload_http_400_json_body() -> None:
    """HTTP 400 con corpo JSON: messaggio applicativo estratto."""
    import tempfile
    from unittest.mock import patch

    payload = {
        "UserId": "utente-test@example.com",
        "SportsModeType": 0,
        "WorkoutsData": [{"Id": 777, "Name": "Workout target", "Time": 360, "WorkoutStepsArray": []}],
    }
    metadata = {"workout_id": 777, "attempt_id": "test-123"}

    with tempfile.TemporaryDirectory() as tmp:
        target = _make_artifact(Path(tmp), "attempt_aaa.json", payload, metadata)

        error_body = b'{"message": "Custom workout conflict: Id already exists", "code": 400}'

        def fake_post_400(url, data, token=None, timeout=60):
            return {
                "http_status": 400,
                "content_type": "application/json",
                "duration_ms": 50,
                "body_len": len(error_body),
                "raw": error_body,
                "error": "HTTP 400",
            }

        def fake_login_set_session(session):
            session.access_token = "tok"
            session.whoosh_id = "wid"
            session.authenticated = True
            return {"ok": True, "whoosh_id": "wid", "message": "ok", "http_status": 200}

        def fake_confirm_si(prompt):
            return True

        posted = []
        with patch("__main__.mywhoosh_login", side_effect=fake_login_set_session), \
             patch("__main__.http_post_json", side_effect=fake_post_400), \
             patch("__main__.interactive_confirm", side_effect=fake_confirm_si):
            result = main(["--upload", "--artifact", str(target)])

    assert result == 1, f"atteso 1, ottenuto {result}"
    print("Test upload HTTP 400 JSON body: PASS")


def test_upload_http_400_text_body() -> None:
    """HTTP 400 con corpo testuale: diagnostica estratta."""
    import tempfile
    from unittest.mock import patch

    payload = {
        "UserId": "utente-test@example.com",
        "SportsModeType": 0,
        "WorkoutsData": [{"Id": 777, "Name": "Workout target", "Time": 360, "WorkoutStepsArray": []}],
    }
    metadata = {"workout_id": 777, "attempt_id": "test-123"}

    with tempfile.TemporaryDirectory() as tmp:
        target = _make_artifact(Path(tmp), "attempt_aaa.json", payload, metadata)

        error_body = b"Bad Request: invalid payload structure"

        def fake_post_400(url, data, token=None, timeout=60):
            return {
                "http_status": 400,
                "content_type": "text/plain",
                "duration_ms": 50,
                "body_len": len(error_body),
                "raw": error_body,
                "error": "HTTP 400",
            }

        def fake_login_set_session(session):
            session.access_token = "tok"
            session.whoosh_id = "wid"
            session.authenticated = True
            return {"ok": True, "whoosh_id": "wid", "message": "ok", "http_status": 200}

        def fake_confirm_si(prompt):
            return True

        posted = []
        with patch("__main__.mywhoosh_login", side_effect=fake_login_set_session), \
             patch("__main__.http_post_json", side_effect=fake_post_400), \
             patch("__main__.interactive_confirm", side_effect=fake_confirm_si):
            result = main(["--upload", "--artifact", str(target)])

    assert result == 1, f"atteso 1, ottenuto {result}"
    print("Test upload HTTP 400 text body: PASS")


def test_upload_http_error_empty_body() -> None:
    """HTTP errore con corpo vuoto: nessun crash, diagnostica vuota."""
    import tempfile
    from unittest.mock import patch

    payload = {
        "UserId": "utente-test@example.com",
        "SportsModeType": 0,
        "WorkoutsData": [{"Id": 777, "Name": "Workout target", "Time": 360, "WorkoutStepsArray": []}],
    }
    metadata = {"workout_id": 777, "attempt_id": "test-123"}

    with tempfile.TemporaryDirectory() as tmp:
        target = _make_artifact(Path(tmp), "attempt_aaa.json", payload, metadata)

        def fake_post_empty(url, data, token=None, timeout=60):
            return {
                "http_status": 400,
                "content_type": "",
                "duration_ms": 50,
                "body_len": 0,
                "raw": b"",
                "error": "HTTP 400",
            }

        def fake_login_set_session(session):
            session.access_token = "tok"
            session.whoosh_id = "wid"
            session.authenticated = True
            return {"ok": True, "whoosh_id": "wid", "message": "ok", "http_status": 200}

        def fake_confirm_si(prompt):
            return True

        posted = []
        with patch("__main__.mywhoosh_login", side_effect=fake_login_set_session), \
             patch("__main__.http_post_json", side_effect=fake_post_empty), \
             patch("__main__.interactive_confirm", side_effect=fake_confirm_si):
            result = main(["--upload", "--artifact", str(target)])

    assert result == 1, f"atteso 1, ottenuto {result}"
    print("Test upload HTTP errore corpo vuoto: PASS")


def test_upload_http_error_redacts_secrets() -> None:
    """Corpo errore con dati sensibili: oscuramento nella diagnostica."""
    import tempfile
    from unittest.mock import patch
    import io

    payload = {
        "UserId": "utente-test@example.com",
        "SportsModeType": 0,
        "WorkoutsData": [{"Id": 777, "Name": "Workout target", "Time": 360, "WorkoutStepsArray": []}],
    }
    metadata = {"workout_id": 777, "attempt_id": "test-123"}

    with tempfile.TemporaryDirectory() as tmp:
        target = _make_artifact(Path(tmp), "attempt_aaa.json", payload, metadata)

        error_body = b'{"message": "errore", "user": "secret@email.com", "token": "abc123secret"}'

        def fake_post_400(url, data, token=None, timeout=60):
            return {
                "http_status": 400,
                "content_type": "application/json",
                "duration_ms": 50,
                "body_len": len(error_body),
                "raw": error_body,
                "error": "HTTP 400",
            }

        def fake_login_set_session(session):
            session.access_token = "tok"
            session.whoosh_id = "wid"
            session.authenticated = True
            return {"ok": True, "whoosh_id": "wid", "message": "ok", "http_status": 200}

        def fake_confirm_si(prompt):
            return True

        captured = io.StringIO()
        with patch("sys.stdout", captured), \
             patch("__main__.mywhoosh_login", side_effect=fake_login_set_session), \
             patch("__main__.http_post_json", side_effect=fake_post_400), \
             patch("__main__.interactive_confirm", side_effect=fake_confirm_si):
            result = main(["--upload", "--artifact", str(target)])

    output = captured.getvalue()
    assert result == 1, f"atteso 1, ottenuto {result}"
    assert "secret@email.com" not in output, "Email trovata nell'output!"
    assert "abc123secret" not in output, "Token trovato nell'output!"
    print("Test upload HTTP errore oscuramento segreti: PASS")


def test_http_post_json_http_400_json_body() -> None:
    """http_post_json: HTTP 400 con corpo JSON, content_type e request_id estratti."""
    import io
    from unittest.mock import patch
    from urllib.error import HTTPError

    error_body = b'{"message": "Custom workout conflict: Id already exists", "code": 400}'
    headers = {"content-type": "application/json", "x-request-id": "req-400-json"}

    fp = io.BytesIO(error_body)
    http_error = HTTPError(
        url=MYWHOOSH_UPLOAD_URL,
        code=400,
        msg="Bad Request",
        hdrs=headers,
        fp=fp,
    )

    with patch("urllib.request.urlopen", side_effect=http_error):
        result = http_post_json(MYWHOOSH_UPLOAD_URL, {"UserId": "u", "WorkoutsData": []}, token="faketoken")

    assert result["http_status"] == 400, f"atteso 400, ottenuto {result['http_status']}"
    assert result["content_type"] == "application/json", f"content_type perso: {result['content_type']!r}"
    assert result.get("request_id") == "req-400-json", f"request_id perso: {result.get('request_id')!r}"
    assert result["error"] == "HTTP 400"
    assert result["raw"] == error_body.decode("utf-8")
    msg = extract_error_message(result.get("raw", b""), result.get("content_type", ""))
    assert "Custom workout conflict" in msg, f"messaggio applicativo non estratto: {msg!r}"
    print("Test http_post_json HTTP 400 JSON body: PASS")


def test_http_post_json_http_400_text_body() -> None:
    """http_post_json: HTTP 400 con corpo testuale."""
    import io
    from unittest.mock import patch
    from urllib.error import HTTPError

    error_body = b"Bad Request: invalid payload structure"
    headers = {"content-type": "text/plain", "x-request-id": "req-400-text"}

    fp = io.BytesIO(error_body)
    http_error = HTTPError(
        url=MYWHOOSH_UPLOAD_URL,
        code=400,
        msg="Bad Request",
        hdrs=headers,
        fp=fp,
    )

    with patch("urllib.request.urlopen", side_effect=http_error):
        result = http_post_json(MYWHOOSH_UPLOAD_URL, {"UserId": "u", "WorkoutsData": []}, token="faketoken")

    assert result["http_status"] == 400, f"atteso 400, ottenuto {result['http_status']}"
    assert result["content_type"] == "text/plain", f"content_type perso: {result['content_type']!r}"
    assert result.get("request_id") == "req-400-text", f"request_id perso: {result.get('request_id')!r}"
    assert result["raw"] == error_body.decode("utf-8")
    msg = extract_error_message(result.get("raw", b""), result.get("content_type", ""))
    assert "invalid payload structure" in msg, f"messaggio non estratto: {msg!r}"
    print("Test http_post_json HTTP 400 text body: PASS")


def test_http_post_json_http_error_empty_body() -> None:
    """http_post_json: HTTP errore con corpo vuoto, nessun crash."""
    import io
    from unittest.mock import patch
    from urllib.error import HTTPError

    error_body = b""
    headers = {"content-type": "application/json", "x-request-id": "req-empty"}

    fp = io.BytesIO(error_body)
    http_error = HTTPError(
        url=MYWHOOSH_UPLOAD_URL,
        code=400,
        msg="Bad Request",
        hdrs=headers,
        fp=fp,
    )

    with patch("urllib.request.urlopen", side_effect=http_error):
        result = http_post_json(MYWHOOSH_UPLOAD_URL, {"UserId": "u", "WorkoutsData": []}, token="faketoken")

    assert result["http_status"] == 400, f"atteso 400, ottenuto {result['http_status']}"
    assert result["content_type"] == "application/json", f"content_type perso: {result['content_type']!r}"
    assert result.get("request_id") == "req-empty", f"request_id perso: {result.get('request_id')!r}"
    assert result["body_len"] == 0, f"body_len atteso 0, ottenuto {result['body_len']}"
    assert result["raw"] == "", f"raw atteso vuoto, ottenuto {result['raw']!r}"
    msg = extract_error_message(result.get("raw", b""), result.get("content_type", ""))
    assert msg == "<corpo vuoto>", f"messaggio atteso vuoto, ottenuto {msg!r}"
    print("Test http_post_json HTTP errore corpo vuoto: PASS")


def test_http_post_json_http_error_redacts_secrets() -> None:
    """http_post_json: corpo errore con dati sensibili, oscuramento."""
    import io
    from unittest.mock import patch
    from urllib.error import HTTPError

    error_body = b'{"message": "errore", "user": "secret@email.com", "token": "abc123secret"}'
    headers = {"content-type": "application/json", "x-request-id": "req-secrets"}

    fp = io.BytesIO(error_body)
    http_error = HTTPError(
        url=MYWHOOSH_UPLOAD_URL,
        code=400,
        msg="Bad Request",
        hdrs=headers,
        fp=fp,
    )

    with patch("urllib.request.urlopen", side_effect=http_error):
        result = http_post_json(MYWHOOSH_UPLOAD_URL, {"UserId": "u", "WorkoutsData": []}, token="faketoken")

    assert result["http_status"] == 400, f"atteso 400, ottenuto {result['http_status']}"
    msg = extract_error_message(result.get("raw", b""), result.get("content_type", ""))
    assert "secret@email.com" not in msg, "email trovata nel messaggio diagnostico!"
    assert "abc123secret" not in msg, "token trovato nel messaggio diagnostico!"
    print("Test http_post_json HTTP errore oscuramento segreti: PASS")


def test_upload_request_structure_locale() -> None:
    """Test integrazione locale: ispeziona il Request effettivamente costruito.

    Usa cmd_upload e http_post_json REALI (non mocka http_post_json).
    Mocka solo mywhoosh_login e interactive_confirm.
    Intercetta urllib.request.urlopen senza rete.
    Verifica SportsModeType alla radice del body, tipo int, valore 0.
    """
    import tempfile
    import io
    import shutil
    from unittest.mock import patch

    # Legge l'artefatto reale e lavora su una copia temporanea (non modifica l'originale)
    artifact_path_real = Path("tools/attempts/attempt_two_ramps_1793552448_2.json")
    if not artifact_path_real.exists():
        print(f"Artefatto non trovato: {artifact_path_real}")
        print("Test upload struttura richiesta locale: SKIP (artefatto assente)")
        return

    with artifact_path_real.open("r", encoding="utf-8") as fh:
        artifact = json.load(fh)
    expected_payload = artifact["payload"]

    captured_requests: list = []

    class _FakeResp:
        """Risposta HTTP finta che supporta il protocollo context manager."""

        def __init__(self):
            self.status = 200
            self.headers = {"content-type": "application/json"}

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def read(self):
            return b'{"message": "Custom workout is being uploaded."}'

    def fake_urlopen(req, timeout=60):
        captured_requests.append(req)
        return _FakeResp()

    def fake_login(session):
        session.access_token = "fake_token"
        session.whoosh_id = "fake_whoosh_id"
        session.authenticated = True
        return {"ok": True, "whoosh_id": "fake_whoosh_id", "message": "ok", "http_status": 200}

    def fake_confirm(prompt):
        return True

    with tempfile.TemporaryDirectory() as tmp:
        artifact_copy = Path(tmp) / "attempt_copy.json"
        shutil.copy2(artifact_path_real, artifact_copy)

        with patch("__main__.mywhoosh_login", side_effect=fake_login), \
             patch("__main__.interactive_confirm", side_effect=fake_confirm), \
             patch("urllib.request.urlopen", side_effect=fake_urlopen):
            result = cmd_upload(artifact_copy)

    assert result == 0, f"cmd_upload restituito {result}, atteso 0"
    assert len(captured_requests) == 1, f"atteso 1 richiesta, ottenuto {len(captured_requests)}"

    req = captured_requests[0]
    assert req.method == "POST", f"metodo atteso POST, ottenuto {req.method}"
    assert req.full_url == MYWHOOSH_UPLOAD_URL, f"URL atteso {MYWHOOSH_UPLOAD_URL}, ottenuto {req.full_url}"

    header_items = dict(req.header_items())
    content_type = next((v for k, v in req.header_items() if k.lower() == "content-type"), "")
    assert content_type == "application/json", f"Content-Type atteso application/json, ottenuto {content_type!r}"

    body = req.data
    assert isinstance(body, bytes), f"body atteso bytes, ottenuto {type(body).__name__}"
    parsed_body = json.loads(body)
    assert isinstance(parsed_body, dict), f"body decodificato atteso dict, ottenuto {type(parsed_body).__name__}"

    assert parsed_body == expected_payload, "body inviato differisce dal payload dell'artefatto"

    workouts = parsed_body.get("WorkoutsData")
    assert isinstance(workouts, list) and len(workouts) == 1
    workout = workouts[0]
    # SportsModeType e' nel wrapper, non nel workout
    assert parsed_body.get("SportsModeType") == 0, f"SportsModeType wrapper atteso 0, ottenuto {parsed_body.get('SportsModeType')!r}"
    assert type(parsed_body["SportsModeType"]) is int, f"SportsModeType wrapper atteso int, ottenuto {type(parsed_body['SportsModeType']).__name__}"
    assert "SportsModeType" not in workout, "SportsModeType non deve essere nel workout"

    # Verifica che l'artefatto originale non sia stato modificato
    with artifact_path_real.open("r", encoding="utf-8") as fh:
        artifact_original = json.load(fh)
    assert artifact_original["payload"] == expected_payload, "artefatto originale modificato inaspettatamente"

    print("Test struttura richiesta upload locale: PASS")


def test_upload_sportsmodetype_solo_nel_workout_rifiutato() -> None:
    """Caso negativo: SportsModeType solo nel workout (non nel wrapper) viene rifiutato prima del login."""
    import tempfile
    from unittest.mock import patch

    workout_con_smt_nel_workout = {
        "Id": 8433545,
        "Name": "Test errore",
        "Time": 720,
        "SportsModeType": 0,
        "WorkoutStepsArray": [
            {"StepType": "E_WarmUp", "Power": 0, "StartPower": 0.25, "EndPower": 0.75, "Time": 360, "Id": 1},
            {"StepType": "E_CoolDown", "Power": 0, "StartPower": 0.75, "EndPower": 0.25, "Time": 360, "Id": 2},
        ],
    }
    payload_errato = {
        "UserId": "user-test",
        "WorkoutsData": [workout_con_smt_nel_workout],
    }

    login_called: list[bool] = []

    def fake_login() -> int:
        login_called.append(True)
        return 0

    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "smt_solo_nel_workout.json"
        artifact = {"attempt_id": "x", "payload": payload_errato, "workout_id": 8433545}
        path.write_text(json.dumps(artifact, ensure_ascii=False), encoding="utf-8")

        with patch("__main__.cmd_login", side_effect=fake_login):
            result = main(["--upload", "--artifact", str(path)])

    assert result == 1, f"atteso 1 (rifiuto prima del login), ottenuto {result}"
    assert len(login_called) == 0, "login non doveva essere chiamato con SportsModeType solo nel workout"
    print("Test SportsModeType solo nel workout rifiutato: PASS")


def test_http_post_json_all() -> None:
    """Esegue tutti i test diretti di http_post_json con HTTPError simulate."""
    print("=== Test diretti: http_post_json con HTTPError simulate ===")
    print()
    test_http_post_json_http_400_json_body()
    test_http_post_json_http_400_text_body()
    test_http_post_json_http_error_empty_body()
    test_http_post_json_http_error_redacts_secrets()
    print()
    print("Tutti i test http_post_json HTTPError: PASS")


def test_upload_all() -> None:
    """Esegue tutti i test locali del comando --upload --artifact."""
    print("=== Test locali: comando --upload --artifact ===")
    print()
    test_upload_senza_artifact_ferma_prima_del_login()
    test_upload_path_esplicito_seleziona_file_correto()
    test_upload_file_assente_ferma_prima_del_login()
    test_upload_json_non_valido_ferma_prima_del_login()
    test_upload_struttura_incoerente_ferma_prima_del_login()
    test_upload_conferma_negata_zero_post()
    test_upload_conferma_eof_zero_post()
    test_upload_conferma_positiva_un_solo_post()
    test_upload_http_400_json_body()
    test_upload_http_400_text_body()
    test_upload_http_error_empty_body()
    test_upload_http_error_redacts_secrets()
    test_upload_request_structure_locale()
    test_upload_sportsmodetype_solo_nel_workout_rifiutato()
    print()
    print("Tutti i test --upload --artifact: PASS")


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


def test_dispatch_local_checks_two_ramps() -> None:
    """Test regressione: --local-checks-two-ramps chiama solo il gestore due-rampe."""
    from unittest.mock import patch

    called_with_path: list[str] = []
    def fake_local_checks_two_ramps(path) -> int:
        called_with_path.append(str(path))
        return 0

    cmd_local_checks_called: list[bool] = []
    def fake_cmd_local_checks() -> int:
        cmd_local_checks_called.append(True)
        return 0

    with patch("__main__.cmd_local_checks_two_ramps", side_effect=fake_local_checks_two_ramps), \
         patch("__main__.cmd_local_checks", side_effect=fake_cmd_local_checks):
        result = main(["--local-checks-two-ramps", "--preview", "tools/MyWhoosh - new workout (3).json"])

    assert result == 0, f"atteso 0, ottenuto {result}"
    assert len(called_with_path) == 1, f"atteso 1 chiamata, ottenuto {len(called_with_path)}"
    assert called_with_path[0] == "tools/MyWhoosh - new workout (3).json", f"path errato: {called_with_path[0]}"
    assert len(cmd_local_checks_called) == 0, "cmd_local_checks non doveva essere chiamato"
    print("Test dispatch --local-checks-two-ramps: PASS")


def test_two_ramps_all() -> None:
    """Esegue tutti i test locali del test due rampe."""
    print("=== Test locali: test due rampe ===")
    print()
    test_dispatch_local_checks_two_ramps()
    test_two_ramps_valid_input()
    test_two_ramps_input_non_oggetto()
    test_two_ramps_workoutstepsarray_non_lista()
    test_two_ramps_workoutstepsarray_nullo()
    test_two_ramps_elemento_non_oggetto()
    test_two_ramps_time_non_numerico()
    test_two_ramps_invalid_step_count()
    test_two_ramps_invalid_power()
    test_two_ramps_invalid_startpower()
    test_two_ramps_invalid_total_time()
    test_conservazione_campi_workout()
    test_sportsmodetype_valore_zero()
    test_attempt_id_non_valido()
    test_attempt_id_coincide_con_id_originale()
    test_two_ramps_prepare_does_not_mutate_input()
    test_two_ramps_attempt_id_separate_from_workout_id()
    test_two_ramps_artifact_no_overwrite()
    print()
    print("Tutti i test due rampe: PASS")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="MyWhoosh upload probe (seduta 1)")
    parser.add_argument("--preview", type=str, default=None, help="Percorso file JSON input workout (default: tools/preview_seduta_due_rampe.json)")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--local-checks", action="store_true", help="Controlli locali senza rete (default)")
    group.add_argument("--prepare", action="store_true", help="Prepara payload definitivo (richiede MYWHOOSH_WHOOSH_ID)")
    group.add_argument("--login", action="store_true", help="Esegue login MyWhoosh (token in memoria)")
    group.add_argument("--backup", action="store_true", help="Backup remoto in sola lettura (quando autorizzato)")
    group.add_argument("--upload", action="store_true", help="Upload singolo (richiede conferma interattiva)")
    group.add_argument("--verify", action="store_true", help="Verifica remota senza POST (quando autorizzato)")
    group.add_argument("--local-checks-two-ramps", action="store_true", help="Controlli locali workout due rampe (richiede --preview)")
    group.add_argument("--prepare-two-ramps", action="store_true", help="Prepara payload workout due rampe (richiede --preview e MYWHOOSH_USER_ID)")
    group.add_argument("--test-metadata-500", action="store_true", help="Test locale: diagnostica errore HTTP 500 metadati (mock, no rete)")
    group.add_argument("--test-backup", action="store_true", help="Test locali: comando --backup (mock, no rete)")
    group.add_argument("--test-two-ramps", action="store_true", help="Test locali: test due rampe (mock, no rete)")
    group.add_argument("--test-upload", action="store_true", help="Test locali: comando --upload --artifact (mock, no rete)")
    parser.add_argument("--artifact", type=str, default=None, help="Percorso file artefatto da caricare (obbligatorio con --upload)")
    args = parser.parse_args(argv)

    if args.local_checks or not any([args.prepare, args.login, args.backup, args.upload, args.verify, args.test_metadata_500, args.test_backup, args.test_two_ramps, args.test_upload, args.local_checks_two_ramps, args.prepare_two_ramps]):
        return cmd_local_checks()

    if args.local_checks_two_ramps:
        preview_path = Path(args.preview) if args.preview else Path(__file__).resolve().parent / "mywhoosh-template-rampe.json"
        return cmd_local_checks_two_ramps(preview_path)

    if args.prepare_two_ramps:
        preview_path = Path(args.preview) if args.preview else Path(__file__).resolve().parent / "mywhoosh-template-rampe.json"
        user_id = get_user_id_local()
        if not user_id:
            print("ERRORE: --prepare-two-ramps richiede UserId (MYWHOOSH_USER_ID o input interattivo).")
            return 1
        return cmd_prepare_two_ramps(preview_path, user_id)

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
        if not args.artifact:
            print("ERRORE: --upload richiede --artifact <percorso/file.json>.")
            print("Esempio: python3 tools/mywhoosh_upload_probe.py --upload --artifact 'tools/attempts/attempt_two_ramps_1793552448.json'")
            return 1
        return cmd_upload(Path(args.artifact))

    if args.verify:
        return cmd_verify()

    if args.test_metadata_500:
        test_metadata_http500()
        return 0

    if args.test_backup:
        test_backup_all()
        return 0

    if args.test_two_ramps:
        test_two_ramps_all()
        return 0

    if args.test_upload:
        test_upload_all()
        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
