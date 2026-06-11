import { Groq } from 'groq-sdk';

// Wrap in a function to lazily initialize only when actually needed
let groqClient: Groq | null = null;

export function getGroqClient() {
  if (!groqClient) {
    if (!process.env.GROQ_API_KEY) {
      console.warn("GROQ_API_KEY is not set. Groq moderation will fail.");
    }
    groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY || "dummy", 
    });
  }
  return groqClient;
}
