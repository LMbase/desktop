export function toInt(value: unknown): number {
  if (typeof value === 'number') {
    return Math.floor(value);
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function formatTokenCount(count: number): string {
  return count.toLocaleString();
}

export function parseTokenInput(input: string): number {
  const cleaned = input.replace(/[^0-9]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
}
