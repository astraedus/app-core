import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

type ModelTier = 'sonnet' | 'haiku';

const MODEL_IDS: Record<ModelTier, string> = {
  sonnet: 'gemini-2.5-flash',
  haiku: 'gemini-2.5-flash',
};

let clientInstance: GoogleGenerativeAI | null = null;

export function getClient(): GoogleGenerativeAI {
  if (!clientInstance) {
    clientInstance = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return clientInstance;
}

export interface AICompletionOptions {
  model: ModelTier;
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  cacheSystemPrompt?: boolean;
}

export interface AICompletionResult {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheHit: boolean;
}

export async function complete(options: AICompletionOptions): Promise<AICompletionResult> {
  const {
    model,
    systemPrompt,
    userMessage,
    maxTokens = 4096,
  } = options;

  const client = getClient();
  const modelId = MODEL_IDS[model];

  const genModel = client.getGenerativeModel({
    model: modelId,
    systemInstruction: systemPrompt,
    generationConfig: {
      maxOutputTokens: maxTokens,
      responseMimeType: 'application/json',
    },
  });

  const result = await genModel.generateContent(userMessage);
  const response = result.response;
  const content = response.text();
  const usage = response.usageMetadata;

  return {
    content,
    model: modelId,
    inputTokens: usage?.promptTokenCount ?? 0,
    outputTokens: usage?.candidatesTokenCount ?? 0,
    cacheHit: false,
  };
}

export function parseJsonResponse<T>(content: string): T {
  let cleaned = content.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  return JSON.parse(cleaned) as T;
}
