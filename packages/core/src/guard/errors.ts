export class LLMClientError extends Error {
  constructor(message: string, readonly reason: 'configuration' | 'connection' | 'unknown' = 'unknown') {
    super(message);
    this.name = 'LLMClientError';
  }
}
