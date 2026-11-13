import { assertEquals, assert, assertExists } from 'jsr:@std/assert@1'
import {
  buildWeekSkeleton,
  dateFromIsoWeek,
} from './periodization.ts'
import { buildNewsletterHtml, newsletterPlainText } from './newsletter.ts'
import {
  renderWithLLM,
  handleGenerate,
  validateContent,
  workoutJsonSchema,
  type LlmCause,
  type LlmResult,
} from './index.ts'

const skeleton = buildWeekSkeleton(dateFromIsoWeek(2026, 46))

function mockFetchFactory(overrides: {
  status?: number
  ok?: boolean
  body?: unknown
  finishReason?: string | null
  headers?: Record<string, string>
  throwOnRequest?: boolean
}): typeof fetch {
  return async (): Promise<Response> => {
    if (overrides.throwOnRequest) throw new Error('network down')
    const bodyText = typeof overrides.body === 'string'
      ? overrides.body
      : JSON.stringify(overrides.body ?? {})
    return new Response(bodyText, {
      status: overrides.status ?? 200,
      statusText: overrides.ok === false ? 'Error' : 'OK',
      headers: {
        'content-type': 'application/json',
        ...overrides.headers,
      } as HeadersInit,
    }) as unknown as Response
  }
}

function choice(content: string | null, finishReason: string | null = 'stop') {
  return {
    choices: [{ message: { role: 'assistant', content }, finish_reason: finishReason }],
    usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
  }
}

const validContent = {
  title: 'Allenamenti MTT - Settimana 46/2026 · Forza e tecnica (sett. 2/4)',
  intro: 'Intro di test',
  notes: 'Note di test',
  swim: [{
    discipline: 'swim', title: 'Nuoto gruppo', day: 'Giovedì', duration: '60min',
    warmup: ['w'], main: ['m'], cooldown: ['c'], tips: ['t'],
  }],
  bike: [{
    discipline: 'bike', title: 'Bici tecnica', day: 'Mercoledì', duration: '60min',
    warmup: ['w'], main: ['m'], cooldown: ['c'], tips: ['t'],
  }],
  run: [{
    discipline: 'run', title: 'Corsa gruppo', day: 'Martedì', duration: '60min',
    warmup: ['w'], main: ['m'], cooldown: ['c'], tips: ['t'],
  }],
  strength: [{
    discipline: 'strength', title: 'Forza A', day: 'Lunedì', duration: '40min',
    warmup: ['w'], main: ['m'], cooldown: ['c'], tips: ['t'],
  }],
  tips_by_discipline: { swim: ['s'], bike: ['b'], run: ['r'], strength: ['st'] },
  adaptation_tips: { ftp: 'ftp', vo2max: 'vo2', pace: 'pace' },
  newsletter: { subject: 'subj', intro: 'nl intro', extra: '' },
}

// ---------- supabase mock per handleGenerate ----------

function makeMockSupabase(opts: {
  existingStatus?: 'draft' | 'sent' | null
  prevContent?: Record<string, unknown> | null
  capturedUpsert?: Array<{ payload: any }>
}) {
  const calls: Array<{ table: string; op: string; payload: any }> = []
  const base: any = {
    from: (table: string) => ({
      select: (_cols: string) => {
        calls.push({ table, op: 'select', payload: _cols })
        return chain
      },
      upsert: (payload: any, _opts: any) => {
        calls.push({ table, op: 'upsert', payload })
        opts.capturedUpsert!.push({ payload })
        return {
          select: () => ({
            single: async () => ({ data: { id: 'upserted', ...payload }, error: null })
          })
        }
      }
    })
  }
  const chain: any = {
    eq: (_col: string, _val: any) => {
      calls.push({ table: 'team_workouts', op: 'eq', payload: `${_col}=${_val}` })
      return chain
    },
    maybeSingle: async () => {
      // Legge l'ultimo eq per sapere il week_number
      const lastEq = calls.filter((c) => c.op === 'eq').pop()
      const weekNum = lastEq ? Number(String(lastEq.payload).split('=')[1]) : null
      if (weekNum === 46) {
        return { data: opts.existingStatus === 'sent' ? { status: 'sent' } : null, error: null }
      }
      if (weekNum === 45) {
        return { data: opts.prevContent ? { content: opts.prevContent } : null, error: null }
      }
      return { data: null, error: null }
    }
  }
  return { client: base, calls }
}

Deno.test('validateContent accetta contenuto valido', () => {
  assertEquals(validateContent(validContent, skeleton), null)
})

Deno.test('validateContent rifiuta titolo mancante', () => {
  const bad = { ...validContent } as Record<string, unknown>
  delete bad.title
  assertEquals(validateContent(bad, skeleton), 'title mancante')
})

Deno.test('validateContent rifiuta swim vuoto', () => {
  const bad = { ...validContent } as Record<string, unknown>
  bad.swim = []
  assertEquals(validateContent(bad, skeleton), 'swim vuoto')
})

Deno.test('workoutJsonSchema è strict con additionalProperties false', () => {
  const schema = workoutJsonSchema as Record<string, unknown>
  assertEquals(schema.type, 'object')
  assertEquals(schema.additionalProperties, false)
  const props = schema.properties as Record<string, unknown>
  assertExists(props.swim)
  assertExists(props.bike)
  assertExists(props.run)
  assertExists(props.strength)
  assertExists(props.tips_by_discipline)
  assertExists(props.adaptation_tips)
  assertExists(props.newsletter)
  const nl = props.newsletter as Record<string, unknown>
  assertEquals(nl.additionalProperties, false)
  assertEquals((nl.required as string[]).includes('subject'), true)
  assertEquals((nl.required as string[]).includes('intro'), true)
  assertEquals((nl.required as string[]).includes('extra'), true)
  const swimItems = (props.swim as Record<string, unknown>).items as Record<string, unknown>
  assertEquals(swimItems.additionalProperties, false)
})

Deno.test('ogni oggetto nello schema ha required == chiavi di properties e additionalProperties false', () => {
  function checkObject(node: Record<string, unknown>, path: string): void {
    if (node.type !== 'object') return
    assertEquals(node.additionalProperties, false, `${path}: additionalProperties deve essere false`)
    const props = (node.properties ?? {}) as Record<string, unknown>
    const required = (node.required ?? []) as string[]
    const propKeys = Object.keys(props).sort()
    const reqKeys = [...required].sort()
    assertEquals(reqKeys, propKeys, `${path}: required deve contenere esattamente tutte le chiavi di properties`)
    // Attraversa gli item e i rami compositi
    for (const [key, child] of Object.entries(props)) {
      const childPath = `${path}.${key}`
      if (typeof child === 'object' && child !== null) {
        const c = child as Record<string, unknown>
        if (c.type === 'object') {
          checkObject(c, childPath)
        }
        if (c.items && typeof c.items === 'object') {
          const items = c.items as Record<string, unknown>
          if (items.type === 'object') {
            checkObject(items, `${childPath}[]`)
          }
        }
      }
    }
  }
  checkObject(workoutJsonSchema as Record<string, unknown>, 'root')
})

Deno.test('risposta completa valida → percorso AI, body con max_completion_tokens e reasoning_effort', async () => {
  Deno.env.set('LLM_API_KEY', 'test-key')
  let capturedBody: string | null = null
  const fetchMock = async (): Promise<Response> => {
    capturedBody = JSON.stringify({ model: 'openai/gpt-oss-120b' }) // placeholder, body letto sotto
    return new Response(JSON.stringify(choice(JSON.stringify(validContent))), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }) as unknown as Response
  }
  // Intercetta il body reale passando un fetch che lo cattura
  let realBody: string | null = null
  const fetchMock2 = async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    realBody = typeof init?.body === 'string' ? init.body : null
    return new Response(JSON.stringify(choice(JSON.stringify(validContent))), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }) as unknown as Response
  }
  const result = await renderWithLLM(skeleton, 2026, 46, undefined, fetchMock2) as LlmResult
  assertEquals(result.kind, 'ai-ok')
  assertExists(result.content)
  assertEquals(result.content?.title, validContent.title)
  assertEquals(result.model, 'openai/gpt-oss-120b')
  assertExists(result.tokens)
  assertEquals(result.tokens?.total, 300)
  assertEquals(result.finishReason, 'stop')
  assertExists(realBody)
  const body = JSON.parse(realBody!)
  assertEquals(body.response_format.type, 'json_schema')
  assertEquals(body.response_format.json_schema.strict, true)
  assertEquals(body.response_format.json_schema.name, 'workout_plan')
  assertEquals(body.response_format.json_schema.schema.additionalProperties, false)
  assertEquals(body.max_completion_tokens, 4000)
  assertEquals(body.reasoning_effort, 'low')
  assertEquals(body.messages.length, 2)
  Deno.env.delete('LLM_API_KEY')
})

Deno.test('newsletter: stessa intro e stesso dettaglio dell\'app', () => {
  const html = buildNewsletterHtml(validContent, 46, 2026)
  assert(html.includes('Intro di test'), 'deve usare content.intro')
  assert(!html.includes('nl intro'), 'non deve usare newsletter.intro')
  assert(html.includes('Riscaldamento'))
  assert(html.includes('Defaticamento'))
  assert(html.includes('Come adattare in base alle tue capacità'))
  assert(html.includes('Consigli Nuoto'))

  const text = newsletterPlainText(validContent, 46, 2026)
  assert(text.includes('Intro di test'))
  assert(!text.includes('nl intro'))
  assert(text.includes('Riscaldamento:'))
  assert(text.includes('Defaticamento:'))
  assert(text.includes('COME ADATTARE IN BASE ALLE TUE CAPACITÀ'))
})

Deno.test('applySkeletonMeta reintegra il rimando alla seduta alternativa di nuoto', async () => {
  Deno.env.set('LLM_API_KEY', 'test-key')
  const fetchMock = mockFetchFactory({ body: choice(JSON.stringify(validContent)) })
  const result = await renderWithLLM(skeleton, 2026, 46, undefined, fetchMock) as LlmResult
  assertEquals(result.kind, 'ai-ok')
  const swim = (result.content as { swim: Array<{ title: string; main: string[] }> }).swim
  const group = swim.find((b) => /gruppo/i.test(b.title))!
  assertExists(group)
  assertEquals(group.main.filter((l) => l.includes('Tecnica e variazioni')).length, 1)
  Deno.env.delete('LLM_API_KEY')
})

Deno.test('finish_reason length → truncated, rifiuto contenuto incompleto', async () => {
  Deno.env.set('LLM_API_KEY', 'test-key')
  const fetchMock = mockFetchFactory({ body: choice(JSON.stringify(validContent), 'length') })
  const result = await renderWithLLM(skeleton, 2026, 46, undefined, fetchMock) as LlmResult
  assertEquals(result.kind, 'truncated')
  assertEquals(result.finishReason, 'length')
  assertEquals(result.status, 200)
  Deno.env.delete('LLM_API_KEY')
})

Deno.test('finish_reason content_filter → model-refusal (rifiuto modello)', async () => {
  Deno.env.set('LLM_API_KEY', 'test-key')
  const fetchMock = mockFetchFactory({ body: choice(null, 'content_filter') })
  const result = await renderWithLLM(skeleton, 2026, 46, undefined, fetchMock) as LlmResult
  assertEquals(result.kind, 'model-refusal')
  assertEquals(result.finishReason, 'content_filter')
  assertEquals(result.status, 200)
  Deno.env.delete('LLM_API_KEY')
})

Deno.test('finish_reason mancante (null) → unexpected-finish-reason', async () => {
  Deno.env.set('LLM_API_KEY', 'test-key')
  const fetchMock = mockFetchFactory({ body: choice(JSON.stringify(validContent), null) })
  const result = await renderWithLLM(skeleton, 2026, 46, undefined, fetchMock) as LlmResult
  assertEquals(result.kind, 'unexpected-finish-reason')
  assertEquals(result.finishReason, null)
  assertEquals(result.status, 200)
  Deno.env.delete('LLM_API_KEY')
})

Deno.test('finish_reason inatteso (tool_calls) → unexpected-finish-reason', async () => {
  Deno.env.set('LLM_API_KEY', 'test-key')
  const fetchMock = mockFetchFactory({ body: choice(JSON.stringify(validContent), 'tool_calls') })
  const result = await renderWithLLM(skeleton, 2026, 46, undefined, fetchMock) as LlmResult
  assertEquals(result.kind, 'unexpected-finish-reason')
  assertEquals(result.finishReason, 'tool_calls')
  assertEquals(result.status, 200)
  Deno.env.delete('LLM_API_KEY')
})

Deno.test('contenuto vuoto → empty-content', async () => {
  Deno.env.set('LLM_API_KEY', 'test-key')
  const fetchMock = mockFetchFactory({ body: choice(null) })
  const result = await renderWithLLM(skeleton, 2026, 46, undefined, fetchMock) as LlmResult
  assertEquals(result.kind, 'empty-content')
  assertEquals(result.status, 200)
  Deno.env.delete('LLM_API_KEY')
})

Deno.test('JSON valido ma contenuto applicativamente non valido → validation-failed', async () => {
  Deno.env.set('LLM_API_KEY', 'test-key')
  const bad = { ...validContent } as Record<string, unknown>
  delete bad.swim
  const fetchMock = mockFetchFactory({ body: choice(JSON.stringify(bad)) })
  const result = await renderWithLLM(skeleton, 2026, 46, undefined, fetchMock) as LlmResult
  assertEquals(result.kind, 'validation-failed')
  assertEquals(result.status, 200)
  assertExists(result.validationError)
  Deno.env.delete('LLM_API_KEY')
})

Deno.test('HTTP 429 → rate-limit', async () => {
  Deno.env.set('LLM_API_KEY', 'test-key')
  const fetchMock = mockFetchFactory({
    status: 429, ok: false, headers: { 'Retry-After': '10' }, body: { error: { message: 'rate limit' } },
  })
  const result = await renderWithLLM(skeleton, 2026, 46, undefined, fetchMock) as LlmResult
  assertEquals(result.kind, 'rate-limit')
  assertEquals(result.status, 429)
  assertEquals(result.retryAfter, 10)
  Deno.env.delete('LLM_API_KEY')
})

Deno.test('configurazione mancante → config-missing', async () => {
  Deno.env.delete('LLM_API_KEY')
  const result = await renderWithLLM(skeleton, 2026, 46) as LlmResult
  assertEquals(result.kind, 'config-missing')
  assertEquals(result.content, undefined)
})

// ---------- Contratto applicativo: handleGenerate ----------

Deno.test('handleGenerate: ai-ok → generated_by=ai e contenuto AI salvato', async () => {
  Deno.env.set('LLM_API_KEY', 'test-key')
  const captured: Array<{ payload: any }> = []
  const sb = makeMockSupabase({ existingStatus: null, prevContent: null, capturedUpsert: captured })
  const fetchMock = mockFetchFactory({ body: choice(JSON.stringify(validContent)) })
  const { data } = await handleGenerate(sb.client, 2026, 46, fetchMock)
  assertEquals(data.generated_by, 'ai')
  assertExists(data.content)
  assertEquals((data.content as Record<string, unknown>).title, validContent.title)
  Deno.env.delete('LLM_API_KEY')
})

Deno.test('handleGenerate: model-refusal → generated_by=rules con causa, nessun contenuto AI salvato', async () => {
  Deno.env.set('LLM_API_KEY', 'test-key')
  const captured: Array<{ payload: any }> = []
  const sb = makeMockSupabase({ existingStatus: null, prevContent: null, capturedUpsert: captured })
  const fetchMock = mockFetchFactory({ body: choice(null, 'content_filter') })
  const { data } = await handleGenerate(sb.client, 2026, 46, fetchMock)
  assertEquals(data.generated_by, 'rules')
  assertExists(data.ai_prompt_used)
  assert(data.ai_prompt_used.includes('none (model-refusal)'), 'ai_prompt_used deve riportare la causa: ' + data.ai_prompt_used)
  // Il contenuto salvato deve essere il fallback statico, non il contenuto AI invalido/assente
  assertEquals((data.content as Record<string, unknown>).title, skeletonTitleExpected(2026, 46))
  Deno.env.delete('LLM_API_KEY')
})

Deno.test('handleGenerate: validazione applicativa fallita → generated_by=rules, contenuto invalido non salvato come AI', async () => {
  Deno.env.set('LLM_API_KEY', 'test-key')
  const captured: Array<{ payload: any }> = []
  const sb = makeMockSupabase({ existingStatus: null, prevContent: null, capturedUpsert: captured })
  const bad = { ...validContent } as Record<string, unknown>
  delete bad.swim
  const fetchMock = mockFetchFactory({ body: choice(JSON.stringify(bad)) })
  const { data } = await handleGenerate(sb.client, 2026, 46, fetchMock)
  assertEquals(data.generated_by, 'rules')
  assert(data.ai_prompt_used.includes('validation-failed'), 'causa deve essere validation-failed: ' + data.ai_prompt_used)
  // Contenuto statico, non il JSON invalido dell'LLM
  assertEquals(((data.content as Record<string, unknown>).swim as unknown[]).length, 3)
  Deno.env.delete('LLM_API_KEY')
})

Deno.test('handleGenerate: errore HTTP → generated_by=rules, nessuna scrittura di contenuto AI', async () => {
  Deno.env.set('LLM_API_KEY', 'test-key')
  const captured: Array<{ payload: any }> = []
  const sb = makeMockSupabase({ existingStatus: null, prevContent: null, capturedUpsert: captured })
  const fetchMock = mockFetchFactory({ status: 404, ok: false, body: { error: { message: 'not found' } } })
  const { data } = await handleGenerate(sb.client, 2026, 46, fetchMock)
  assertEquals(data.generated_by, 'rules')
  assert(data.ai_prompt_used.includes('http-error'), 'causa deve essere http-error: ' + data.ai_prompt_used)
  Deno.env.delete('LLM_API_KEY')
})

Deno.test('handleGenerate: config mancante → generated_by=rules senza chiamata al provider', async () => {
  Deno.env.delete('LLM_API_KEY')
  const captured: Array<{ payload: any }> = []
  const sb = makeMockSupabase({ existingStatus: null, prevContent: null, capturedUpsert: captured })
  const { data } = await handleGenerate(sb.client, 2026, 46)
  assertEquals(data.generated_by, 'rules')
  assert(data.ai_prompt_used.includes('config-missing'), 'causa deve essere config-missing: ' + data.ai_prompt_used)
})

function skeletonTitleExpected(year: number, week: number): string {
  return `Allenamenti MTT - Settimana ${week}/${year} · Forza e tecnica (sett. 2/4)`
}
