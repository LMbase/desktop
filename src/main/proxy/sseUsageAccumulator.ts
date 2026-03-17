import type { Provider } from '../../shared/constants';
import { extractUsage, type UsageCounts } from './usageExtractor';

function decodeChunk(chunk: Uint8Array | Buffer | string): string {
  if (typeof chunk === 'string') {
    return chunk;
  }
  return Buffer.from(chunk).toString('utf-8');
}

export function extractSsePayload(rawEvent: string): string | null {
  const payloadLines: string[] = [];
  for (const line of rawEvent.split('\n')) {
    const stripped = line.trim();
    if (!stripped.startsWith('data:')) {
      continue;
    }
    payloadLines.push(stripped.slice('data:'.length).trim());
  }

  if (payloadLines.length === 0) {
    return null;
  }

  const payload = payloadLines.join('\n').trim();
  if (!payload || payload === '[DONE]') {
    return null;
  }

  return payload;
}

export class SseUsageAccumulator {
  private readonly provider: Provider;
  private buffer = '';
  private totals: UsageCounts = { inputTokens: 0, outputTokens: 0 };

  constructor(provider: Provider) {
    this.provider = provider;
  }

  pushChunk(chunk: Uint8Array | Buffer | string): UsageCounts {
    this.buffer += decodeChunk(chunk).replace(/\r\n/g, '\n');

    while (this.buffer.includes('\n\n')) {
      const splitIndex = this.buffer.indexOf('\n\n');
      const rawEvent = this.buffer.slice(0, splitIndex);
      this.buffer = this.buffer.slice(splitIndex + 2);

      const payload = extractSsePayload(rawEvent);
      if (!payload) {
        continue;
      }

      try {
        const json = JSON.parse(payload) as unknown;
        const usage = extractUsage(json, this.provider);
        this.totals.inputTokens = Math.max(this.totals.inputTokens, usage.inputTokens);
        this.totals.outputTokens = Math.max(this.totals.outputTokens, usage.outputTokens);
      } catch {
        continue;
      }
    }

    return this.getTotals();
  }

  getTotals(): UsageCounts {
    return { ...this.totals };
  }
}
