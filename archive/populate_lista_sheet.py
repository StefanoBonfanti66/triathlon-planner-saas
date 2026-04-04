import pandas as pd
from openpyxl import load_workbook
import os

file_path = r'C:\progetti_stefano\automations\calendario_fitri_saas\archive\file gruppi TRI .xlsx'
sheet_name = 'lista'

# Dati estratti da Supabase
raw_data = [
    {"full_name": "Paolo Pellegrino ", "license_number": "65172/A200665", "birth_year": "1969", "race_title": "MilanoTRI - Olimpico", "team_name": "MTT Milano Triathlon Team"},
    {"full_name": "vladimir ceccanti", "license_number": "128970", "birth_year": "1980", "race_title": "MilanoTRI - Olimpico", "team_name": "MTT Milano Triathlon Team"},
    {"full_name": "Luca Bacci", "license_number": "68660/A200271", "birth_year": "1968", "race_title": "MilanoTRI - Olimpico", "team_name": "MTT Milano Triathlon Team"},
    {"full_name": "Stefano Bonfanti", "license_number": "106925/A246799", "birth_year": "1966", "race_title": "MilanoTRI - Olimpico", "team_name": "MTT Milano Triathlon Team"},
    {"full_name": "Achille Albini", "license_number": "43981/A211013", "birth_year": "1970", "race_title": "MilanoTRI - Olimpico", "team_name": "MTT Milano Triathlon Team"},
    {"full_name": "Mattia Rigiroli", "license_number": "146243", "birth_year": "1997", "race_title": "MilanoTRI - Olimpico", "team_name": "MTT Milano Triathlon Team"},
    {"full_name": "Marco Francesco Quaglia", "license_number": "", "birth_year": "1970", "race_title": "MilanoTRI - Olimpico", "team_name": "MTT Milano Triathlon Team"},
    {"full_name": "Silvio Dughera ", "license_number": "1443/A361933", "birth_year": "1965", "race_title": "MilanoTRI - Sprint", "team_name": "MTT Milano Triathlon Team"},
    {"full_name": "Dorothee Monsigny", "license_number": "", "birth_year": "1981", "race_title": "MilanoTRI - Olimpico", "team_name": "MTT Milano Triathlon Team"}
]

# Colonne richieste nel foglio 'lista'
columns = [
    'GARA', 'Cognome', 'Nome', 'Sesso', 'email (NON inserire mail uguali) ',
    'data di nascita solo questo formato GG/MM/AAAA', 'nazionalità', 'Indirizzo',
    'Città', 'provincia', 'Stato', 'CAP', 'telefono', 'Nome Squadra',
    'Codice Squadra', 'Numero Tesseramento FITRI', 'Taglia Maglietta'
]

def process_name(full_name):
    parts = full_name.strip().split(' ')
    if len(parts) >= 2:
        return ' '.join(parts[1:]), parts[0] # Assume Nome Cognome -> Ritorna Cognome, Nome
    return "", parts[0]

formatted_data = []
for item in raw_data:
    cognome, nome = process_name(item['full_name'])
    race = "Olimpico" if "Olimpico" in item['race_title'] else "Sprint"
    
    row = {
        'GARA': race,
        'Cognome': cognome,
        'Nome': nome,
        'Sesso': '', # Non disponibile, da compilare se noto
        'email (NON inserire mail uguali) ': '',
        'data di nascita solo questo formato GG/MM/AAAA': f"01/01/{item['birth_year']}", # Usiamo anno per format
        'nazionalità': 'Italiana',
        'Indirizzo': '',
        'Città': '',
        'provincia': '',
        'Stato': 'Italia',
        'CAP': '',
        'telefono': '',
        'Nome Squadra': 'MTT Milano Triathlon Team',
        'Codice Squadra': '2566',
        'Numero Tesseramento FITRI': item['license_number'],
        'Taglia Maglietta': ''
    }
    formatted_data.append(row)

df_to_write = pd.DataFrame(formatted_data, columns=columns)

# Scrittura sul foglio esistente 'lista'
with pd.ExcelWriter(file_path, engine='openpyxl', mode='a', if_sheet_exists='overlay') as writer:
    # Cerchiamo di scrivere i dati partendo dalla seconda riga (se le intestazioni sono già presenti)
    df_to_write.to_excel(writer, sheet_name=sheet_name, index=False, header=True)

print(f"Magia completata! Foglio '{sheet_name}' popolato con successo.")
