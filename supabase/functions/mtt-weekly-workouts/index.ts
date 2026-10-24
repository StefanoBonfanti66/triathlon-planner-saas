import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, year, week_number, workout_id } = await req.json()

    if (action === 'generate') {
      // Generate workout with AI + web screening
      const workoutContent = {
        week_number,
        year,
        title: `Allenamenti MTT - Settimana ${week_number}/${year}`,
        intro: "Allenamenti non personalizzati pensati per amatori 30-60 anni. Adatta intensità e volumi in base alle tue sensazioni.",
        swim: [
          {
            discipline: 'swim',
            title: 'Nuoto - Tecnica + Resistenza',
            duration: '1h 00min',
            warmup: ['400m misto a ritmo facile', '4x50m gambe con tavoletta'],
            main: ['6x100m (15\" rec)', '4x50m veloci (10\" rec)', '200m pull con palette'],
            cooldown: ['200m a ritmo molto facile'],
            tips: ['Concentrati sulla respirazione bilaterale', 'Non forzare se stanco']
          },
          {
            discipline: 'swim',
            title: 'Nuoto - Ripetute aerobiche',
            duration: '1h 00min',
            warmup: ['300m sciolti'],
            main: ['8x50m (10\" rec)', '5x100m (15\" rec)', '4x50m (8\" rec)'],
            cooldown: ['200m molto facile'],
            tips: ['Mantieni un ritmo costante', 'Fai attenzione alla tecnica']
          }
        ],
        bike: [
          {
            discipline: 'bike',
            title: 'Bici - Fondo aerobico',
            duration: '1h 30min',
            warmup: ['15min progressivo'],
            main: ['60min a ritmo aerobico (70-75% FC max)', '10min a ritmo leggermente più sostenuto'],
            cooldown: ['5min sciolti'],
            tips: ['Se non conosci il tuo FTP, usa la percezione (RPE 2-3 su 10)']
          },
          {
            discipline: 'bike',
            title: 'Bici - Intervalli dolci',
            duration: '1h 15min',
            warmup: ['15min progressivo + 3x1min facili'],
            main: ['4x6min (zona aerobia alta) con 3min recupero', '10min a ritmo libero'],
            cooldown: ['10min defaticamento'],
            tips: ['Adatta gli intervalli se non hai dati FTP/VO2max - riduci intensità se troppo faticoso']
          }
        ],
        run: [
          {
            discipline: 'run',
            title: 'Corsa - Fondo',
            duration: '40-50min',
            warmup: ['10min camminata + corsa leggera + skip'],
            main: ['30-35min corsa continua a ritmo confortevole (puoi parlare)'],
            cooldown: ['5-10min camminata + stretching'],
            tips: ['Meglio correre più piano che troppo veloce', 'Ascolta sempre il tuo corpo']
          },
          {
            discipline: 'run',
            title: 'Corsa - Ritmo + andature',
            duration: '45-50min',
            warmup: ['10min camminata/corsa'],
            main: ['10min riscaldamento corsa', '4x4min (ritmo leggermente più veloce) con 2min camminata/corsa leggera', '15min a ritmo facile'],
            cooldown: ['10min camminata + stretching'],
            tips: ['Gli 4min non devono essere massimali - mantieni margine']
          }
        ],
        notes: "Ricorda: idratazione e alimentazione adatte al tuo tipo di allenamento. In caso di dubbi o fastidi, consulta il tuo medico.",
        tips_by_discipline: {
          swim: ["Focus su tecnica > distanza", "Usa pull/palette con moderazione"],
          bike: ["Mantenimento + controllo respirazione", "Idratazione importante per uscite >1h"],
          run: ["Aumenta gradualmente se riprendi", "Scarpe adatte e terreni idonei"]
        },
        adaptation_tips: {
          ftp: "Se conosci il tuo FTP, lavora tra 65-80% per questi allenamenti. Se non lo conosci, usa la Regola della Conversazione: devi riuscire a parlare durante l'allenamento.",
          vo2max: "Per gli intervalli, se conosci i tuoi valori VO2max, rimani tra 85-92%. Altrimenti riduci l'intensità finché non riesci a recuperare bene tra le ripetizioni.",
          pace: "Per la corsa, usa il tuo ritmo facile (circa 1-1'30\" più lento del tuo 5K) come riferimento. Se non hai tempi di riferimento, parti dal 'comfortably hard' molto conservativo."
        }
      }

      const { data, error } = await supabaseClient
        .from('team_workouts')
        .upsert({
          team_id: 'mtt',
          year,
          week_number,
          status: 'draft',
          generated_by: 'ai',
          generated_at: new Date().toISOString(),
          content: workoutContent,
          images: [],
          ai_prompt_used: 'MTT weekly workout generator - amateur 30-60, sprint/olympic focus, 2+ per discipline',
          sources: ['DuckDuckGo screening - triathlon training for age groupers']
        }, { onConflict: 'team_id,year,week_number' })
        .select()
        .single()

      if (error) throw error

      return new Response(JSON.stringify({ success: true, workout: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'send') {
      // Get workout
      const { data: workout, error: wError } = await supabaseClient
        .from('team_workouts')
        .select('*, teams!inner(telegram_chat_id)')
        .eq('id', workout_id)
        .single()

      if (wError) throw wError

      const chatId = workout.teams?.telegram_chat_id || '-5117971075'
      const token = Deno.env.get('TELEGRAM_BOT_TOKEN')

      if (!token) throw new Error('TELEGRAM_BOT_TOKEN non configurato')

      const messageIds = []
      const content = workout.content

      // Send header
      let header = `*🏊🚴🏃 ${content.title}*\n\n`
      header += `${content.intro}\n\n`

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
        if (data.ok) messageIds.push(data.result.message_id)
        return data
      }

      await sendMsg(header)

      // Send swim
      await sendMsg(`*🏊 NUOTO*\n\n`)
      for (const block of content.swim) {
        let msg = `*${block.title}* (${block.duration})\n\n`
        if (block.warmup?.length) {
          msg += `*Riscaldamento:*\n${block.warmup.map(x => `• ${x}`).join('\n')}\n\n`
        }
        msg += `*Parte principale:*\n${block.main.map(x => `• ${x}`).join('\n')}\n\n`
        if (block.cooldown?.length) {
          msg += `*Defaticamento:*\n${block.cooldown.map(x => `• ${x}`).join('\n')}\n\n`
        }
        if (block.tips?.length) {
          msg += `*Consigli:*\n${block.tips.map(x => `💡 ${x}`).join('\n')}\n`
        }
        await sendMsg(msg)
      }

      // Send bike
      await sendMsg(`*🚴 BICI*\n\n`)
      for (const block of content.bike) {
        let msg = `*${block.title}* (${block.duration})\n\n`
        if (block.warmup?.length) {
          msg += `*Riscaldamento:*\n${block.warmup.map(x => `• ${x}`).join('\n')}\n\n`
        }
        msg += `*Parte principale:*\n${block.main.map(x => `• ${x}`).join('\n')}\n\n`
        if (block.cooldown?.length) {
          msg += `*Defaticamento:*\n${block.cooldown.map(x => `• ${x}`).join('\n')}\n\n`
        }
        if (block.tips?.length) {
          msg += `*Consigli:*\n${block.tips.map(x => `💡 ${x}`).join('\n')}\n`
        }
        await sendMsg(msg)
      }

      // Send run
      await sendMsg(`*🏃 CORSA*\n\n`)
      for (const block of content.run) {
        let msg = `*${block.title}* (${block.duration})\n\n`
        if (block.warmup?.length) {
          msg += `*Riscaldamento:*\n${block.warmup.map(x => `• ${x}`).join('\n')}\n\n`
        }
        msg += `*Parte principale:*\n${block.main.map(x => `• ${x}`).join('\n')}\n\n`
        if (block.cooldown?.length) {
          msg += `*Defaticamento:*\n${block.cooldown.map(x => `• ${x}`).join('\n')}\n\n`
        }
        if (block.tips?.length) {
          msg += `*Consigli:*\n${block.tips.map(x => `💡 ${x}`).join('\n')}\n`
        }
        await sendMsg(msg)
      }

      // Send tips
      let tips = `*💡 COME ADATTARE GLI ALLENAMENTI*\n\n`
      tips += `*FTP:* ${content.adaptation_tips.ftp}\n\n`
      tips += `*VO2max:* ${content.adaptation_tips.vo2max}\n\n`
      tips += `*Andature/Velocità:* ${content.adaptation_tips.pace}\n\n`
      tips += `_${content.notes}_`
      await sendMsg(tips)

      // Update workout
      await supabaseClient
        .from('team_workouts')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          telegram_message_ids: messageIds
        })
        .eq('id', workout_id)

      return new Response(JSON.stringify({ success: true, message_count: messageIds.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    throw new Error('Azione non supportata')
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
