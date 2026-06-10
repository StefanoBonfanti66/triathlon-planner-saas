# Runbook Operativo: Triathlon Planner SaaS

## 1. Scopo
Questo documento definisce le procedure operative per la gestione del sistema Triathlon Planner SaaS, inclusi l'avvio, il build, il test e le linee guida per la risoluzione dei problemi comuni.

## 2. Ambienti
*   **Sviluppo Locale**: Vite (dev server), Node.js.
*   **Backend**: Supabase (PostgreSQL, Auth). Uso di Edge Functions da verificare secondo roadmap.
*   **Hosting**: Vercel (Produzione/Anteprima) con Vercel Analytics e Speed Insights attivi.

## 3. Avvio Locale
Operare nella directory `app/`:

```bash
# Installazione dipendenze
npm install

# Avvio server di sviluppo
npm run dev
```

## 4. Test e Build
Il sistema richiede la compilazione per verificare i tipi (TypeScript) prima del deploy:

```bash
# Build e Type Checking
npm run build

# Preview del build locale
npm run preview
```

Per i test E2E (Playwright), eseguire (previa installazione dei browser):

```bash
npx playwright test
```

## 5. Troubleshooting
*   **Problemi di Login**: Verificare la validità di `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nel file `.env` locale. Verificare che l'utente di test sia creato correttamente in Supabase Auth.
*   **Dashboard / Dati non caricati**: Verificare nella console del browser se le richieste API falliscono a causa di policy RLS restrittive.
*   **Calendario/Admin**: Verificare che le query eseguite via `supabaseClient.ts` siano coerenti con le strutture dati correnti del database.
*   **Logica Applicativa**: Utilizzare i log di runtime di Vercel (se applicabile) per investigare errori in produzione.

## 6. Checklist Pre-Release
- [ ] `npm run build` completa senza errori di compilazione (TypeScript).
- [ ] Test E2E (`npx playwright test`) superati.
- [ ] Pagine di autenticazione e Dashboard verificano il caricamento dati.
- [ ] Verificare che le policy RLS siano applicate per isolare i dati per `team_id`.
- [ ] Variabili d'ambiente (`VITE_SUPABASE_*`) configurate correttamente su Vercel.

## 7. Handover Tecnico
Prima di un trasferimento di responsabilità:
1.  Verificare l'allineamento di `docs/project/technical-spec.md` con lo stato attuale del repository.
2.  Aggiornare `docs/project/org-chart.md` se sono cambiate le responsabilità operative.
3.  Assicurarsi che la documentazione amministrativa (`docs/admin/`) sia aggiornata riguardo a eventuali cambiamenti di infrastruttura.
