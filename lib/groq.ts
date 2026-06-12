import { Groq } from 'groq-sdk';

// Wrap in a function to lazily initialize only when actually needed
let groqClient: Groq | null = null;

export function getGroqClient() {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'MY_GROQ_API_KEY') {
      throw new Error('GROQ_API_KEY is not configured.');
    }
    groqClient = new Groq({
      apiKey,
    });
  }
  return groqClient;
}
