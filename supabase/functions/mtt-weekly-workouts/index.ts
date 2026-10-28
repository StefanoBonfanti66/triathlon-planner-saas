import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildWeekSkeleton, dateFromIsoWeek, WeekSkeleton, SkeletonSession } from './periodization.ts'
import {
  buildNewsletterHtml,
  newsletterPlainText,
  getTeamRecipients,
  sendViaResend,
  NewsletterWorkoutContent,
} from './newsletter.ts'

const MTT_ADMIN_EMAILS = ['sbonfanti@hotmail.com', 'bonfantistefano4@gmail.com']
const MTT_FALLBACK_CHAT_ID = '-5117971075'

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

  if (!isAdmin || profile?.team_id !== 'mtt') {
    throw new Error('Solo gli admin MTT possono eseguire questa operazione')
  }
}

function toContentBlock(s: SkeletonSession) {
  return {
    discipline: s.discipline,
    title: s.title,
    duration: s.duration,
    warmup: ['Riscaldamento graduale 10-15min a ritmo facile'],
    main: s.mainOutline,
    cooldown: ['Defaticamento 5-10min facile + stretching'],
    tips: [`Intensità: ${s.intensity}`, `Focus: ${s.focus}`],
  }
}

function skeletonTitle(skeleton: WeekSkeleton, year: number, weekNumber: number): string {
  const recovery = skeleton.isRecovery ? ' · scarico' : ''
  return `Allenamenti MTT - Settimana ${weekNumber}/${year} · ${skeleton.phaseLabel} (sett. ${skeleton.weekInMeso}/4${recovery})`
}

function renderStaticContent(skeleton: WeekSkeleton, year: number, weekNumber: number) {
  const pick = (d: SkeletonSession['discipline']) =>
    skeleton.sessions.filter((s) => s.discipline === d).map(toContentBlock)

  return {
    week_number: weekNumber,
    year,
    title: skeletonTitle(skeleton, year, weekNumber),
    intro: `Fase ${skeleton.phaseLabel} — ${skeleton.mesoProgression}. Allenamenti non personalizzati pensati per amatori 30-60 anni: adatta intensità e volumi in base alle tue sensazioni.`,
    swim: pick('swim'),
    bike: pick('bike'),
    run: pick('run'),
    notes: 'Ricorda: idratazione e alimentazione adatte al tuo tipo di allenamento. In caso di dubbi o fastidi, consulta il tuo medico.',
    tips_by_discipline: {
      swim: ['Focus su tecnica > distanza', 'Usa pull/palette con moderazione'],
      bike: ['Mantenimento + controllo respirazione', 'Idratazione importante per uscite >1h'],
      run: ['Aumenta gradualmente se riprendi', 'Scarpe adatte e terreni idonei'],
    },
    adaptation_tips: {
      ftp: 'Se conosci il tuo FTP, lavora tra 65-80% per questi allenamenti. Se non lo conosci, usa la Regola della Conversazione: devi riuscire a parlare durante l\'allenamento.',
      vo2max: 'Per gli intervalli, se conosci i tuoi valori VO2max, rimani tra 85-92%. Altrimenti riduci l\'intensità finché non riesci a recuperare bene tra le ripetizioni.',
      pace: 'Per la corsa, usa il tuo ritmo facile (circa 1-1\'30" più lento del tuo 5K) come riferimento. Se non hai tempi di riferimento, parti dal \'comfortably hard\' molto conservativo.',
    },
    newsletter: {
      subject: `Allenamenti MTT · Settimana ${weekNumber}/${year} — ${skeleton.phaseLabel}`,
      intro: [
        `Ciao squadra, da questa settimana il team lancia un servizio nuovo: gli allenamenti settimanali personalizzati, pensati per te.`,
        `Ogni settimana riceverai un piano completo (nuoto, bici, corsa) costruito sui principi della periodizzazione e adattato alla fase della stagione. In questo momento siamo in fase ${skeleton.phaseLabel.toLowerCase()}: ${skeleton.mesoProgression}. ${skeleton.isRecovery ? 'Questa è una settimana di scarico: riduciamo i volumi per permettere al corpo di assorbire il lavoro delle settimane precedenti.' : 'Stiamo costruendo solide basi aerobiche con volumi e intensità pensati per atleti amatori.'}`,
        'Gli allenamenti sono un punto di partenza: adatta intensità e durate alle tue sensazioni, senza forzare. Se hai dubbi, chiedi nel gruppo Telegram.',
        'Buon allenamento!',
      ].join('\n\n'),
      extra: '',
    },
  }
}

function parseJsonLoose(text: string): unknown | null {
  let t = text.trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  try {
    return JSON.parse(t.slice(start, end + 1))
  } catch {
    return null
  }
}

function validateContent(c: unknown): string | null {
  if (!c || typeof c !== 'object') return 'non è un oggetto'
  const o = c as Record<string, unknown>
  if (typeof o.title !== 'string' || !o.title.trim()) return 'title mancante'
  if (typeof o.intro !== 'string' || !o.intro.trim()) return 'intro mancante'
  if (typeof o.notes !== 'string' || !o.notes.trim()) return 'notes mancante'
  for (const d of ['swim', 'bike', 'run'] as const) {
    const arr = o[d]
    if (!Array.isArray(arr) || arr.length < 1) return `${d} vuoto`
    for (const block of arr as Array<Record<string, unknown>>) {
      if (typeof block?.title !== 'string' || !block.title.trim()) return `${d}: block title mancante`
      if (!Array.isArray(block.main) || block.main.length < 1 || (block.main as unknown[]).some((x) => typeof x !== 'string')) {
        return `${d}: main non valido`
      }
    }
  }
  const at = o.adaptation_tips as Record<string, unknown> | undefined
  if (!at || typeof at.ftp !== 'string' || typeof at.vo2max !== 'string' || typeof at.pace !== 'string') {
    return 'adaptation_tips incompleto'
  }
  const tbd = o.tips_by_discipline as Record<string, unknown> | undefined
  if (!tbd || !Array.isArray(tbd.swim) || !Array.isArray(tbd.bike) || !Array.isArray(tbd.run)) {
    return 'tips_by_discipline incompleto'
  }
  const nl = o.newsletter as Record<string, unknown> | undefined
  if (!nl || typeof nl.subject !== 'string' || !nl.subject.trim()) return 'newsletter.subject mancante'
  if (typeof nl.intro !== 'string' || !nl.intro.trim()) return 'newsletter.intro mancante'
  if (typeof nl.extra !== 'string') return 'newsletter.extra mancante'
  return null
}

async function renderWithLLM(
  skeleton: WeekSkeleton,
  year: number,
  weekNumber: number,
  previousTitle?: string,
): Promise<{ content: Record<string, unknown>; model: string } | null> {
  const apiKey = Deno.env.get('LLM_API_KEY')
  if (!apiKey) return null

  const baseUrl = (Deno.env.get('LLM_BASE_URL') ?? 'https://api.groq.com/openai/v1').replace(/\/+$/, '')
  const model = Deno.env.get('LLM_MODEL') ?? 'openai/gpt-oss-120b'

  const system = [
    'Sei un coach di triathlon per amatori italiani di 30-60 anni (livello base-intermedio, distanze sprint/olimpico).',
    'Devi produrre ESCLUSIVAMENTE un oggetto JSON valido, senza markdown né commenti, che rappresenta il piano allenamenti della settimana.',
    'Regole: lingua italiana; intensità sempre in RPE (percezione) o %FC, MAI valori FTP assoluti; rispetta la struttura (sessioni, durate, titoli, fase) dello scheletro fornito, espandendo warmup/main/cooldown/tips in modo naturale e concreto;',
    'varia le parole rispetto alla settimana precedente se indicata; tono pratico, incoraggiante, senza pretese da elite; ogni block ha warmup/main/cooldown/tips come array di stringhe.',
  ].join(' ')

  const user = JSON.stringify({
    task: 'Genera il contenuto completo degli allenamenti settimanali',
    meta: {
      year,
      week_number: weekNumber,
      title_format: skeletonTitle(skeleton, year, weekNumber),
      macro_phase: skeleton.phaseLabel,
      week_in_mesocycle: skeleton.weekInMeso,
      is_recovery_week: skeleton.isRecovery,
      progression: skeleton.mesoProgression,
      previous_week_title: previousTitle ?? null,
      weekly_notes: skeleton.weeklyNotes,
    },
    skeleton: skeleton.sessions,
    required_schema: {
      title: 'string',
      intro: 'string',
      swim: [{ discipline: 'swim', title: 'string', duration: 'string', warmup: ['string'], main: ['string'], cooldown: ['string'], tips: ['string'] }],
      bike: [{ discipline: 'bike', title: 'string', duration: 'string', warmup: ['string'], main: ['string'], cooldown: ['string'], tips: ['string'] }],
      run: [{ discipline: 'run', title: 'string', duration: 'string', warmup: ['string'], main: ['string'], cooldown: ['string'], tips: ['string'] }],
      notes: 'string',
      tips_by_discipline: { swim: ['string'], bike: ['string'], run: ['string'] },
      adaptation_tips: { ftp: 'string (solo percezione/RPE)', vo2max: 'string', pace: 'string' },
      newsletter: {
        subject: 'string — oggetto email newsletter, max 60 char, es. "Allenamenti MTT · Settimana 44 — Transizione"',
        intro: 'string — 3-5 paragrafi (separati da \\n\\n). PRESENTA IL SERVIZIO COME NOVITÀ: spiega che da questa settimana il team lancia un servizio di allenamenti settimanali personalizzati, generati con l\'AI e revisionati dai coach. Non dare per scontato che lo conoscano già. Poi entra nel dettaglio della fase attuale e di cosa stiamo costruendo. Tono caldo da coach, entusiasta ma professionale.',
        extra: 'string — sempre stringa vuota "" (lo compila l\'admin)',
      },
    },
  })

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.8,
        max_tokens: 4000,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: AbortSignal.timeout(45000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const text: string = data?.choices?.[0]?.message?.content ?? ''
    if (!text) return null
    const parsed = parseJsonLoose(text)
    if (validateContent(parsed)) return null
    const content = parsed as Record<string, unknown>
    content.week_number = weekNumber
    content.year = year
    content.title = skeletonTitle(skeleton, year, weekNumber)
    return { content, model }
  } catch {
    return null
  }
}

async function dispatchNewsletter(
  supabaseClient: any,
  workout: Record<string, any>,
  testEmail: string | null,
): Promise<Record<string, unknown>> {
  const content = workout.content as NewsletterWorkoutContent
  const html = buildNewsletterHtml(content, workout.week, workout.year)
  const text = newsletterPlainText(content, workout.week, workout.year)
  const subject = content.newsletter?.subject?.trim() || `Allenamenti MTT — Settimana ${workout.week}/${workout.year}`

  const recipients = testEmail
    ? [{ email: testEmail, name: null }]
    : await getTeamRecipients(supabaseClient)
  if (!recipients.length) throw new Error('Nessun destinatario trovato')

  let sent = 0
  const failures: Array<{ email: string; error: string }> = []
  for (const r of recipients) {
    try {
      await sendViaResend(r, subject, html, text)
      sent++
    } catch (e) {
      failures.push({ email: r.email, error: e instanceof Error ? e.message : String(e) })
    }
    // piccola pausa per non saturare il rate limit Resend
    await new Promise((res) => setTimeout(res, 120))
  }

  if (!testEmail) {
    await supabaseClient
      .from('team_workouts')
      .update({ newsletter_sent_at: new Date().toISOString() })
      .eq('id', workout.id)
  }

  return {
    total: recipients.length,
    sent,
    failed: failures.length,
    failures: failures.slice(0, 5),
    test: !!testEmail,
  }
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

    const { action, year, week_number, workout_id, chat_id, test_email } = await req.json()

    if (action === 'generate') {
      if (!Number.isInteger(year) || year < 2020 || year > 2100) throw new Error('Anno non valido')
      if (!Number.isInteger(week_number) || week_number < 1 || week_number > 53) throw new Error('Settimana non valida')

      const { data: existing } = await supabaseClient
        .from('team_workouts')
        .select('status')
        .eq('team_id', 'mtt')
        .eq('year', year)
        .eq('week_number', week_number)
        .maybeSingle()
      if (existing && existing.status !== 'draft') {
        throw new Error(`Allenamento settimana ${week_number} già in stato «${existing.status}»: rigenerazione consentita solo su bozze`)
      }

      const targetDate = dateFromIsoWeek(year, week_number)
      const skeleton = buildWeekSkeleton(targetDate)

      const { data: prevWorkout } = await supabaseClient
        .from('team_workouts')
        .select('content')
        .eq('team_id', 'mtt')
        .eq('year', year)
        .eq('week_number', week_number - 1)
        .maybeSingle()
      const prevContent = prevWorkout?.content as { title?: unknown } | null
      const previousTitle = typeof prevContent?.title === 'string' ? prevContent.title : undefined

      const llmResult = await renderWithLLM(skeleton, year, week_number, previousTitle)
      const workoutContent = llmResult
        ? llmResult.content
        : renderStaticContent(skeleton, year, week_number)

      const { data, error } = await supabaseClient
        .from('team_workouts')
        .upsert({
          team_id: 'mtt',
          year,
          week_number,
          status: 'draft',
          generated_by: llmResult ? 'ai' : 'rules',
          generated_at: new Date().toISOString(),
          approved_by: null,
          approved_at: null,
          sent_at: null,
          telegram_message_ids: [],
          content: workoutContent,
          images: [],
          ai_prompt_used: `periodization=${skeleton.macroPhase}/meso${skeleton.weekInMeso}/recovery=${skeleton.isRecovery}; llm=${llmResult ? llmResult.model : 'none (fallback statico)'}`,
          sources: [
            'Periodizzazione a regole: macro-fase stagionale + mesociclo 4 settimane',
            llmResult ? `Rendering LLM: ${llmResult.model}` : 'Rendering statico di fallback',
          ],
        }, { onConflict: 'team_id,year,week_number' })
        .select()
        .single()

      if (error) throw error

      return new Response(JSON.stringify({ success: true, workout: data }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'send') {
      const { data: workout, error: wError } = await supabaseClient
        .from('team_workouts')
        .select('*')
        .eq('id', workout_id)
        .eq('team_id', 'mtt')
        .maybeSingle()

      if (wError) throw wError
      if (!workout) throw new Error('Allenamento non trovato')
      if (workout.status === 'sent') throw new Error('Allenamento gia inviato')
      if (workout.status !== 'approved' && workout.status !== 'scheduled') {
        throw new Error('Solo gli allenamenti approvati possono essere inviati')
      }

      const { data: team, error: teamError } = await supabaseClient
        .from('teams')
        .select('telegram_chat_id')
        .eq('id', workout.team_id)
        .maybeSingle()

      if (teamError) throw teamError

      const overrideChatId = typeof chat_id === 'string' && /^-?\d+$/.test(chat_id.trim())
        ? chat_id.trim()
        : null

      const chatId = overrideChatId || team?.telegram_chat_id || MTT_FALLBACK_CHAT_ID
      const token = Deno.env.get('TELEGRAM_BOT_TOKEN')

      if (!token) throw new Error('TELEGRAM_BOT_TOKEN non configurato')

      const messageIds: number[] = []
      const content = workout.content

      const sendMsg = async (text: string) => {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'Markdown',
            disable_web_page_preview: true
          })
        })
        const data = await res.json()
        if (!res.ok || !data.ok) {
          throw new Error(data.description || `Errore Telegram (${res.status})`)
        }
        messageIds.push(data.result.message_id)
        return data
      }

      try {
        let header = `*🏊🚴🏃 ${content.title}*\n\n`
        header += `${content.intro}\n\n`
        await sendMsg(header)

        await sendMsg(`*🏊 NUOTO*\n\n`)
        for (const block of content.swim) {
          let msg = `*${block.title}* (${block.duration})\n\n`
          if (block.warmup?.length) {
            msg += `*Riscaldamento:*\n${block.warmup.map((x: string) => `• ${x}`).join('\n')}\n\n`
          }
          msg += `*Parte principale:*\n${block.main.map((x: string) => `• ${x}`).join('\n')}\n\n`
          if (block.cooldown?.length) {
            msg += `*Defaticamento:*\n${block.cooldown.map((x: string) => `• ${x}`).join('\n')}\n\n`
          }
          if (block.tips?.length) {
            msg += `*Consigli:*\n${block.tips.map((x: string) => `💡 ${x}`).join('\n')}\n`
          }
          await sendMsg(msg)
        }

        await sendMsg(`*🚴 BICI*\n\n`)
        for (const block of content.bike) {
          let msg = `*${block.title}* (${block.duration})\n\n`
          if (block.warmup?.length) {
            msg += `*Riscaldamento:*\n${block.warmup.map((x: string) => `• ${x}`).join('\n')}\n\n`
          }
          msg += `*Parte principale:*\n${block.main.map((x: string) => `• ${x}`).join('\n')}\n\n`
          if (block.cooldown?.length) {
            msg += `*Defaticamento:*\n${block.cooldown.map((x: string) => `• ${x}`).join('\n')}\n\n`
          }
          if (block.tips?.length) {
            msg += `*Consigli:*\n${block.tips.map((x: string) => `💡 ${x}`).join('\n')}\n`
          }
          await sendMsg(msg)
        }

        await sendMsg(`*🏃 CORSA*\n\n`)
        for (const block of content.run) {
          let msg = `*${block.title}* (${block.duration})\n\n`
          if (block.warmup?.length) {
            msg += `*Riscaldamento:*\n${block.warmup.map((x: string) => `• ${x}`).join('\n')}\n\n`
          }
          msg += `*Parte principale:*\n${block.main.map((x: string) => `• ${x}`).join('\n')}\n\n`
          if (block.cooldown?.length) {
            msg += `*Defaticamento:*\n${block.cooldown.map((x: string) => `• ${x}`).join('\n')}\n\n`
          }
          if (block.tips?.length) {
            msg += `*Consigli:*\n${block.tips.map((x: string) => `💡 ${x}`).join('\n')}\n`
          }
          await sendMsg(msg)
        }

        let tips = `*💡 COME ADATTARE GLI ALLENAMENTI*\n\n`
        tips += `*FTP:* ${content.adaptation_tips.ftp}\n\n`
        tips += `*VO2max:* ${content.adaptation_tips.vo2max}\n\n`
        tips += `*Andature/Velocita:* ${content.adaptation_tips.pace}\n\n`
        tips += `_${content.notes}_`
        await sendMsg(tips)
      } catch (sendError) {
        await supabaseClient
          .from('team_workouts')
          .update({ status: 'error' })
          .eq('id', workout_id)
        throw sendError
      }

      const { error: updateError } = await supabaseClient
        .from('team_workouts')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          telegram_message_ids: messageIds
        })
        .eq('id', workout_id)

      if (updateError) throw updateError

      // Newsletter best-effort: se fallisce non invalida l'invio Telegram
      let newsletter: Record<string, unknown> | null = null
      if (workout.content?.newsletter && !workout.newsletter_sent_at) {
        try {
          newsletter = await dispatchNewsletter(supabaseClient, workout, null)
        } catch (e) {
          newsletter = { error: e instanceof Error ? e.message : String(e) }
        }
      }

      return new Response(JSON.stringify({ success: true, message_count: messageIds.length, newsletter }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'send-newsletter') {
      if (!workout_id) throw new Error('workout_id mancante')
      const testEmail = typeof test_email === 'string' && test_email.includes('@')
        ? test_email
        : null

      const { data: workout, error: findError } = await supabaseClient
        .from('team_workouts')
        .select('*')
        .eq('id', workout_id)
        .single()
      if (findError || !workout) throw new Error('Allenamento non trovato')

      if (!['approved', 'sent'].includes(workout.status)) {
        throw new Error('Approvare la settimana prima di inviare la newsletter')
      }
      if (!workout.content?.newsletter) {
        throw new Error('Contenuto newsletter mancante: rigenerare la settimana')
      }
      if (workout.newsletter_sent_at && !testEmail) {
        throw new Error('Newsletter già inviata per questa settimana')
      }

      const result = await dispatchNewsletter(supabaseClient, workout, testEmail)
      return new Response(JSON.stringify({ success: true, ...result }), {
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
