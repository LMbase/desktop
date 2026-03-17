import { describe, expect, it } from 'vitest';
import { extractSsePayload, SseUsageAccumulator } from './sseUsageAccumulator';

describe('sseUsageAccumulator', () => {
  it('extracts a data payload from an SSE event', () => {
    const payload = extractSsePayload('event: message\ndata: {"usage":{"prompt_tokens":1,"completion_tokens":2}}');
    expect(payload).toBe('{"usage":{"prompt_tokens":1,"completion_tokens":2}}');
  });

  it('ignores empty and [DONE] payloads', () => {
    expect(extractSsePayload('data: [DONE]')).toBeNull();
    expect(extractSsePayload('event: ping')).toBeNull();
  });

  it('accumulates max usage totals across streaming chunks', () => {
    const accumulator = new SseUsageAccumulator('openai');

    accumulator.pushChunk('data: {"usage":{"prompt_tokens":2,"completion_tokens":1}}\n\n');
    const totals = accumulator.pushChunk('data: {"usage":{"prompt_tokens":2,"completion_tokens":5}}\n\n');

    expect(totals).toEqual({ inputTokens: 2, outputTokens: 5 });
  });

  it('handles split SSE events and malformed chunks', () => {
    const accumulator = new SseUsageAccumulator('anthropic');

    accumulator.pushChunk('data: {"usage":{"input_tokens":3,');
    accumulator.pushChunk('"output_tokens":2}}\n\n');
    accumulator.pushChunk('data: not-json\n\n');

    expect(accumulator.getTotals()).toEqual({ inputTokens: 3, outputTokens: 2 });
  });
});
