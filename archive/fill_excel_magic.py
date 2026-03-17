import pandas as pd
from openpyxl import load_workbook
import os

file_path = r'C:\progetti_stefano\automations\calendario_fitri_saas\archive\file gruppi TRI .xlsx'

data = [
    {"Atleta": "Paolo Pellegrino", "Gara": "MilanoTRI - Olimpico", "Team": "MTT Milano Triathlon Team"},
    {"Atleta": "vladimir ceccanti", "Gara": "MilanoTRI - Olimpico", "Team": "MTT Milano Triathlon Team"},
    {"Atleta": "Luca Bacci", "Gara": "MilanoTRI - Olimpico", "Team": "MTT Milano Triathlon Team"},
    {"Atleta": "Stefano Bonfanti", "Gara": "MilanoTRI - Olimpico", "Team": "MTT Milano Triathlon Team"},
    {"Atleta": "Achille Albini", "Gara": "MilanoTRI - Olimpico", "Team": "MTT Milano Triathlon Team"},
    {"Atleta": "Mattia Rigiroli", "Gara": "MilanoTRI - Olimpico", "Team": "MTT Milano Triathlon Team"},
    {"Atleta": "Marco Francesco Quaglia", "Gara": "MilanoTRI - Olimpico", "Team": "MTT Milano Triathlon Team"},
    {"Atleta": "Dorothee Monsigny", "Gara": "MilanoTRI - Olimpico", "Team": "MTT Milano Triathlon Team"},
    {"Atleta": "Silvio Dughera", "Gara": "MilanoTRI - Sprint", "Team": "MTT Milano Triathlon Team"}
]

df_new = pd.DataFrame(data)

if os.path.exists(file_path):
    try:
        # Se il file esiste, prova a caricarlo e aggiungi i dati
        with pd.ExcelWriter(file_path, engine='openpyxl', mode='a', if_sheet_exists='overlay') as writer:
            # Prova a scrivere nel foglio 'Partecipanti' o quello di default
            df_new.to_excel(writer, sheet_name='Partecipanti Milano', index=False)
            print(f"File {file_path} aggiornato con successo.")
    except Exception as e:
        # Se c'è un errore (magari il foglio non esiste), crea un nuovo foglio o riscrivi
        df_new.to_excel(file_path, sheet_name='Partecipanti Milano', index=False)
        print(f"Creato nuovo foglio 'Partecipanti Milano' in {file_path}.")
else:
    df_new.to_excel(file_path, sheet_name='Partecipanti Milano', index=False)
    print(f"File {file_path} creato e popolato con successo.")
