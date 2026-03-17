import { z } from 'zod';
import { providerSchema } from './providers';

export const exchangeConfigSchema = z.object({
  provider: providerSchema,
  model: z.string(),
  tokensOffered: z.number().int().min(1),
  wantProvider: providerSchema,
  wantModel: z.string(),
  apiKey: z.string(),
  authMethod: z.enum(['api_key', 'copilot']),
  githubToken: z.string().default(''),
  inputTokensOffered: z.number().int().default(0),
  outputTokensOffered: z.number().int().default(0),
  advanced: z.boolean().default(false),
  proxyPort: z.number().int().default(9100),
  proxyUrl: z.string().default(''),
});

export const usageDataSchema = z.object({
  tokensGrantedUpd: z.number().int().default(0),
  tokensToServeUpd: z.number().int().default(0),
  inputTokensGrantedUpd: z.number().int().default(0),
  outputTokensGrantedUpd: z.number().int().default(0),
  inputTokensToServeUpd: z.number().int().default(0),
  outputTokensToServeUpd: z.number().int().default(0),
});

export const pairingInfoSchema = z.object({
  offerId: z.string(),
  tempKey: z.string(),
  proxyKey: z.string(),
  peerUrl: z.string(),
  peerProvider: providerSchema,
  peerModel: z.string(),
  tokensGranted: z.number().int(),
  tokensToServe: z.number().int(),
  inputTokensGranted: z.number().int().default(0),
  outputTokensGranted: z.number().int().default(0),
  inputTokensToServe: z.number().int().default(0),
  outputTokensToServe: z.number().int().default(0),
  advanced: z.boolean().default(false),
});

export const sessionSnapshotSchema = z.object({
  status: z.enum(['idle', 'connecting', 'paired', 'error']),
  config: exchangeConfigSchema.nullable(),
  pairing: pairingInfoSchema.nullable(),
  tokensGrantedDone: z.number().int().default(0),
  tokensToServeDone: z.number().int().default(0),
  inputTokensGrantedDone: z.number().int().default(0),
  outputTokensGrantedDone: z.number().int().default(0),
  inputTokensToServeDone: z.number().int().default(0),
  outputTokensToServeDone: z.number().int().default(0),
  errorMessage: z.string().optional(),
  connectedAt: z.number().optional(),
});

export const activityEventSchema = z.object({
  timestamp: z.number(),
  type: z.enum(['info', 'success', 'warning', 'error']),
  message: z.string(),
});

export type ExchangeConfig = z.infer<typeof exchangeConfigSchema>;
export type UsageData = z.infer<typeof usageDataSchema>;
export type PairingInfo = z.infer<typeof pairingInfoSchema>;
export type SessionSnapshot = z.infer<typeof sessionSnapshotSchema>;
export type ActivityEvent = z.infer<typeof activityEventSchema>;
