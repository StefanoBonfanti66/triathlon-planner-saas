# 🏊‍♂️ MTT Milano Triathlon Team - Season Planner 2026

Piattaforma Web professionale Full-Stack per la pianificazione agonistica del **MTT**.

## 🚀 Evoluzione Progetto (V3.0)
L'architettura è stata evoluta in una **Multi-Page Application (MPA)** per ospitare strumenti di coordinamento del team e automazioni server-side.

## ✨ Novità Principali

### 🗓️ Calendario Team (Shared View)
- **Coordinamento Social**: Una nuova sezione dedicata dove ogni atleta può vedere quali compagni partecipano a quali gare, raggruppate per mese.
- **Nomi Completi**: Visibilità totale sui partecipanti del team per organizzare trasferte e supporto.

### 🤖 Pipeline Dati Automatica
- **Sincronizzazione Cloud**: I dati delle gare FITRI vengono estratti, processati e caricati automaticamente su Supabase ogni lunedì tramite GitHub Actions.
- **Zero Manutenzione**: Il database rimane aggiornato senza alcun intervento manuale.

### 🧭 Navigazione Avanzata
- **React Router**: Implementazione di un sistema di routing professionale per gestire Dashboard, Calendario Team e Area Login.
- **Header Dinamico**: Navigazione fluida con evidenziazione della pagina attiva.

## 🛠 Stack Tecnologico
- **Frontend**: React 19, TypeScript, Tailwind CSS, Leaflet.js, React Router 7.
- **Backend/DB**: Supabase (PostgreSQL) + RPC (Remote Procedure Calls) per aggregazione dati.
- **Automazione**: Python + Playwright + Supabase Python SDK.
- **CI/CD**: GitHub Actions + Vercel.

### ⚡ Performance & Accessibilità (UX+)
- **Ottimizzazione INP**: Liste gare fluide grazie alla pre-indicizzazione dei partecipanti.
- **Zero CLS**: Interfaccia stabile con prenotazione degli spazi per elementi dinamici.
- **Accessibilità WCAG 2 AA**: Contrasto colori ottimizzato e supporto completo ARIA per lettori di schermo.
- **Branding Ufficiale**: Integrazione Logo MTT in tutta la piattaforma.

---
*Sviluppato da **Stefano Bonfanti** per www.milanotriathlonteam.com • Stagione 2026*
