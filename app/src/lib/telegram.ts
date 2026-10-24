import { supabase } from './supabase';

const TELEGRAM_API = 'https://api.telegram.org/bot';

export interface TelegramMessageResult {
  ok: boolean;
  message_id?: number;
  error?: string;
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options: {
    parse_mode?: 'Markdown' | 'HTML';
    disable_web_page_preview?: boolean;
  } = {}
): Promise<TelegramMessageResult> {
  const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    return { ok: false, error: 'TELEGRAM_BOT_TOKEN non configurato' };
  }

  try {
    const response = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options.parse_mode || 'Markdown',
        disable_web_page_preview: options.disable_web_page_preview ?? true,
      }),
    });

    const data = await response.json();
    if (data.ok) {
      return { ok: true, message_id: data.result.message_id };
    }
    return { ok: false, error: data.description || 'Errore sconosciuto' };
  } catch (error: any) {
    return { ok: false, error: error.message };
  }
}

export async function sendTelegramPhoto(
  chatId: string,
  photoUrl: string,
  caption?: string,
  options: {
    parse_mode?: 'Markdown' | 'HTML';
  } = {}
): Promise<TelegramMessageResult> {
  const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    return { ok: false, error: 'TELETAGRAM_BOT_TOKEN non configurato' };
  }

  try {
    const response = await fetch(`${TELEGRAM_API}${token}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption,
        parse_mode: options.parse_mode || 'Markdown',
      }),
    });

    const data = await response.json();
    if (data.ok) {
      return { ok: true, message_id: data.result.message_id };
    }
    return { ok: false, error: data.description || 'Errore sconosciuto' };
  } catch (error: any) {
    return { ok: false, error: error.message };
  }
}

export async function sendTelegramMediaGroup(
  chatId: string,
  media: Array<{ type: 'photo'; media: string; caption?: string; parse_mode?: 'Markdown' | 'HTML' }>
): Promise<TelegramMessageResult> {
  const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    return { ok: false, error: 'TELEGRAM_BOT_TOKEN non configurato' };
  }

  try {
    const response = fetch(`${TELEGRAM_API}${token}/sendMediaGroup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        media,
      }),
    });

    const data = (await response).json();
    if ((await response).ok && data.ok) {
      return { ok: true };
    }
    return { ok: false, error: data.description || 'Errore sconosciuto' };
  } catch (error: any) {
    return { ok: false, error: error.message };
  }
}
