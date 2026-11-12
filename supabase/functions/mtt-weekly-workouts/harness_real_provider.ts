// Harness locale per una prova reale del provider Groq SENZA persistenza.
// Non crea client DB, non esegue upsert, non invia notifiche.
// Effettua una sola chiamata diretta al provider, nessun retry.
// Legge LLM_API_KEY da Deno.env senza stamparla.
// Eseguire solo dopo aver configurato LLM_API_KEY nell'ambiente locale.
// Comando: LLM_API_KEY=<chiave> deno run --allow-env --allow-net supabase/functions/mtt-weekly-workouts/harness_real_provider.ts

import { renderWithLLM, type LlmResult } from './index.ts'
import { buildWeekSkeleton, dateFromIsoWeek } from './periodization.ts'

const apiKey = Deno.env.get('LLM_API_KEY')
if (!apiKey) {
  console.error('LLM_API_KEY non configurata. Impostala nell\'ambiente prima di eseguire l\'harness.')
  Deno.exit(1)
}

// Stesso input usato dal percorso reale per la settimana 46/2026.
const skeleton = buildWeekSkeleton(dateFromIsoWeek(2026, 46))

// Una sola chiamata diretta al provider (fetch reale, nessun mock).
const result: LlmResult = await renderWithLLM(skeleton, 2026, 46)

// Output ristretto: nessun segreto, nessun prompt, nessun contenuto completo.
console.log(JSON.stringify({
  kind: result.kind,
  model: result.model ?? null,
  status: result.status ?? null,
  finish_reason: result.finishReason ?? null,
  tokens: result.tokens ?? null,
  ai_used: result.kind === 'ai-ok',
  validation: result.kind === 'ai-ok'
    ? 'ok'
    : (result.validationError ?? result.parseError ?? result.message ?? 'nessuna validazione'),
}, null, 2))
