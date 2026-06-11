import OpenAI from "openai";

let openRouterClient: OpenAI | null = null;

export function getOpenRouterClient(): OpenAI {
  if (!openRouterClient) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY environment variable is required");
    }
    openRouterClient = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: apiKey,
      defaultHeaders: {
        "HTTP-Referer": process.env.APP_URL || "https://ai.studio/build",
        "X-Title": "Marvel Decks App",
      },
    });
  }
  return openRouterClient;
}
