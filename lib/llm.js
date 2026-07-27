import OpenAI from 'openai';

export const llm = new OpenAI({
  apiKey: process.env.EMERGENT_LLM_KEY,
  baseURL: process.env.EMERGENT_LLM_BASE_URL,
});

export const MODEL = 'gpt-4o-mini';
export const MODEL_EXTRACT = 'gpt-4o-mini';
export const MODEL_SIMULATE = 'gpt-4o-mini';
