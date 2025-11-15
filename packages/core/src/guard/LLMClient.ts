import { LLMClientError } from './errors.js';

export type GenerateParams = {
  prompt: string;
  model?: string;
  temperature?: number;
  systemPrompt?: string;
};

export type GenerateResult = {
  content: string;
};

export interface LLMClient {
  generate(params: GenerateParams): Promise<GenerateResult>;
}

type FetchLike = (url: string, init: FetchInit) => Promise<FetchResponse>;

type FetchInit = {
  method: string;
  headers: Record<string, string>;
  body: string;
};

type FetchResponse = {
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
};

type OpenAICompatibleClientOptions = {
  apiKey?: string;
  endpoint?: string;
  defaultModel?: string;
  defaultTemperature?: number;
  fetchImpl?: FetchLike;
};

const DEFAULT_MODEL = 'gpt-4o-mini';

export class OpenAICompatibleLLMClient implements LLMClient {
  private readonly apiKey?: string;
  private readonly endpoint: string;
  private readonly defaultModel: string;
  private readonly defaultTemperature: number;
  private readonly fetchImpl: FetchLike;

  constructor({
    apiKey,
    endpoint = 'https://api.openai.com',
    defaultModel = DEFAULT_MODEL,
    defaultTemperature = 0,
    fetchImpl
  }: OpenAICompatibleClientOptions = {}) {
    this.apiKey = apiKey;
    this.endpoint = endpoint.replace(/\/$/, '');
    this.defaultModel = defaultModel;
    this.defaultTemperature = defaultTemperature;
    const globalFetch = (globalThis as { fetch?: FetchLike }).fetch;
    this.fetchImpl = fetchImpl ?? globalFetch ?? (async () => {
      throw new LLMClientError('Fetch implementation is not available in this environment.', 'configuration');
    });
  }

  async generate({ prompt, model, temperature, systemPrompt }: GenerateParams): Promise<GenerateResult> {
    if (!this.apiKey) {
      throw new LLMClientError('LLM API key is not configured.', 'configuration');
    }
    const targetModel = model ?? this.defaultModel;
    if (!targetModel) {
      throw new LLMClientError('No model specified for LLM request.', 'configuration');
    }
    const payload = {
      model: targetModel,
      temperature: typeof temperature === 'number' ? temperature : this.defaultTemperature,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt }
      ]
    };
    const response = await this.postJson('/v1/chat/completions', payload);
    const content = extractContent(response);
    if (!content) {
      throw new LLMClientError('LLM response did not include content.', 'connection');
    }
    return { content };
  }

  private async postJson(pathname: string, payload: Record<string, unknown>): Promise<unknown> {
    const url = `${this.endpoint}${pathname}`;
    try {
      const response = await this.fetchImpl(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const body = await response.text();
        throw new LLMClientError(
          `LLM request failed with status ${response.status}: ${truncate(body, 200)}`,
          response.status >= 500 ? 'connection' : 'configuration'
        );
      }
      return await response.json();
    } catch (error) {
      if (error instanceof LLMClientError) {
        throw error;
      }
      throw new LLMClientError(
        error instanceof Error ? error.message : 'Unknown LLM error',
        'connection'
      );
    }
  }
}

function extractContent(response: unknown): string | undefined {
  if (!response || typeof response !== 'object') {
    return undefined;
  }
  const payload = response as { choices?: Array<{ message?: { content?: string } }> };
  const choices = payload.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return undefined;
  }
  const message = choices[0]?.message;
  if (!message || typeof message.content !== 'string') {
    return undefined;
  }
  return message.content;
}

function truncate(value: string, max: number): string {
  if (!value || value.length <= max) {
    return value;
  }
  return `${value.slice(0, max)}…`;
}

export class FakeLLMClient implements LLMClient {
  constructor(private readonly script: () => string | Promise<string>) {}

  async generate(): Promise<GenerateResult> {
    const content = await this.script();
    return { content };
  }
}
