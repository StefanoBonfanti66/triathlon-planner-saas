// Newsletter settimanale MTT: HTML email-safe + invio Resend + destinatari da auth.users

export interface NewsletterContent {
  subject: string
  intro: string
  extra: string
}

export interface NewsletterWorkoutContent {
  title: string
  intro: string
  swim: Array<{ title: string; duration?: string; main: string[] }>
  bike: Array<{ title: string; duration?: string; main: string[]; brickRun?: { duration?: string; main: string[] } }>
  run: Array<{ title: string; duration?: string; main: string[] }>
  notes: string
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

function disciplineSection(label: string, emoji: string, blocks: NewsletterWorkoutContent['swim'], brickRuns?: Array<{ duration?: string; main: string[] }>): string {
  if (!blocks?.length) return ''
  const rows = blocks.map((b) => `
    <tr><td colspan="2" style="padding:12px 0 4px;font-size:14px;font-weight:bold;color:#0f172a;">
      ${esc(b.title)}${b.duration ? ` <span style="color:#64748b;font-weight:normal;">(${esc(b.duration)})</span>` : ''}
    </td></tr>
    ${b.main.map((line) => `
    <tr><td width="12" style="padding:2px 0 2px 12px;color:#3b82f6;font-size:13px;">•</td>
        <td style="padding:2px 0;color:#334155;font-size:13px;line-height:1.5;">${esc(line)}</td></tr>`).join('')}`).join('')

  const brickRows = brickRuns?.map((b) => `
    <tr><td width="12" style="padding:2px 0 2px 12px;color:#2563eb;font-size:13px;">•</td>
        <td style="padding:2px 0;color:#334155;font-size:13px;line-height:1.5;">${esc(b.main.join(' → '))} ${b.duration ? `(${esc(b.duration)})` : ''}</td></tr>`).join('')

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
      <tr><td style="padding:16px 0 4px;font-size:15px;font-weight:900;color:#1e40af;letter-spacing:0.05em;text-transform:uppercase;">
        ${emoji} ${esc(label)}${brickRuns?.length ? ` <span style="color:#94a3b8;font-weight:normal;">(+${brickRuns.length} corsa dopo bici)</span>` : ''}
      </td></tr>
      ${rows}
      ${brickRows ? `<tr><td colspan="2" style="padding:14px 0 4px;font-size:13px;font-weight:bold;color:#c2410c;">🏃 Corsa dopo bici (brick)</td></tr>${brickRows}` : ''}
    </table>`
}

export function buildNewsletterHtml(
  content: NewsletterWorkoutContent,
  weekNumber: number,
  year: number,
): string {
  const nl = content.newsletter
  const subject = nl?.subject?.trim() || `Allenamenti MTT — Settimana ${weekNumber}/${year}`
  const intro = nl?.intro?.trim() || content.intro
  const extra = nl?.extra?.trim() || ''

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
          <p style="font-size:14px;color:#334155;line-height:1.65;margin:0 0 16px;white-space:pre-line;">${esc(intro)}</p>
        </td></tr>
        ${extra ? `<tr><td style="padding:8px 36px;">
          <div style="background:#fef9c3;border-radius:16px;padding:20px 24px;">
            <div style="font-size:12px;font-weight:900;color:#a16207;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px;">📣 Altro dalla squadra</div>
            <p style="font-size:14px;color:#422006;line-height:1.6;margin:0;white-space:pre-line;">${esc(extra)}</p>
          </div>
        </td></tr>` : ''}
        <tr><td style="padding:16px 36px 0;">
          <div style="font-size:12px;font-weight:900;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">Questa settimana in sintesi</div>
        </td></tr>
        <tr><td style="padding:0 36px;">
          ${disciplineSection('Nuoto', '🏊', content.swim)}
          ${disciplineSection('Bici', '🚴', content.bike, content.bike.filter((b) => !!b.brickRun).map((b) => b.brickRun!))}
          ${disciplineSection('Corsa', '🏃', content.run)}
        </td></tr>
        <tr><td style="padding:8px 36px 0;">
          <div style="background:#f8fafc;border-radius:16px;padding:20px 24px;margin:8px 0 16px;">
            <div style="font-size:13px;color:#475569;line-height:1.6;margin:0;white-space:pre-line;">${esc(content.notes)}</div>
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
  const lines: string[] = [subject, '', nl?.intro?.trim() || content.intro, '']
  if (nl?.extra?.trim()) lines.push('📣 Altro dalla squadra:', nl.extra.trim(), '')
  const addBlocks = (label: string, blocks: NewsletterWorkoutContent['swim']) => {
    if (!blocks?.length) return
    lines.push(label.toUpperCase())
    for (const b of blocks) {
      lines.push(`• ${b.title}${b.duration ? ` (${b.duration})` : ''}`)
      for (const m of b.main) lines.push(`   - ${m}`)
    }
    lines.push('')
  }
  addBlocks('Nuoto', content.swim)
  addBlocks('Bici', content.bike)
  addBlocks('Corsa', content.run)
  lines.push(content.notes, '', `Gruppo Telegram: ${TELEGRAM_INVITE_URL}`, `Guida test FTP: ${FTP_GUIDE_URL}`)
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
