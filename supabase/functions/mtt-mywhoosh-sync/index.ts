import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MTT_ADMIN_EMAILS = ['sbonfanti@hotmail.com', 'bonfantistefano4@gmail.com']
const MTT_TEAM_ID = 'mtt'

const MYWHOOSH_LOGIN_URL = 'https://services.mywhoosh.com/http-service/api/login'
const MYWHOOSH_UPLOAD_URL = 'https://coaching.mywhoosh.com/api/v2/client/custom-workout-upload'
const MYWHOOSH_DOWNLOAD_URL = 'https://services.mywhoosh.com/http-service/v1/mobile/workout/download'

const baseCorsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
}

function corsHeadersFor(req: Request) {
  const origin = req.headers.get('Origin') ?? ''
  const allowed = origin === 'https://triathlon-planner-saas.vercel.app'
    || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)
    || /^http:\/\/localhost:\d+$/.test(origin)

  return allowed ? { ...baseCorsHeaders, 'Access-Control-Allow-Origin': origin } : { ...baseCorsHeaders }
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function requireMttAdmin(supabaseClient: any, req: Request) {
  const authorization = req.headers.get('Authorization') ?? ''
  const token = authorization.replace(/^Bearer\s+/i, '').trim()
  if (!token) throw new Error('Autenticazione richiesta')

  const serviceRoleKeys = [
    Deno.env.get('MTT_SERVICE_ROLE_KEY'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  ].filter((value): value is string => Boolean(value))

  if (serviceRoleKeys.some((key) => safeEqual(token, key))) return

  const { data, error } = await supabaseClient.auth.getClaims(token)
  if (error || !data?.claims) throw new Error('Token non valido o scaduto')

  if (data.claims.role === 'service_role') return

  const { data: profileData, error: profileError } = await supabaseClient
    .from('profiles')
    .select('team_id, is_team_admin, is_super_admin, email')
    .eq('id', data.claims.sub)
    .maybeSingle()

  const profile = profileData as any

  if (profileError) throw profileError

  const isAdmin = profile?.is_team_admin === true
    || profile?.is_super_admin === true
    || MTT_ADMIN_EMAILS.includes((profile?.email ?? '').toLowerCase())

  if (!isAdmin || profile?.team_id !== MTT_TEAM_ID) {
    throw new Error('Solo gli admin MTT possono eseguire questa operazione')
  }
}

interface MyWhooshLoginResponse {
  AccessToken?: string
  RefreshToken?: string
  WhooshId?: string
  error?: string
  Success?: boolean
}

interface MyWhooshRequestResult {
  httpStatus: number
  contentType: string
  body: any
  raw: string
  durationMs: number
  remoteStatus: 'accepted' | 'unknown' | 'error'
  error?: string
}

interface PushedItem {
  workout_id: string
  mywhoosh_workout_id?: string
  error?: string
  dry_run?: boolean
  steps_count?: number
  steps?: any[]
  title?: string
  totalTime?: number
  status?: 'accepted' | 'existing_unverified' | 'failed' | 'unknown'
}

interface ConversionProblem {
  blockIndex: number
  blockTitle: string
  discipline: string
  segment: 'warmup' | 'cooldown'
  missing: string[]
}

interface ConversionResult {
  steps: any[]
  problems: ConversionProblem[]
}

export async function mywhooshLogin(): Promise<MyWhooshLoginResponse> {
  const username = Deno.env.get('MYWHOOSH_USERNAME')
  const password = Deno.env.get('MYWHOOSH_PASSWORD')
  if (!username || !password) throw new Error('MYWHOOSH_USERNAME/MYWHOOSH_PASSWORD non configurati')

  const body = {
    Username: username,
    Password: password,
    Platform: 'Android',
    Action: 1001,
    CorrelationId: crypto.randomUUID(),
    DeviceId: crypto.randomUUID(),
    Authorization: '',
  }

  const res = await fetch('https://services.mywhoosh.com/http-service/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'MyWhoosh/1.0' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`MyWhoosh login HTTP ${res.status}: ${text.slice(0, 300)}`)

  try {
    const parsed = JSON.parse(text) as MyWhooshLoginResponse
    if (!parsed.AccessToken || !parsed.WhooshId) {
      throw new Error(`MyWhoosh login senza token: ${JSON.stringify(parsed).slice(0, 300)}`)
    }
    return parsed
  } catch {
    throw new Error(`Risposta login MyWhoosh non valida: ${text.slice(0, 300)}`)
  }
}

export async function mywhooshRequest(token: string, url: string, body: unknown): Promise<MyWhooshRequestResult> {
  const start = Date.now()
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    })
  } catch (err: any) {
    return {
      httpStatus: 0,
      contentType: '',
      body: { raw: String(err?.message ?? err) },
      raw: String(err?.message ?? err),
      durationMs: Date.now() - start,
      remoteStatus: 'error',
      error: `Esito remoto incerto: errore di trasporto o timeout. Verificare prima di reinviare. Dettaglio: ${err?.message ?? String(err)}`,
    }
  }

  const text = await res.text()
  const durationMs = Date.now() - start
  const contentType = res.headers.get('content-type') ?? ''

  // Redige eventuali segreti o URL S3 prefirmati prima del log
  let safeBody: string
  try {
    const parsed = JSON.parse(text)
    safeBody = JSON.stringify(redactSecrets(parsed)).slice(0, 500)
  } catch {
    safeBody = redactSecrets(text).slice(0, 500)
  }

  console.log(`[mywhoosh] POST httpStatus=${res.status} contentType=${contentType} durationMs=${durationMs} body=${safeBody}`)

  if (!res.ok) {
    return {
      httpStatus: res.status,
      contentType,
      body: { raw: text },
      raw: text,
      durationMs,
      remoteStatus: 'error',
      error: `Esito remoto incerto: HTTP ${res.status}. Verificare prima di reinviare. Risposta: ${safeBody}`,
    }
  }

  // Risposta HTTP riuscita: cerca di parsare il JSON
  let parsed: any
  try {
    parsed = JSON.parse(text)
  } catch {
    return {
      httpStatus: res.status,
      contentType,
      body: { raw: text },
      raw: text,
      durationMs,
      remoteStatus: 'unknown',
      error: 'Risposta HTTP 200 ma corpo non JSON: esito remoto non confermato. Verificare prima di reinviare.',
    }
  }

  // Riconosci esplicitamente la risposta documentata di successo
  const isDocumentedAccepted =
    parsed?.message === 'Custom workout is being uploaded.'

  if (isDocumentedAccepted) {
    return {
      httpStatus: res.status,
      contentType,
      body: parsed,
      raw: text,
      durationMs,
      remoteStatus: 'accepted',
    }
  }

  // Risposta diversa ma non esplicitamente negativa: unknown, da esaminare
  return {
    httpStatus: res.status,
    contentType,
    body: parsed,
    raw: text,
    durationMs,
    remoteStatus: 'unknown',
    error: 'Risposta HTTP 200 con corpo inatteso: esito remoto non confermato. Verificare prima di reinviare.',
  }
}

function redactSecrets(value: any): any {
  if (typeof value === 'string') {
    return value
      .replace(/https?:\/\/[^"'\\s]+\.s3\.(?:[a-z0-9-]+\.)?amazonaws\.com[^"'\\s]*/g, '[S3_URL_REDACTED]')
  }
  if (Array.isArray(value)) return value.map(redactSecrets)
  if (value && typeof value === 'object') {
    const out: any = {}
    for (const [k, v] of Object.entries(value)) {
      const key = k.toLowerCase()
      if (key.includes('password') || key.includes('token') || key.includes('authorization') || key === 'accesskey' || key === 'secretkey') {
        out[k] = '[REDACTED]'
      } else {
        out[k] = redactSecrets(v)
      }
    }
    return out
  }
  return value
}

function extractMinutesFromStrings(arr: any[] | undefined): number {
  if (!arr) return 0
  let total = 0
  for (const s of arr) {
    const str = typeof s === 'string' ? s : String(s)
    const m = parseInt(str.match(/\d+/)?.[0] ?? '0')
    if (!isNaN(m)) total += m
  }
  return total
}

export function workoutToMyWhooshSteps(content: any, workoutIndex: number): ConversionResult {
  const steps: any[] = []
  const problems: ConversionProblem[] = []
  let intervalId = 1

  const disciplines = ['swim', 'bike', 'run'] as const
  for (const d of disciplines) {
    const blocks = content[d] ?? []
    for (let bi = 0; bi < blocks.length; bi++) {
      const block = blocks[bi]
      const title = block.title ?? `${d.charAt(0).toUpperCase() + d.slice(1)}`
      const duration = typeof block.duration === 'string' ? block.duration : ''

      // Warmup → step E_Normal a potenza ridotta
      if (block.warmup?.length) {
        const warmupMinutes = extractMinutesFromStrings(block.warmup)
        const warmupTime = warmupMinutes > 0 ? warmupMinutes * 60 : 300
        steps.push({
          Id: steps.length + 1,
          Name: `${title} - Riscaldamento`,
          Description: block.warmup.join(' | '),
          Power: 0.5,
          Time: warmupTime,
          StepType: 'E_Normal',
          IntervalId: intervalId,
          WorkoutStepsArray: [],
        })
        intervalId++
      }

      // Main → step E_Normal a potenza standard
      if (block.main?.length) {
        steps.push({
          Id: steps.length + 1,
          Name: `${title} - Parte principale`,
          Description: block.main.join(' | '),
          Power: 0.85,
          Time: (parseInt(duration.match(/\d+/)?.[0] ?? '0') || 20) * 60,
          StepType: 'E_Normal',
          IntervalId: intervalId,
          WorkoutStepsArray: [],
        })
        intervalId++
      }

      // Cooldown → step E_Normal a potenza ridotta
      if (block.cooldown?.length) {
        const cooldownMinutes = extractMinutesFromStrings(block.cooldown)
        const cooldownTime = cooldownMinutes > 0 ? cooldownMinutes * 60 : 300
        steps.push({
          Id: steps.length + 1,
          Name: `${title} - Defaticamento`,
          Description: block.cooldown.join(' | '),
          Power: 0.4,
          Time: cooldownTime,
          StepType: 'E_Normal',
          IntervalId: intervalId,
          WorkoutStepsArray: [],
        })
        intervalId++
      }
    }
  }

  if (steps.length === 0 && problems.length === 0) {
    steps.push({
      Id: 1,
      Name: content.title ?? 'Allenamento MTT',
      Description: content.intro ?? 'Allenamento settimanale MTT',
      Power: 0.7,
      Time: 3600,
      StepType: 'E_Normal',
      IntervalId: 1,
      WorkoutStepsArray: [],
    })
  }

  return { steps, problems }
}

export function validateSteps(steps: any[]): string | undefined {
  if (steps.length === 0) return 'nessuno step generato'

  for (const s of steps) {
    if (typeof s.Time !== 'number' || !Number.isFinite(s.Time) || s.Time <= 0) {
      return `step ${s.Id}: durata non valida (${s.Time})`
    }

    if (s.StepType === 'E_Normal') {
      if (typeof s.Power !== 'number' || !Number.isFinite(s.Power) || s.Power < 0) {
        return `step ${s.Id} (E_Normal): Power non valido (${s.Power})`
      }
    }

    if (s.StepType === 'E_WarmUp' || s.StepType === 'E_CoolDown') {
      if (typeof s.StartPower !== 'number' || !Number.isFinite(s.StartPower) || s.StartPower < 0) {
        return `step ${s.Id} (${s.StepType}): StartPower non valido (${s.StartPower})`
      }
      if (typeof s.EndPower !== 'number' || !Number.isFinite(s.EndPower) || s.EndPower < 0) {
        return `step ${s.Id} (${s.StepType}): EndPower non valido (${s.EndPower})`
      }
    }

    if (s.StepType === 'E_FreeRide' && s.Power !== undefined) {
      if (typeof s.Power !== 'number' || !Number.isFinite(s.Power) || s.Power < 0) {
        return `step ${s.Id} (E_FreeRide): Power non valido (${s.Power})`
      }
    }
  }

  return undefined
}

serve(async (req) => {
  const headers = corsHeadersFor(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Metodo non consentito' }), {
      headers: { ...headers, 'Content-Type': 'application/json' },
      status: 405,
    })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    await requireMttAdmin(supabaseClient, req)

    const { action, year, week_number, workout_id, dry_run } = await req.json()

    if (action === 'login') {
      const loginResult = await mywhooshLogin()
      if (!loginResult.AccessToken) {
        throw new Error('Login MyWhoosh fallito: nessun AccessToken ricevuto')
      }
      return new Response(JSON.stringify({
        success: true,
        whooshId: loginResult.WhooshId,
        message: 'Login MyWhoosh effettuato',
      }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'push') {
      if (!Number.isInteger(year) || year < 2020 || year > 2100) throw new Error('Anno non valido')
      if (!Number.isInteger(week_number) || week_number < 1 || week_number > 53) throw new Error('Settimana non valida')

      if (dry_run !== undefined && typeof dry_run !== 'boolean') {
        throw new Error('Parametro dry_run non valido: usare true o false booleani')
      }

      const { data: workouts, error: wError } = await supabaseClient
        .from('team_workouts')
        .select('id, week_number, year, content, status, mywhoosh_workout_id')
        .eq('team_id', MTT_TEAM_ID)
        .eq('year', year)
        .eq('week_number', week_number)
        .in('status', ['approved', 'sent'])

      if (wError) throw wError
      if (!workouts || workouts.length === 0) {
        throw new Error(`Nessun allenamento approvato per la settimana ${week_number}/${year}`)
      }

      if (dry_run) {
        const pushed: PushedItem[] = []
        for (const workout of workouts) {
          const content = workout.content as any
          const { steps, problems } = workoutToMyWhooshSteps(content, pushed.length)

          if (steps.length === 0) {
            const first = problems[0]
            pushed.push({
              workout_id: workout.id,
              error: `Nessuno step convertibile per questo allenamento. ${first ? 'Primo problema: blocco ' + first.blockIndex + ' "' + first.blockTitle + '" (' + first.discipline + '): nessun segmento convertibile (warmup/main/cooldown) trovato.' : 'nessun blocco principale trovato.'}`,
              status: 'failed',
            })
            continue
          }

          const validationError = validateSteps(steps)
          if (validationError) {
            pushed.push({ workout_id: workout.id, error: validationError, status: 'failed' })
            continue
          }

          const totalTime = steps.reduce((sum, s) => sum + s.Time, 0)
          const title = (content.title ?? `Allenamenti MTT - Settimana ${week_number} ${year}`).replace(/\//g, ' ')
          const item: any = {
            workout_id: workout.id,
            title,
            totalTime,
            steps_count: steps.length,
            steps,
            mywhoosh_workout_id: undefined,
            error: undefined,
            dry_run: true,
            status: 'accepted',
          }
          pushed.push(item)
        }

        return new Response(JSON.stringify({
          success: true,
          dry_run: true,
          pushed,
          total: pushed.length,
          whooshId: undefined,
          message: 'Dry run completato: nessun upload eseguito. I workout con step E_WarmUp/E_Normal/E_CoolDown usano potenze hardcoded (0.55/0.85/0.7) non ancora verificate rispetto alla prescrizione originale MTT.',
        }), {
          headers: { ...headers, 'Content-Type': 'application/json' },
        })
      }

      const pushed: PushedItem[] = []
      let loginResult: MyWhooshLoginResponse | undefined = undefined

      for (const workout of workouts) {
        if (workout.mywhoosh_workout_id) {
          pushed.push({
            workout_id: workout.id,
            mywhoosh_workout_id: workout.mywhoosh_workout_id,
            error: 'ID già registrato, presenza remota non verificata',
            status: 'existing_unverified',
          })
          continue
        }

        const content = workout.content as any
        const { steps, problems } = workoutToMyWhooshSteps(content, pushed.length)

        if (steps.length === 0) {
          const first = problems[0]
          pushed.push({
            workout_id: workout.id,
            error: `Nessuno step convertibile per questo allenamento. ${first ? 'Primo problema: blocco ' + first.blockIndex + ' "' + first.blockTitle + '" (' + first.discipline + ', ' + first.segment + '): segmenti warmup/cooldown non convertibili dal modello MTT — mancano ' + first.missing.join(', ') + '; nessun valore o durata inventato.' : 'nessun blocco principale trovato.'}`,
            status: 'failed',
          })
          continue
        }

        const validationError = validateSteps(steps)
        if (validationError) {
          pushed.push({ workout_id: workout.id, error: validationError, status: 'failed' })
          continue
        }

        if (!loginResult) {
          loginResult = await mywhooshLogin()
          if (!loginResult.AccessToken || !loginResult.WhooshId) {
            throw new Error('Impossibile autenticarsi su MyWhoosh')
          }
        }

        const title = (content.title ?? `Allenamenti MTT - Settimana ${week_number} ${year}`).replace(/\//g, ' ')
        // workoutId: identificativo destinazione per MyWhoosh. Deve essere un numero (richiesto dall'API MyWhoosh).
        // Usiamo Date.now() per avere un ID numerico univoco e non riutilizzare l'Id dell'export sorgente.
        const workoutId = Date.now()
        const totalTime = steps.reduce((sum, s) => sum + s.Time, 0)

        const body = {
          UserId: loginResult.WhooshId,
          SportsModeType: 0,
          WorkoutsData: [{
            Id: workoutId,
            Name: title,
            Description: content.intro ?? 'Allenamento settimanale MTT',
            Mode: 'E_Ride',
            ERGMode: 'E_OFF',
            IsRecovery: false,
            IsIntervals: false,
            FTPMode: 'E_NoFTP',
            IsTT: false,
            IsTSS: false,
            IsIF: false,
            FTPMultiplier: 0,
            StressPoint: 0,
            CategoryId: 1,
            SubcategoryId: 0,
            Type: 'E_Custom',
            DisplayType: 'E_byWatts',
            StepCount: steps.length,
            IsFavorite: false,
            CompletedCount: 0,
            AuthorName: '',
            Time: totalTime,
            WorkoutStepsArray: steps.map((s, i) => ({
              Id: i + 1,
              Pace: 1,
              IntervalId: 0,
              WorkoutMessage: [],
              Rpm: s.Rpm ?? 0,
              StepType: s.StepType,
              Power: s.Power,
              StartPower: s.StartPower ?? 0,
              EndPower: s.EndPower ?? 0,
              Time: s.Time,
              IsManualGrade: false,
              ManualGradeValue: 0,
              ShowAveragePower: false,
              FlatRoad: 0,
            })),
            WorkoutSteps: {},
            WorkoutstepsTMap: [],
            WokoutAssociationId: 0,
            IF: 0,
            TSS: 0,
            KJ: 0,
            IsVODAvailable: false,
          }],
        }

        let result: MyWhooshRequestResult
        result = await mywhooshRequest(loginResult.AccessToken!, MYWHOOSH_UPLOAD_URL, body)

        // Accettazione solo se il server ha restituito esplicitamente la risposta documentata.
        // Qualsiasi altro esito (non-JSON, corpo inatteso, errore HTTP, errore di trasporto)
        // viene classificato come unknown, mai come accettato automatico.
        if (result.remoteStatus !== 'accepted') {
          pushed.push({
            workout_id: workout.id,
            mywhoosh_workout_id: workoutId,
            error: result.error ?? 'Esito remoto non confermato',
            status: result.remoteStatus === 'error' ? 'unknown' : 'unknown',

          })
          console.log(`[mywhoosh] push workout=${workout.id} workoutId=${workoutId} httpStatus=${result.httpStatus} remoteStatus=${result.remoteStatus} status=unknown`)
          continue
        }

        // HTTP 200 + risposta applicativa "Custom workout is being uploaded.": upload accettato,
        // ma NON verificato da remoto. Salvataggio locale del mio ID: separato dall'esito remoto.
        let rowsAffected = 0

        const { data: updatedRows, error: updateError } = await supabaseClient
          .from('team_workouts')
          .update({ mywhoosh_workout_id: workoutId })
          .eq('id', workout.id)
          .select('id')

        if (updateError) {
          pushed.push({
            workout_id: workout.id,
            mywhoosh_workout_id: workoutId,
            error: `upload accettato da MyWhoosh, salvataggio locale fallito: ${updateError.message}`,
            status: 'accepted',

          })
        } else {
          rowsAffected = Array.isArray(updatedRows) ? updatedRows.length : 0
          if (rowsAffected === 0) {
            pushed.push({
              workout_id: workout.id,
              mywhoosh_workout_id: workoutId,
              error: 'upload accettato da MyWhoosh, ma nessuna riga aggiornata in team_workouts (record non trovato)',
              status: 'accepted',
  
            })
          } else {
            pushed.push({
              workout_id: workout.id,
              mywhoosh_workout_id: workoutId,
              error: undefined,
              status: 'accepted',
  
            })
          }
        }

        console.log(`[mywhoosh] push workout=${workout.id} workoutId=${workoutId} httpStatus=${result.httpStatus} rowsAffected=${rowsAffected} remoteStatus=${result.remoteStatus} status=accepted`)
      }

      const acceptedCount = pushed.filter(p => p.status === 'accepted').length
      const existingUnverifiedCount = pushed.filter(p => p.status === 'existing_unverified').length
      const failedCount = pushed.filter(p => p.status === 'failed').length
      const unknownCount = pushed.filter(p => p.status === 'unknown').length
      const dryRunCount = pushed.filter(p => p.status === 'accepted' && p.dry_run === true).length

      let message: string
      if (dryRunCount === pushed.length && pushed.length > 0) {
        message = 'Dry run completato: nessun upload eseguito.'
      } else if (existingUnverifiedCount === pushed.length && pushed.length > 0) {
        message = 'ID già registrati: nessun nuovo invio, presenza remota non verificata.'
      } else if (failedCount > 0 || unknownCount > 0) {
        message = 'Alcuni allenamenti non caricati o con esito remoto incerto.'
      } else if (acceptedCount > 0) {
        message = 'Allenamenti accettati da MyWhoosh, presenza remota non verificata.'
      } else {
        message = 'Nessun allenamento da caricare.'
      }

      return new Response(JSON.stringify({
        success: failedCount === 0 && unknownCount === 0,
        pushed,
        total: pushed.length,
        whooshId: loginResult?.WhooshId,
        accepted: acceptedCount,
        existing_unverified: existingUnverifiedCount,
        failed: failedCount,
        unknown: unknownCount,
        dry_run: dryRunCount > 0,
        message,
      }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'pull') {
      const loginResult = await mywhooshLogin()
      if (!loginResult.AccessToken) {
        throw new Error('Impossibile autenticarsi su MyWhoosh')
      }

      const result = await mywhooshRequest(loginResult.AccessToken, MYWHOOSH_DOWNLOAD_URL, {
        UserId: loginResult.WhooshId,
      })

      return new Response(JSON.stringify({
        success: true,
        data: result,
        whooshId: loginResult.WhooshId,
      }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    throw new Error('Azione non supportata')
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...headers, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})