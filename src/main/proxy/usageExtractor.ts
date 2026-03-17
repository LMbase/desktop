import type { Provider } from '../../shared/constants';

export interface UsageCounts {
  inputTokens: number;
  outputTokens: number;
}

function toInt(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value === 'boolean') {
    return Number(value);
  }
  return 0;
}

export function extractUsage(payload: unknown, provider: Provider): UsageCounts {
  if (!payload || typeof payload !== 'object') {
    return { inputTokens: 0, outputTokens: 0 };
  }

  const data = payload as Record<string, unknown>;

  if (provider === 'openai' || provider === 'github-copilot') {
    const usage = data.usage as Record<string, unknown> | undefined;
    if (!usage || typeof usage !== 'object') {
      return { inputTokens: 0, outputTokens: 0 };
    }
    return {
      inputTokens: toInt(usage.prompt_tokens),
      outputTokens: toInt(usage.completion_tokens),
    };
  }

  if (provider === 'anthropic') {
    const usage = data.usage as Record<string, unknown> | undefined;
    if (!usage || typeof usage !== 'object') {
      return { inputTokens: 0, outputTokens: 0 };
    }
    return {
      inputTokens: toInt(usage.input_tokens),
      outputTokens: toInt(usage.output_tokens),
    };
  }

  if (provider === 'gemini') {
    const usage = data.usageMetadata as Record<string, unknown> | undefined;
    if (!usage || typeof usage !== 'object') {
      return { inputTokens: 0, outputTokens: 0 };
    }
    return {
      inputTokens: toInt(usage.promptTokenCount),
      outputTokens: toInt(usage.candidatesTokenCount),
    };
  }

  return { inputTokens: 0, outputTokens: 0 };
}
