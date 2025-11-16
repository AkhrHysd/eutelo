export type LLMClientOptions = {
  endpoint: string;
  apiKey: string;
  model?: string;
  timeout?: number;
};

export type LLMGenerateOptions = {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
};

export type LLMResponse = {
  content: string;
};

export type LLMClientError = {
  type: 'connection' | 'authentication' | 'rate-limit' | 'unknown';
  message: string;
};

export interface LLMClient {
  generate(options: LLMGenerateOptions): Promise<LLMResponse>;
}

export class OpenAICompatibleLLMClient implements LLMClient {
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly defaultModel: string;
  private readonly timeout: number;

  constructor(options: LLMClientOptions) {
    this.endpoint = options.endpoint.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.defaultModel = options.model || 'gpt-4o-mini';
    this.timeout = options.timeout || 30000;
  }

  async generate(options: LLMGenerateOptions): Promise<LLMResponse> {
    const model = options.model || this.defaultModel;
    const url = `${this.endpoint}/v1/chat/completions`;

    const messages: Array<{ role: string; content: string }> = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: options.prompt });

    const body = {
      model,
      messages,
      temperature: options.temperature ?? 0.3
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw this.createError(response.status, errorText);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        error?: { message?: string };
      };

      if (data.error) {
        throw this.createError(response.status, data.error.message || 'LLM API error');
      }

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw this.createError(500, 'No content in LLM response');
      }

      return { content };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw {
          type: 'connection' as const,
          message: `Request timeout after ${this.timeout}ms`
        };
      }
      if (error && typeof error === 'object' && 'type' in error) {
        throw error;
      }
      throw {
        type: 'connection' as const,
        message: error instanceof Error ? error.message : 'Unknown LLM connection error'
      };
    }
  }

  private createError(status: number, message: string): LLMClientError {
    if (status === 401 || status === 403) {
      return { type: 'authentication', message: 'Authentication failed. Check your API key.' };
    }
    if (status === 429) {
      return { type: 'rate-limit', message: 'Rate limit exceeded. Please try again later.' };
    }
    if (status >= 500) {
      return { type: 'connection', message: `LLM API server error: ${message}` };
    }
    return { type: 'unknown', message: `LLM API error (${status}): ${message}` };
  }
}

