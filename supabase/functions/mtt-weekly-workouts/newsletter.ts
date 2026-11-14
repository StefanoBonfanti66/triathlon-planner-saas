// Newsletter settimanale MTT: HTML email-safe + invio Resend + destinatari da auth.users

export interface NewsletterContent {
  subject: string
  intro: string
  extra: string
}

export interface NewsletterBlock {
  title: string
  duration?: string
  day?: string
  time?: string
  optional?: boolean
  coachAppointment?: boolean
  choiceGroup?: string
  warmup?: string[]
  main: string[]
  cooldown?: string[]
  tips?: string[]
  brickRun?: { duration?: string; main: string[] }
}

export interface NewsletterWorkoutContent {
  title: string
  intro: string
  swim: NewsletterBlock[]
  bike: NewsletterBlock[]
  run: NewsletterBlock[]
  strength?: NewsletterBlock[]
  notes: string
  tips_by_discipline?: Record<string, string[]>
  adaptation_tips?: { ftp: string; vo2max: string; pace: string }
  newsletter?: NewsletterContent
}

const TELEGRAM_INVITE_URL = Deno.env.get('TELEGRAM_INVITE_URL') ?? 'https://t.me/+7nNv9lvry700NTE0'
const FTP_GUIDE_URL = 'https://www.rivaluta.it/ciclismo/ftp-ciclismo.asp'
const APP_URL = 'https://triathlon-planner-saas.vercel.app'

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Normalizza sequenze letterali \n (backslash+n) lasciate dal LLM in newline vere
function normalizeNewlines(s: unknown): string {
  return String(s ?? '').replace(/\\n/g, '\n')
}

// Converte testo (con eventuali newline vere o sequenze letterali \n) in HTML sicuro con <br>
function textToHtml(s: unknown): string {
  return esc(normalizeNewlines(s)).replace(/\n/g, '<br>')
}

function bulletRows(label: string, lines: string[] | undefined, color: string): string {
  if (!lines?.length) return ''
  return `<tr><td colspan="2" style="padding:8px 0 2px;font-size:12px;font-weight:bold;color:#475569;">${label}</td></tr>
    ${lines.map((line) => `
    <tr><td width="12" style="padding:2px 0 2px 12px;color:${color};font-size:13px;">•</td>
        <td style="padding:2px 0;color:#334155;font-size:13px;line-height:1.5;">${esc(line)}</td></tr>`).join('')}`
}

function disciplineSection(
  label: string,
  emoji: string,
  blocks: NewsletterBlock[],
  tips?: string[],
): string {
  if (!blocks?.length) return ''
  const seenGroups = new Set<string>()
  const rows = blocks.map((b) => {
    let groupNote = ''
    if (b.choiceGroup && !seenGroups.has(b.choiceGroup)) {
      const groupBlocks = blocks.filter((x) => x.choiceGroup === b.choiceGroup)
      if (groupBlocks.length > 1) {
        groupNote = `<tr><td colspan="2" style="padding:8px 0 4px;font-size:12px;font-weight:bold;color:#b45309;">Scegli una sola opzione tra quelle elencate per questo giorno.</td></tr>`
        seenGroups.add(b.choiceGroup)
      }
    }
    const isCoach = b.coachAppointment === true
    return `${groupNote}
    <tr><td colspan="2" style="padding:14px 0 4px;font-size:14px;font-weight:bold;color:#0f172a;">
      ${b.day ? `<span style="color:#64748b;font-weight:normal;">${esc(b.day)} · </span>` : ''}${esc(b.title)}${b.time ? ` <span style="color:#64748b;font-weight:normal;">alle ${esc(b.time)}</span>` : ''}${b.duration ? ` <span style="color:#64748b;font-weight:normal;">(${esc(b.duration)})</span>` : ''}${isCoach ? ' <span style="color:#b45309;font-weight:normal;">appuntamento con coach Simone</span>' : ''}${b.optional ? ' <span style="color:#b45309;font-weight:normal;">(facoltativo)</span>' : ''}
    </td></tr>
    ${isCoach ? '' : bulletRows('Riscaldamento', b.warmup, '#3b82f6')}
    ${bulletRows('Parte principale', b.main, '#3b82f6')}
    ${isCoach ? '' : bulletRows('Defaticamento', b.cooldown, '#3b82f6')}
    ${b.brickRun ? bulletRows(`Corsa dopo bici${b.brickRun.duration ? ` (${b.brickRun.duration})` : ''}`, b.brickRun.main, '#c2410c') : ''}
    ${bulletRows('Consigli', b.tips, '#2563eb')}`
  }).join('')

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
      <tr><td style="padding:16px 0 4px;font-size:15px;font-weight:900;color:#1e40af;letter-spacing:0.05em;text-transform:uppercase;">
        ${emoji} ${esc(label)}
      </td></tr>
      ${rows}
      ${bulletRows(`Consigli ${label}`, tips, '#1e40af')}
    </table>`
}

export function buildNewsletterHtml(
  content: NewsletterWorkoutContent,
  weekNumber: number,
  year: number,
): string {
  const nl = content.newsletter
  const subject = nl?.subject?.trim() || `Allenamenti MTT — Settimana ${weekNumber}/${year}`
  const intro = content.intro
  const extra = nl?.extra?.trim() || ''
  const tips = content.tips_by_discipline ?? {}
  const at = content.adaptation_tips

  const button = (href: string, label: string, bg: string) => `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0;">
      <tr><td style="border-radius:12px;background:${bg};">
        <a href="${esc(href)}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:12px;">${esc(label)}</a>
      </td></tr>
    </table>`

  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
        <tr><td style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:32px 36px;">
          <div style="font-size:12px;font-weight:bold;color:#bfdbfe;letter-spacing:0.15em;text-transform:uppercase;">Milano Triathlon Team</div>
          <div style="font-size:22px;font-weight:900;color:#ffffff;margin-top:6px;line-height:1.3;">${esc(subject)}</div>
        </td></tr>
        <tr><td style="padding:28px 36px 8px;">
          <p style="font-size:14px;color:#334155;line-height:1.65;margin:0 0 16px;">${textToHtml(intro)}</p>
        </td></tr>
        ${extra ? `<tr><td style="padding:8px 36px;">
          <div style="background:#fef9c3;border-radius:16px;padding:20px 24px;">
            <div style="font-size:12px;font-weight:900;color:#a16207;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px;">📣 Altro dalla squadra</div>
            <p style="font-size:14px;color:#422006;line-height:1.6;margin:0;">${textToHtml(extra)}</p>
          </div>
        </td></tr>` : ''}
        <tr><td style="padding:16px 36px 0;">
          <div style="font-size:12px;font-weight:900;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">Questa settimana</div>
        </td></tr>
        <tr><td style="padding:0 36px;">
          ${disciplineSection('Nuoto', '🏊', content.swim, tips.swim)}
          ${disciplineSection('Bici', '🚴', content.bike, tips.bike)}
          ${disciplineSection('Corsa', '🏃', content.run, tips.run)}
          ${disciplineSection('Forza', '💪', content.strength ?? [], tips.strength)}
        </td></tr>
        ${at ? `<tr><td style="padding:8px 36px 0;">
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:16px;padding:20px 24px;margin:8px 0 16px;">
            <div style="font-size:13px;font-weight:900;color:#92400e;margin-bottom:8px;">Come adattare in base alle tue capacità</div>
            <div style="font-size:13px;color:#78350f;line-height:1.6;">
              <p style="margin:0 0 6px;"><strong>FTP:</strong> ${textToHtml(at.ftp)}</p>
              <p style="margin:0 0 6px;"><strong>VO2max:</strong> ${textToHtml(at.vo2max)}</p>
              <p style="margin:0;"><strong>Andature/Velocità:</strong> ${textToHtml(at.pace)}</p>
            </div>
          </div>
        </td></tr>` : ''}
        <tr><td style="padding:8px 36px 0;">
          <div style="background:#f8fafc;border-radius:16px;padding:20px 24px;margin:8px 0 16px;">
            <div style="font-size:13px;color:#475569;line-height:1.6;margin:0;">${textToHtml(content.notes)}</div>
          </div>
        </td></tr>
        <tr><td style="padding:8px 36px 24px;" align="center">
          <div style="font-size:13px;font-weight:bold;color:#0f172a;margin-bottom:4px;">Pronto per la settimana?</div>
          <div style="font-size:12px;color:#64748b;margin-bottom:12px;">Entra nel gruppo per gli aggiornamenti quotidiani e prepara il test FTP.</div>
          ${button(TELEGRAM_INVITE_URL, '📲 Unisciti al gruppo Telegram', '#229ED9')}
          ${button(FTP_GUIDE_URL, '🎯 Come fare il test FTP', '#1e40af')}
        </td></tr>
        <tr><td style="background:#0f172a;padding:20px 36px;">
          <p style="font-size:11px;color:#94a3b8;line-height:1.6;margin:0;">
            Newsletter automatica di <a href="${APP_URL}" style="color:#60a5fa;text-decoration:none;">Race Planner</a> — inviata ogni domenica alle 20:00.<br>
            Per smettere di riceverla o aggiornare il tuo indirizzo, rispondi a questa email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function newsletterPlainText(content: NewsletterWorkoutContent, weekNumber: number, year: number): string {
  const nl = content.newsletter
  const subject = nl?.subject?.trim() || `Allenamenti MTT — Settimana ${weekNumber}/${year}`
  const lines: string[] = [subject, '', normalizeNewlines(content.intro), '']
  if (nl?.extra?.trim()) lines.push('📣 Altro dalla squadra:', normalizeNewlines(nl.extra.trim()), '')
  const addLines = (label: string, values?: string[]) => {
    if (!values?.length) return
    lines.push(`  ${label}:`)
    for (const v of values) lines.push(`   - ${v}`)
  }
  const addBlocks = (label: string, blocks: NewsletterBlock[], tips?: string[]) => {
    if (!blocks?.length) return
    lines.push(label.toUpperCase())
    const seenGroups = new Set<string>()
    for (const b of blocks) {
      let groupNote = ''
      if (b.choiceGroup && !seenGroups.has(b.choiceGroup)) {
        const groupBlocks = blocks.filter((x) => x.choiceGroup === b.choiceGroup)
        if (groupBlocks.length > 1) {
          groupNote = '  Scegli una sola opzione tra quelle elencate per questo giorno.'
          seenGroups.add(b.choiceGroup)
        }
      }
      if (groupNote) lines.push(groupNote)
      const day = b.day ? `${b.day} · ` : ''
      const time = b.time ? ` alle ${b.time}` : ''
      const optional = b.optional ? ' (facoltativo)' : ''
      const isCoach = b.coachAppointment === true
      const coach = isCoach ? ' · appuntamento con coach Simone' : ''
      lines.push(`• ${day}${b.title}${time}${b.duration ? ` (${b.duration})` : ''}${optional}${coach}`)
      if (!isCoach) {
        addLines('Riscaldamento', b.warmup)
      }
      lines.push('  Parte principale:')
      for (const m of b.main) lines.push(`   - ${m}`)
      if (!isCoach) {
        addLines('Defaticamento', b.cooldown)
      }
      if (b.brickRun) {
        lines.push(`  Corsa dopo bici${b.brickRun.duration ? ` (${b.brickRun.duration})` : ''}:`)
        for (const m of b.brickRun.main) lines.push(`   - ${m}`)
      }
      addLines('Consigli', b.tips)
    }
    addLines(`Consigli ${label}`, tips)
    lines.push('')
  }
  const tips = content.tips_by_discipline ?? {}
  addBlocks('Nuoto', content.swim, tips.swim)
  addBlocks('Bici', content.bike, tips.bike)
  addBlocks('Corsa', content.run, tips.run)
  addBlocks('Forza', content.strength ?? [], tips.strength)
  const at = content.adaptation_tips
  if (at) {
    lines.push('COME ADATTARE IN BASE ALLE TUE CAPACITÀ', `- FTP: ${at.ftp}`, `- VO2max: ${at.vo2max}`, `- Andature/Velocità: ${at.pace}`, '')
  }
  lines.push(normalizeNewlines(content.notes), '', `Gruppo Telegram: ${TELEGRAM_INVITE_URL}`, `Guida test FTP: ${FTP_GUIDE_URL}`)
  return lines.join('\n')
}

export interface Recipient {
  email: string
  name: string | null
}

// Destinatari: auth.users (email reali) + team_contacts (CSV soci) per team mtt
export async function getTeamRecipients(supabaseClient: any): Promise<Recipient[]> {
  const recipients: Recipient[] = []
  const seen = new Set<string>()

  // 1) Profili con account Supabase → email da auth.users
  const { data: profiles, error: pErr } = await supabaseClient
    .from('profiles')
    .select('id, first_name, full_name, email')
    .eq('team_id', 'mtt')
    .is('deleted_at', null)
  if (pErr) throw new Error(`Errore profiles: ${pErr.message}`)

  const users: Array<{ id: string; email?: string }> = []
  let page = 1
  for (;;) {
    const res = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/auth/v1/admin/users?page=${page}&per_page=200`,
      {
        headers: {
          apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''}`,
        },
      },
    )
    if (!res.ok) throw new Error(`Errore auth admin users (${res.status})`)
    const data = await res.json()
    const batch: Array<{ id: string; email?: string }> = data.users ?? []
    users.push(...batch)
    if (batch.length < 200) break
    page++
    if (page > 20) break
  }

  const emailById = new Map(users.filter((u) => u.email).map((u) => [u.id, u.email as string]))

  for (const p of profiles ?? []) {
    const email = emailById.get(p.id) ?? p.email
    if (!email) continue
    const key = email.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    recipients.push({ email, name: p.first_name || p.full_name || null })
  }

  // 2) Contatti CSV (atleti senza account Supabase)
  const { data: contacts } = await supabaseClient
    .from('team_contacts')
    .select('email, full_name')
    .eq('team_id', 'mtt')

  for (const c of contacts ?? []) {
    if (!c.email) continue
    const key = c.email.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    recipients.push({ email: c.email, name: c.full_name || null })
  }

  return recipients
}

export async function sendViaResend(
  recipient: Recipient,
  subject: string,
  html: string,
  text: string,
): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) throw new Error('RESEND_API_KEY non configurato')
  const from = Deno.env.get('RESEND_FROM') ?? 'MTT Race Planner <onboarding@resend.dev>'

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from,
      to: [recipient.email],
      subject,
      html,
      text,
    }),
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Resend ${res.status}: ${body.slice(0, 200)}`)
  }
}
