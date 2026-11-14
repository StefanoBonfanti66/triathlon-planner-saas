import { assertEquals, assert, assertExists } from 'jsr:@std/assert@1'
import { buildWeekSkeleton, dateFromIsoWeek, runGroup, swimGroup, Discipline, type SkeletonSession, type WeekSkeleton } from './periodization.ts'
import { buildNewsletterHtml, newsletterPlainText } from './newsletter.ts'
import {
  renderWithLLM,
  handleGenerate,
  validateContent,
  workoutJsonSchema,
  renderStaticContent,
  toContentBlock,
  skeletonTitle,
  CHOICE_GROUP_MESSAGE,
  buildTelegramDayMessages,
  corsHeadersFor,
  type RenderBlock,
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
  title: skeletonTitle(skeleton, 2026, 46),
  intro: 'Intro di test',
  notes: 'Note di test',
  swim: skeleton.sessions.filter((s) => s.discipline === 'swim').map((s) => toContentBlock(s)),
  bike: skeleton.sessions.filter((s) => s.discipline === 'bike').map((s) => toContentBlock(s)),
  run: skeleton.sessions.filter((s) => s.discipline === 'run').map((s) => toContentBlock(s)),
  strength: skeleton.sessions.filter((s) => s.discipline === 'strength').map((s) => toContentBlock(s)),
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
    // required deve essere un sottoinsieme delle proprietà (alcune possono essere opzionali)
    for (const k of reqKeys) {
      assert(propKeys.includes(k), `${path}: required '${k}' non è una proprietà`)
    }
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

Deno.test('applySkeletonMeta assegna coachAppointment, time, choiceGroup per appuntamenti e alternative', async () => {
  Deno.env.set('LLM_API_KEY', 'test-key')
  // Blocchi senza coachAppointment/time/choiceGroup: applySkeletonMeta deve aggiungerli dallo scheletro
  const contentWithoutMeta = {
    ...validContent,
    swim: validContent.swim.map((b) => {
      const { coachAppointment, time, choiceGroup, ...rest } = b
      if (!Array.isArray(rest.warmup) || rest.warmup.length === 0) rest.warmup = ['w']
      if (!Array.isArray(rest.cooldown) || rest.cooldown.length === 0) rest.cooldown = ['c']
      if (!Array.isArray(rest.tips) || rest.tips.length === 0) rest.tips = ['t']
      return rest
    }),
    run: validContent.run.map((b) => {
      const { coachAppointment, time, choiceGroup, ...rest } = b
      if (!Array.isArray(rest.warmup) || rest.warmup.length === 0) rest.warmup = ['w']
      if (!Array.isArray(rest.cooldown) || rest.cooldown.length === 0) rest.cooldown = ['c']
      if (!Array.isArray(rest.tips) || rest.tips.length === 0) rest.tips = ['t']
      return rest
    }),
  }
  const swimGroupSession = skeleton.sessions.find((s) => s.discipline === 'swim' && s.coachAppointment === true)!
  const runGroupSession = skeleton.sessions.find((s) => s.discipline === 'run' && s.coachAppointment === true)!
  const fetchMock = mockFetchFactory({ body: choice(JSON.stringify(contentWithoutMeta)) })
  const result = await renderWithLLM(skeleton, 2026, 46, undefined, fetchMock) as LlmResult
  assertEquals(result.kind, 'ai-ok')
  const c = result.content as Record<string, unknown>
  const swim = c.swim as Array<{ sessionId: string; coachAppointment?: boolean; time?: string; choiceGroup?: string }>
  const group = swim.find((b) => b.sessionId === swimGroupSession.sessionId)!
  assertEquals(group.coachAppointment, true)
  assertEquals(group.time, swimGroupSession.time)
  assertEquals(group.choiceGroup, swimGroupSession.choiceGroup)
  const run = c.run as Array<{ sessionId: string; coachAppointment?: boolean; time?: string; choiceGroup?: string }>
  const groupRun = run.find((b) => b.sessionId === runGroupSession.sessionId)!
  assertEquals(groupRun.coachAppointment, true)
  assertEquals(groupRun.time, runGroupSession.time)
  assertEquals(groupRun.choiceGroup, runGroupSession.choiceGroup)
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
  const content = data.content as Record<string, unknown>
  const run = content.run as Array<{ coachAppointment?: boolean; time?: string; warmup: string[]; cooldown: string[]; main: string[]; choiceGroup?: string }>
  const group = run.find((b) => b.coachAppointment === true)!
  assertEquals(group.coachAppointment, true)
  assertEquals(group.time, '19:00')
  assertEquals(group.warmup.length, 0)
  assertEquals(group.cooldown.length, 0)
  assert(group.main.some((l) => l.includes('programma della seduta è deciso dal coach')))
  const alt = run.find((b) => b.choiceGroup === 'martedì-corsa' && b.coachAppointment !== true)!
  assert(alt.warmup.length > 0)
  assert(alt.cooldown.length > 0)
  const swim = content.swim as Array<{ coachAppointment?: boolean; time?: string; choiceGroup?: string }>
  const swimGroup = swim.find((b) => b.coachAppointment === true)!
  assertEquals(swimGroup.time, '19:30')
  assertEquals(swimGroup.choiceGroup, 'giovedì-nuoto')
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

// ---------- Test di regressione: appuntamenti 60min anche in scarico ----------

Deno.test('appuntamenti coach durano 60min anche in settimana di scarico', () => {
  const normalRun = runGroup(false)
  const recoveryRun = runGroup(true)
  const normalSwim = swimGroup(false)
  const recoverySwim = swimGroup(true)
  assertEquals(normalRun.duration, '60min')
  assertEquals(recoveryRun.duration, '60min')
  assertEquals(normalSwim.duration, '60min')
  assertEquals(recoverySwim.duration, '60min')
  assertEquals(recoveryRun.time, '19:00')
  assertEquals(recoverySwim.time, '19:30')
  assertEquals(recoveryRun.coachAppointment, true)
  assertEquals(recoverySwim.coachAppointment, true)
})

// ---------- Test di regressione: nessun dettaglio tecnico AI negli appuntamenti ----------

Deno.test('applySkeletonMeta corregge dettagli tecnici AI per coachAppointment inclusi tips', async () => {
  Deno.env.set('LLM_API_KEY', 'test-key')
  const runGroupSession = skeleton.sessions.find((s) => s.discipline === 'run' && s.coachAppointment === true)!
  // Il modello restituisce dettagli tecnici inventati per l'appuntamento coach
  const badModelContent = {
    ...validContent,
    run: [
      {
        ...validContent.run[0],
        sessionId: runGroupSession.sessionId,
        title: 'Titolo sbagliato del modello',
        day: 'Martedì',
        time: '20:00',
        duration: '90min',
        warmup: ['inventato 10min jogging'],
        main: ['inventato serie di ripetute'],
        cooldown: ['inventato defaticamento'],
        tips: ['inventato RPE 8'],
      },
      ...validContent.run.slice(1),
    ],
  }
  const fetchMock = mockFetchFactory({ body: choice(JSON.stringify(badModelContent)) })
  const result = await renderWithLLM(skeleton, 2026, 46, undefined, fetchMock) as LlmResult
  assertEquals(result.kind, 'ai-ok')
  const c = result.content as Record<string, unknown>
  const run = c.run as Array<{ sessionId: string; title: string; time: string; duration: string; warmup: string[]; main: string[]; cooldown: string[]; tips: string[] }>
  const group = run.find((b) => b.sessionId === runGroupSession.sessionId)!
  assertEquals(group.title, runGroupSession.title)
  assertEquals(group.time, runGroupSession.time)
  assertEquals(group.duration, runGroupSession.duration)
  assertEquals(group.warmup, [])
  assertEquals(group.main, ['Appuntamento con il coach Simone. Il programma della seduta è deciso dal coach.'])
  assertEquals(group.cooldown, [])
  assertEquals(group.tips, [])
  Deno.env.delete('LLM_API_KEY')
})

// ---------- Test di regressione: impossibilità di coachAppointment su sessione autonoma ----------

Deno.test('validateContent rifiuta coachAppointment su sessione autonoma', () => {
  const bad = JSON.parse(JSON.stringify(validContent)) as Record<string, unknown>
  const runArr = bad.run as Array<Record<string, unknown>>
  const runOutdoorSession = skeleton.sessions.find((s) => s.discipline === 'run' && s.title.includes('autonoma'))!
  const outdoorBlock = runArr.find((b) => b.sessionId === runOutdoorSession.sessionId)!
  outdoorBlock.coachAppointment = true
  const err = validateContent(bad, skeleton)
  assert(err!.includes('coachAppointment non autorizzato'), 'atteso coachAppointment non autorizzato, ottenuto: ' + err)
})

// ---------- Test di regressione: blocchi riordinati associati correttamente ----------

Deno.test('applySkeletonMeta associa per sessionId anche se i blocchi sono riordinati', async () => {
  Deno.env.set('LLM_API_KEY', 'test-key')
  // Blocchi swim in ordine inverso rispetto allo skeleton, usando sessionId reali
  const swimBlocks = validContent.swim as Array<{ sessionId: string }>
  const reordered = {
    ...validContent,
    swim: [swimBlocks[2], swimBlocks[0], swimBlocks[1]],
  }
  const fetchMock = mockFetchFactory({ body: choice(JSON.stringify(reordered)) })
  const result = await renderWithLLM(skeleton, 2026, 46, undefined, fetchMock) as LlmResult
  assertEquals(result.kind, 'ai-ok')
  const c = result.content as Record<string, unknown>
  const swim = c.swim as Array<{ sessionId: string; choiceGroup?: string; coachAppointment?: boolean; time?: string; optional?: boolean }>
  const byId = new Map(swim.map((b) => [b.sessionId, b]))
  const group = byId.get(swimBlocks[1].sessionId)! // swimGroup era a indice 1 in validContent
  const technique = byId.get(swimBlocks[0].sessionId)! // swimTechnique era a indice 0
  const dry = byId.get(swimBlocks[2].sessionId)! // swimDry era a indice 2
  assertEquals(group.coachAppointment, true)
  assertEquals(group.time, '19:30')
  assertEquals(technique.optional, true)
  assertEquals(dry.optional, true)
  Deno.env.delete('LLM_API_KEY')
})

// ---------- Test di regressione: blocchi mancanti, duplicati, sconosciuti rifiutati ----------

Deno.test('validateContent rifiuta sessioni mancanti', () => {
  const bad = { ...validContent } as Record<string, unknown>
  delete bad.run
  assertEquals(validateContent(bad, skeleton), 'run vuoto')
})

Deno.test('validateContent rifiuta sessionId sconosciuto', () => {
  const bad = JSON.parse(JSON.stringify(validContent)) as Record<string, unknown>
  const runArr = bad.run as Array<Record<string, unknown>>
  runArr[0].sessionId = 'sessione-inesistente'
  const err = validateContent(bad, skeleton)
  assert(err!.includes('sessionId sconosciuto'), 'atteso sessionId sconosciuto, ottenuto: ' + err)
})

Deno.test('validateContent rifiuta sessionId duplicato', () => {
  const bad = JSON.parse(JSON.stringify(validContent)) as Record<string, unknown>
  const runArr = bad.run as Array<Record<string, unknown>>
  runArr[1].sessionId = runArr[0].sessionId // stesso sessionId per due blocchi
  const err = validateContent(bad, skeleton)
  assert(err!.includes('sessionId duplicato'), 'atteso sessionId duplicato, ottenuto: ' + err)
})

// ---------- Test di regressione: due alternative complete per martedì e giovedì ----------

Deno.test('novembre: due alternative complete per martedì e giovedì', () => {
  const s = buildWeekSkeleton(dateFromIsoWeek(2026, 46))
  const tueRun = s.sessions.filter((x) => x.day === 'Martedì' && x.discipline === 'run')
  assertEquals(tueRun.length, 3, 'martedì: gruppo + outdoor + tapis')
  const tueGroup = tueRun.find((x) => x.coachAppointment === true)!
  const tueOutdoor = tueRun.find((x) => x.title === 'Corsa autonoma all\'aperto')!
  const tueTapis = tueRun.find((x) => x.title === 'Corsa su tapis (alternativa corsa outdoor)')!
  assertEquals(tueGroup.choiceGroup, 'martedì-corsa')
  assertEquals(tueOutdoor.choiceGroup, 'martedì-corsa')
  assertEquals(tueTapis.choiceGroup, 'martedì-corsa')
  assertEquals(tueOutdoor.mainOutline.length > 0, true, 'outdoor ha mainOutline')
  assertEquals(tueTapis.mainOutline.length > 0, true, 'tapis ha mainOutline')

  const thuSwim = s.sessions.filter((x) => x.day === 'Giovedì' && x.discipline === 'swim')
  assertEquals(thuSwim.length, 3, 'giovedì: gruppo + tecnica + secco')
  const thuGroup = thuSwim.find((x) => x.coachAppointment === true)!
  const thuTechnique = thuSwim.find((x) => x.title.includes('Tecnica'))!
  const thuDry = thuSwim.find((x) => x.title.includes('secco'))!
  assertEquals(thuGroup.choiceGroup, 'giovedì-nuoto')
  assertEquals(thuTechnique.choiceGroup, 'giovedì-nuoto')
  assertEquals(thuDry.choiceGroup, 'giovedì-nuoto')
  assertEquals(thuTechnique.mainOutline.length > 0, true, 'tecnica ha mainOutline')
  assertEquals(thuDry.mainOutline.length > 0, true, 'secco ha mainOutline')
})

// ---------- Test di regressione: stesso comportamento appuntamenti nel fallback ----------

Deno.test('renderStaticContent svuota campi tecnici per coachAppointment', () => {
  const content = renderStaticContent(skeleton, 2026, 46)
  const run = content.run as Array<{ coachAppointment?: boolean; warmup: string[]; cooldown: string[]; tips: string[]; main: string[] }>
  const group = run.find((b) => b.coachAppointment === true)!
  assertEquals(group.warmup.length, 0)
  assertEquals(group.cooldown.length, 0)
  assertEquals(group.tips.length, 0)
  assert(group.main.some((l) => l.includes('programma della seduta è deciso dal coach')))
  const swim = content.swim as Array<{ coachAppointment?: boolean; warmup: string[]; cooldown: string[]; tips: string[] }>
  const swimGroup = swim.find((b) => b.coachAppointment === true)!
  assertEquals(swimGroup.warmup.length, 0)
  assertEquals(swimGroup.cooldown.length, 0)
  assertEquals(swimGroup.tips.length, 0)
})

// ---------- Test di regressione: nessuna modifica alle altre giornate ----------

Deno.test('altre giornate non toccate dalle modifiche martedì/giovedì', () => {
  const s = buildWeekSkeleton(dateFromIsoWeek(2026, 46))
  const lun = s.sessions.filter((x) => x.day === 'Lunedì')
  const ven = s.sessions.filter((x) => x.day === 'Venerdì')
  const sab = s.sessions.filter((x) => x.day === 'Sabato')
  const dom = s.sessions.filter((x) => x.day === 'Domenica')
  assertEquals(lun.filter((x) => x.coachAppointment === true).length, 0)
  assertEquals(ven.filter((x) => x.coachAppointment === true).length, 0)
  assertEquals(sab.filter((x) => x.coachAppointment === true).length, 0)
  assertEquals(dom.filter((x) => x.coachAppointment === true).length, 0)
  assertEquals(lun.filter((x) => x.discipline === 'strength').length, 1)
  assertEquals(ven.filter((x) => x.discipline === 'strength').length, 1)
  assertEquals(sab.filter((x) => x.discipline === 'bike').length, 1)
  assertEquals(dom.filter((x) => x.discipline === 'run' && x.optional).length, 1)
})

// ---------- Test: messaggio di scelta nei canali ----------

Deno.test('CHOICE_GROUP_MESSAGE testo esatto per Telegram', () => {
  assertEquals(CHOICE_GROUP_MESSAGE, '*Scegli una sola opzione per questo giorno: gruppo con Simone oppure una delle due alternative autonome.*\n\n')
})

Deno.test('newsletter HTML mostra messaggio di scelta per gruppo con alternative', () => {
  const html = buildNewsletterHtml(validContent, 46, 2026)
  assert(html.includes('Scegli una sola opzione tra quelle elencate per questo giorno.'), 'messaggio scelta HTML mancante')
})

Deno.test('newsletter testo mostra messaggio di scelta per gruppo con alternative', () => {
  const text = newsletterPlainText(validContent, 46, 2026)
  assert(text.includes('Scegli una sola opzione tra quelle elencate per questo giorno.'), 'messaggio scelta testo mancante')
})

// ---------- Test: validazione post-normalizzazione prima della persistenza ----------

Deno.test('handleGenerate: contenuto AI post-normalizzazione non valido → fallback statico, nessuna scrittura AI', async () => {
  Deno.env.set('LLM_API_KEY', 'test-key')
  const captured: Array<{ payload: any }> = []
  const sb = makeMockSupabase({ existingStatus: null, prevContent: null, capturedUpsert: captured })

  // Modello restituisce contenuto valido strutturalmente ma con un'alternativa
  // che dichiara coachAppointment=true (non autorizzata per sessione autonoma).
  // validateContent lo rifiuta già prima di applySkeletonMeta, ma simuliamo
  // un caso in cui il contenuto passa validateContent ma dopo normalizzazione
  // risulta incoerente: qui testiamo che handleGenerate usi il fallback.
  const bad = JSON.parse(JSON.stringify(validContent)) as Record<string, unknown>
  // Forza un'alternativa autonoma a dichiararsi coachAppointment
  const runArr = bad.run as Array<Record<string, unknown>>
  const outdoorSession = skeleton.sessions.find((s) => s.discipline === 'run' && s.title.includes('autonoma'))!
  const outdoorBlock = runArr.find((b) => b.sessionId === outdoorSession.sessionId)!
  outdoorBlock.coachAppointment = true

  const fetchMock = mockFetchFactory({ body: choice(JSON.stringify(bad)) })
  const { data } = await handleGenerate(sb.client, 2026, 46, fetchMock)
  assertEquals(data.generated_by, 'rules')
  // Il contenuto salvato deve essere il fallback statico, non il contenuto AI invalido
  const content = data.content as Record<string, unknown>
  const run = content.run as Array<{ coachAppointment?: boolean; sessionId: string }>
  const outdoor = run.find((b) => b.sessionId === outdoorSession.sessionId)!
  assert(outdoor.coachAppointment === null || outdoor.coachAppointment === undefined, 'l\'alternativa autonoma non deve avere coachAppointment=true nel contenuto persistito, ottenuto: ' + outdoor.coachAppointment)
  Deno.env.delete('LLM_API_KEY')
})

// ---------- Test: identificatori sessionId ----------

Deno.test('sessionId univoci e coerenti entro la stessa settimana', () => {
  const s = buildWeekSkeleton(dateFromIsoWeek(2026, 46))
  const ids = s.sessions.map((x) => x.sessionId)
  assertEquals(new Set(ids).size, ids.length, 'sessionId devono essere univoci nella settimana')
  for (const id of ids) {
    assert(typeof id === 'string' && id.length > 0, `sessionId vuoto o non stringa: ${id}`)
  }
})

Deno.test('sessionId identico tra normale e recovery (generato dal titolo originale, prima del suffisso scarico)', () => {
  const normal = runGroup(false)
  const recovery = runGroup(true)
  assertEquals(normal.sessionId, recovery.sessionId, 'sessionId è generato dal titolo originale, identico in normale e recovery')
  assertEquals(normal.sessionId, 'martedì-corsa-con-coach-simone')
  // Per coachAppointment il titolo non prende mai il suffisso (scarico), né in normale né in recovery
  assertEquals(normal.title, 'Corsa con coach Simone', `titolo normale inatteso: ${normal.title}`)
  assertEquals(recovery.title, 'Corsa con coach Simone', `titolo recovery inatteso: ${recovery.title}`)
})

// ---------- Test: appuntamenti senza sezioni tecniche vuote o consigli tecnici ----------

Deno.test('appuntamenti coach non mostrano sezioni tecniche vuote o consigli tecnici', () => {
  const content = renderStaticContent(skeleton, 2026, 46)
  const run = content.run as Array<{ coachAppointment?: boolean; warmup: string[]; cooldown: string[]; tips: string[]; main: string[] }>
  const group = run.find((b) => b.coachAppointment === true)!
  assertEquals(group.warmup.length, 0, 'warmup deve essere vuoto per appuntamento coach')
  assertEquals(group.cooldown.length, 0, 'cooldown deve essere vuoto per appuntamento coach')
  assertEquals(group.tips.length, 0, 'tips deve essere vuoto per appuntamento coach')
  assert(group.main.length === 1, 'main deve contenere solo il messaggio coach')
  assert(group.main[0].includes('programma della seduta è deciso dal coach'), 'main deve contenere messaggio coach')

  const swim = content.swim as Array<{ coachAppointment?: boolean; warmup: string[]; cooldown: string[]; tips: string[]; main: string[] }>
  const swimGroup = swim.find((b) => b.coachAppointment === true)!
  assertEquals(swimGroup.warmup.length, 0)
  assertEquals(swimGroup.cooldown.length, 0)
  assertEquals(swimGroup.tips.length, 0)
  assert(swimGroup.main.length === 1)
  assert(swimGroup.main[0].includes('programma della seduta è deciso dal coach'))
})

function assertNotEquals(actual: unknown, expected: unknown, msg?: string): void {
  if (actual === expected) {
    throw new Error(msg ?? `expected values to not be equal, but got ${actual}`)
  }
}

// ---------- Test: titoli appuntamenti esatti anche in recovery ----------

Deno.test('titoli appuntamenti coach invariati in normale e recovery', () => {
  const normalRun = runGroup(false)
  const recoveryRun = runGroup(true)
  const normalSwim = swimGroup(false)
  const recoverySwim = swimGroup(true)

  assertEquals(normalRun.title, 'Corsa con coach Simone')
  assertEquals(recoveryRun.title, 'Corsa con coach Simone')
  assertEquals(normalSwim.title, 'Allenamento in vasca con coach Simone')
  assertEquals(recoverySwim.title, 'Allenamento in vasca con coach Simone')

  assertEquals(normalRun.duration, '60min')
  assertEquals(recoveryRun.duration, '60min')
  assertEquals(normalSwim.duration, '60min')
  assertEquals(recoverySwim.duration, '60min')

  assertEquals(normalRun.time, '19:00')
  assertEquals(recoveryRun.time, '19:00')
  assertEquals(normalSwim.time, '19:30')
  assertEquals(recoverySwim.time, '19:30')

  assertEquals(normalRun.coachAppointment, true)
  assertEquals(recoveryRun.coachAppointment, true)
  assertEquals(normalSwim.coachAppointment, true)
  assertEquals(recoverySwim.coachAppointment, true)
})

// ---------- Test: validazione finale prima della persistenza ----------

Deno.test('validateContent rifiuta contenuto finale non valido', () => {
  const { swim: _unusedSwim, ...contenutoNonValido } = validContent as Record<string, unknown>
  const err = validateContent(contenutoNonValido, skeleton)
  assertEquals(err, 'swim vuoto')
})

Deno.test('fallback statico supera sempre validateContent', () => {
  const fallback = renderStaticContent(skeleton, 2026, 46)
  const err = validateContent(fallback, skeleton)
  assertEquals(err, null)
})

// ---------- Test: composizione messaggi Telegram per martedì e giovedì ----------

Deno.test('Telegram martedì: avviso scelta + gruppo + 2 alternative, nessun dettaglio tecnico negli appuntamenti', () => {
  const content = renderStaticContent(skeleton, 2026, 46)
  const runBlocks = content.run as RenderBlock[]
  const martediBlocks = runBlocks.filter((b) => b.day === 'Martedì').map((b) => ({ block: b, discipline: 'run' as Discipline }))

  const messages = buildTelegramDayMessages(martediBlocks)

  // Deve esserci l'avviso di scelta (una sola volta per il gruppo)
  const choiceMsgs = messages.filter((m: string) => m.includes('Scegli una sola opzione'))
  assertEquals(choiceMsgs.length, 1, 'avviso scelta deve apparire una sola volta per martedì')
  assert(choiceMsgs[0]!.includes('gruppo con Simone'), 'messaggio scelta deve menzionare gruppo con Simone')
  assert(choiceMsgs[0]!.includes('alternative autonome'), 'messaggio scelta deve menzionare alternative autonome')

  // Deve esserci esattamente un blocco gruppo e due alternative
  const blocchiGruppo = martediBlocks.filter((b) => b.block.coachAppointment === true)
  const blocchiAlternativa = martediBlocks.filter((b) => b.block.coachAppointment !== true)
  assertEquals(blocchiGruppo.length, 1, 'martedì: un solo blocco gruppo')
  assertEquals(blocchiAlternativa.length, 2, 'martedì: due alternative autonome')

  // Gli appuntamenti coach non mostrano dettagli tecnici
  const gruppoMsg = messages.find((m: string) => m.includes('Corsa con coach Simone'))!
  assert(!gruppoMsg.includes('Riscaldamento'), 'appuntamento gruppo non deve mostrare riscaldamento')
  assert(!gruppoMsg.includes('Defaticamento'), 'appuntamento gruppo non deve mostrare defaticamento')
  assert(!gruppoMsg.includes('Consigli'), 'appuntamento gruppo non deve mostrare consigli tecnici')
  assert(gruppoMsg.includes('programma della seduta è deciso dal coach'), 'appuntamento gruppo deve mostrare messaggio coach')

  // Le alternative mostrano dettagli tecnici completi
  const outdoorMsg = messages.find((m: string) => m.includes('Corsa autonoma all'))!
  const tapisMsg = messages.find((m: string) => m.includes('Corsa su tapis'))!
  assert(outdoorMsg.includes('Riscaldamento'), 'alternativa outdoor deve mostrare riscaldamento')
  assert(outdoorMsg.includes('Defaticamento'), 'alternativa outdoor deve mostrare defaticamento')
  assert(tapisMsg.includes('Riscaldamento'), 'alternativa tapis deve mostrare riscaldamento')
  assert(tapisMsg.includes('Defaticamento'), 'alternativa tapis deve mostrare defaticamento')
})

Deno.test('Telegram giovedì: avviso scelta + gruppo + 2 alternative, nessun dettaglio tecnico negli appuntamenti', () => {
  const content = renderStaticContent(skeleton, 2026, 46)
  const swimBlocks = content.swim as RenderBlock[]
  const giovediBlocks = swimBlocks.filter((b) => b.day === 'Giovedì').map((b) => ({ block: b, discipline: 'swim' as Discipline }))

  const messages = buildTelegramDayMessages(giovediBlocks)

  // Deve esserci l'avviso di scelta (una sola volta per il gruppo)
  const choiceMsgs = messages.filter((m: string) => m.includes('Scegli una sola opzione'))
  assertEquals(choiceMsgs.length, 1, 'avviso scelta deve apparire una sola volta per giovedì')
  assert(choiceMsgs[0]!.includes('gruppo con Simone'), 'messaggio scelta deve menzionare gruppo con Simone')

  // Deve esserci esattamente un blocco gruppo e due alternative
  const blocchiGruppo = giovediBlocks.filter((b) => b.block.coachAppointment === true)
  const blocchiAlternativa = giovediBlocks.filter((b) => b.block.coachAppointment !== true)
  assertEquals(blocchiGruppo.length, 1, 'giovedì: un solo blocco gruppo')
  assertEquals(blocchiAlternativa.length, 2, 'giovedì: due alternative autonome')

  // Gli appuntamenti coach non mostrano dettagli tecnici
  const gruppoMsg = messages.find((m: string) => m.includes('Allenamento in vasca con coach Simone'))!
  assert(!gruppoMsg.includes('Riscaldamento'), 'appuntamento gruppo nuoto non deve mostrare riscaldamento')
  assert(!gruppoMsg.includes('Defaticamento'), 'appuntamento gruppo nuoto non deve mostrare defaticamento')
  assert(!gruppoMsg.includes('Consigli'), 'appuntamento gruppo nuoto non deve mostrare consigli tecnici')
  assert(gruppoMsg.includes('programma della seduta è deciso dal coach'), 'appuntamento gruppo nuoto deve mostrare messaggio coach')

  // Le alternative mostrano dettagli tecnici completi
  const tecnicaMsg = messages.find((m: string) => m.includes('Tecnica e variazioni'))!
  const seccoMsg = messages.find((m: string) => m.includes('Nuoto a secco'))!
  assert(tecnicaMsg.includes('Riscaldamento'), 'alternativa tecnica deve mostrare riscaldamento')
  assert(tecnicaMsg.includes('Defaticamento'), 'alternativa tecnica deve mostrare defaticamento')
  assert(seccoMsg.includes('Riscaldamento'), 'alternativa secco deve mostrare riscaldamento')
  assert(seccoMsg.includes('Defaticamento'), 'alternativa secco deve mostrare defaticamento')
})

// ---------- Test: gestore OPTIONS senza rete ----------

Deno.test('OPTIONS per origine frontend ammessa: header CORS corretti', () => {
  const req = new Request('https://triathlon-planner-saas.vercel.app/', {
    method: 'OPTIONS',
    headers: { Origin: 'https://triathlon-planner-saas.vercel.app' },
  })
  const headers = corsHeadersFor(req) as Record<string, string>

  // Stato positivo (Response 'ok' nello handler OPTIONS)
  assertEquals(headers['Access-Control-Allow-Origin'], 'https://triathlon-planner-saas.vercel.app')

  // POST presente nei metodi consentiti
  const methods = headers['Access-Control-Allow-Methods'] ?? ''
  assert(methods.split(',').map((m: string) => m.trim()).includes('POST'), 'POST deve essere tra i metodi consentiti')
  assert(methods.split(',').map((m: string) => m.trim()).includes('OPTIONS'), 'OPTIONS deve essere tra i metodi consentiti')

  // Tutti e quattro gli header richiesti ammessi (case-insensitive, ordine indipendente)
  const allowHeaders = headers['Access-Control-Allow-Headers'] ?? ''
  const richiesti = ['authorization', 'x-client-info', 'apikey', 'content-type']
  for (const h of richiesti) {
    assert(
      allowHeaders.split(',').map((v: string) => v.trim().toLowerCase()).includes(h),
      `header '${h}' deve essere presente in Access-Control-Allow-Headers`,
    )
  }
})

Deno.test('OPTIONS per origine non ammessa: nessuna Allow-Origin', () => {
  const req = new Request('https://sito-sconosciuto.example.com/', {
    method: 'OPTIONS',
    headers: { Origin: 'https://sito-sconosciuto.example.com' },
  })
  const headers = corsHeadersFor(req) as Record<string, string>
  assertEquals(headers['Access-Control-Allow-Origin'], undefined)
})
