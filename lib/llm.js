import OpenAI from 'openai';

/**
 * Lazy LLM client.
 *
 * The OpenAI constructor throws when no API key is configured, so building it
 * at import time makes every build require a key — and makes a missing key a
 * crash rather than a degraded feature. The client is created on first use and
 * cached; callers handle the throw and fall back to the local parser.
 */
let client;

export function getLlm() {
  const apiKey = process.env.EMERGENT_LLM_KEY;
  if (!apiKey) throw new Error('EMERGENT_LLM_KEY is not configured');
  if (!client) {
    client = new OpenAI({ apiKey, baseURL: process.env.EMERGENT_LLM_BASE_URL });
  }
  return client;
}

/** True when the AI extractor can be attempted at all. */
export function hasLlm() {
  return !!process.env.EMERGENT_LLM_KEY;
}

export const MODEL = 'gpt-4o-mini';
export const MODEL_EXTRACT = 'gpt-4o-mini';
export const MODEL_SIMULATE = 'gpt-4o-mini';
