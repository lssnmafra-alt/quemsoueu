'use server';

import { getGroqClient } from '@/lib/groq';

export async function moderateText(text: string): Promise<boolean> {
  try {
    const groq = getGroqClient();
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'MY_GROQ_API_KEY') {
      return true; // Bypass if not configured properly
    }
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
    console.error('Groq moderation error', err);
    return true; // Fail open
  }
}
