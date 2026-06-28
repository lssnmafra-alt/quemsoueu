'use server';

import { getGroqClient } from '@/lib/groq';

let groqModerationUnavailable = false;
let loggedGroqModerationUnavailable = false;

function hasGroqModerationKey() {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  return Boolean(apiKey && apiKey !== 'MY_GROQ_API_KEY');
}

function moderationErrorSummary(error: any) {
  return {
    provider: 'Groq',
    endpoint: 'moderateText',
    status: error?.status,
    code: error?.code || error?.error?.code,
    type: error?.type || error?.error?.type,
    reason: error?.message || 'Moderation provider request failed',
  };
}

function isGroqAuthError(error: any) {
  const status = Number(error?.status || error?.response?.status || 0);
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || error?.error?.code || '').toLowerCase();
  return status === 401 || code.includes('invalid_api_key') || message.includes('invalid api key');
}

function warnModerationFallback(error: any) {
  const summary = moderationErrorSummary(error);

  if (isGroqAuthError(error)) {
    groqModerationUnavailable = true;
    if (loggedGroqModerationUnavailable) return;
    loggedGroqModerationUnavailable = true;
  }

  console.warn('Moderation fallback active:', JSON.stringify(summary));
}

export async function moderateText(text: string): Promise<boolean> {
  try {
    if (!hasGroqModerationKey() || groqModerationUnavailable) {
      return true; // Bypass if not configured properly
    }
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a strict moderation AI for a game. Answer ONLY "SAFE" if the provided text is appropriate, or "UNSAFE" if it contains profanity, slurs, hatespeech, or highly inappropriate sexual references.',
        },
        { role: 'user', content: text },
      ],
      model: 'llama-3.1-8b-instant',
    });
    const result = completion.choices[0]?.message?.content?.trim();
    return result !== 'UNSAFE';
  } catch (err) {
    warnModerationFallback(err);
    return true; // Fail open
  }
}
