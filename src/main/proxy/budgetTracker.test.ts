import { describe, expect, it, vi } from 'vitest';
import { BudgetTracker } from './budgetTracker';

describe('BudgetTracker', () => {
  it('tracks simple budget and exhaustion', async () => {
    const onTokensServed = vi.fn();
    const tracker = new BudgetTracker({ tokenBudget: 10, onTokensServed });

    expect(tracker.remainingBudget()).toBe(10);
    expect(tracker.budgetExceeded()).toBe(false);

    await tracker.recordUsageCounts(3, 4);
    expect(tracker.remainingBudget()).toBe(3);
    expect(tracker.budgetExceeded()).toBe(false);
    expect(onTokensServed).toHaveBeenCalledWith(3, 4);

    await tracker.recordUsageCounts(2, 2);
    expect(tracker.remainingBudget()).toBe(0);
    expect(tracker.budgetExceeded()).toBe(true);
  });

  it('tracks advanced budgets independently', async () => {
    const tracker = new BudgetTracker({
      tokenBudget: 999,
      inputBudget: 7,
      outputBudget: 5,
    });

    await tracker.recordUsageCounts(6, 2);
    expect(tracker.isAdvanced()).toBe(true);
    expect(tracker.budgetExceeded()).toBe(false);
    expect(tracker.remainingBudget()).toBe(4);
    expect(tracker.remainingOutputBudget()).toBe(3);

    await tracker.recordUsageCounts(1, 3);
    expect(tracker.budgetExceeded()).toBe(true);
  });

  it('projects and clamps usage to remaining budget', () => {
    const tracker = new BudgetTracker({ tokenBudget: 9 });
    const base = tracker.snapshot();

    expect(tracker.wouldExceed(base, { inputTokens: 3, outputTokens: 6 })).toBe(true);
    expect(tracker.clampToRemaining(base, { inputTokens: 4, outputTokens: 7 })).toEqual({
      inputTokens: 4,
      outputTokens: 5,
    });
  });
});
