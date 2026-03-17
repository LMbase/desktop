import { z } from 'zod';
import { PROVIDERS } from '../constants';

export const providerSchema = z.enum(PROVIDERS);

export const providerConfigSchema = z.object({
  baseUrl: z.string().url(),
  authHeader: z.string(),
  authPrefix: z.string(),
  extraHeaders: z.record(z.string()),
});

export const validateResultSchema = z.object({
  valid: z.boolean(),
  message: z.string(),
});

export const fetchModelsResultSchema = z.object({
  models: z.array(z.string()),
  message: z.string(),
});

export const exchangeEstimateResultSchema = z.object({
  estimatedReceivedTokens: z.number().int().nonnegative(),
  message: z.string(),
});

export type Provider = z.infer<typeof providerSchema>;
export type ProviderConfig = z.infer<typeof providerConfigSchema>;
export type ValidateResult = z.infer<typeof validateResultSchema>;
export type FetchModelsResult = z.infer<typeof fetchModelsResultSchema>;
export type ExchangeEstimateResult = z.infer<typeof exchangeEstimateResultSchema>;
