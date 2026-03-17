export interface BudgetTrackerOptions {
  tokenBudget: number;
  inputBudget?: number;
  outputBudget?: number;
  onTokensServed?: (inputTokens: number, outputTokens: number) => Promise<void> | void;
}

export interface UsageSnapshot {
  totalServed: number;
  inputServed: number;
  outputServed: number;
}

export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
}

export class BudgetTracker {
  private readonly tokenBudget: number;
  private readonly inputBudget: number;
  private readonly outputBudget: number;
  private readonly advancedMode: boolean;
  private readonly onTokensServed?: BudgetTrackerOptions['onTokensServed'];

  private totalServed = 0;
  private inputServed = 0;
  private outputServed = 0;

  constructor(options: BudgetTrackerOptions) {
    this.tokenBudget = Math.max(0, options.tokenBudget);
    this.inputBudget = Math.max(0, options.inputBudget ?? 0);
    this.outputBudget = Math.max(0, options.outputBudget ?? 0);
    this.advancedMode = this.inputBudget > 0 || this.outputBudget > 0;
    this.onTokensServed = options.onTokensServed;
  }

  isAdvanced(): boolean {
    return this.advancedMode;
  }

  budgetExceeded(): boolean {
    if (this.advancedMode) {
      return this.inputServed >= this.inputBudget || this.outputServed >= this.outputBudget;
    }
    return this.totalServed >= this.tokenBudget;
  }

  remainingBudget(): number {
    if (this.advancedMode) {
      return Math.max(this.inputBudget - this.inputServed, 0) + Math.max(this.outputBudget - this.outputServed, 0);
    }
    return Math.max(this.tokenBudget - this.totalServed, 0);
  }

  remainingOutputBudget(): number {
    if (this.advancedMode) {
      return Math.max(this.outputBudget - this.outputServed, 0);
    }
    return Math.max(this.tokenBudget - this.totalServed, 0);
  }

  snapshot(): UsageSnapshot {
    return {
      totalServed: this.totalServed,
      inputServed: this.inputServed,
      outputServed: this.outputServed,
    };
  }

  wouldExceed(snapshot: UsageSnapshot, totals: UsageTotals): boolean {
    if (this.advancedMode) {
      return snapshot.inputServed + totals.inputTokens >= this.inputBudget || snapshot.outputServed + totals.outputTokens >= this.outputBudget;
    }

    return snapshot.totalServed + totals.inputTokens + totals.outputTokens >= this.tokenBudget;
  }

  clampToRemaining(snapshot: UsageSnapshot, totals: UsageTotals): UsageTotals {
    let inputTokens = Math.max(0, totals.inputTokens);
    let outputTokens = Math.max(0, totals.outputTokens);

    if (this.advancedMode) {
      const inputRemaining = Math.max(this.inputBudget - snapshot.inputServed, 0);
      const outputRemaining = Math.max(this.outputBudget - snapshot.outputServed, 0);
      return {
        inputTokens: Math.min(inputTokens, inputRemaining),
        outputTokens: Math.min(outputTokens, outputRemaining),
      };
    }

    const totalRemaining = Math.max(this.tokenBudget - snapshot.totalServed, 0);
    const combined = inputTokens + outputTokens;
    if (combined <= totalRemaining) {
      return { inputTokens, outputTokens };
    }

    let overflow = combined - totalRemaining;
    const outputReduction = Math.min(outputTokens, overflow);
    outputTokens -= outputReduction;
    overflow -= outputReduction;
    if (overflow > 0) {
      inputTokens = Math.max(0, inputTokens - overflow);
    }
    return { inputTokens, outputTokens };
  }

  async recordUsageCounts(inputTokens: number, outputTokens: number): Promise<void> {
    if (inputTokens <= 0 && outputTokens <= 0) {
      return;
    }

    if (this.advancedMode) {
      this.inputServed += inputTokens;
      this.outputServed += outputTokens;
    } else {
      this.totalServed += inputTokens + outputTokens;
    }

    if (this.onTokensServed) {
      await this.onTokensServed(inputTokens, outputTokens);
    }
  }
}
