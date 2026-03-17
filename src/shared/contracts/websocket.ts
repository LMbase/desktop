import { z } from 'zod';
import { providerSchema } from './providers';

const baseMessageSchema = z.object({
  type: z.string(),
});

export const registerMessageSchema = baseMessageSchema.extend({
  type: z.literal('register'),
  provider: providerSchema,
  model: z.string(),
  tokensOffered: z.number().int(),
  wantProvider: providerSchema,
  wantModel: z.string(),
  proxyUrl: z.string(),
  inputTokensOffered: z.number().int().optional(),
  outputTokensOffered: z.number().int().optional(),
});

export const ackMessageSchema = baseMessageSchema.extend({
  type: z.literal('ack'),
});

export const pairedMessageSchema = baseMessageSchema.extend({
  type: z.literal('paired'),
  offerId: z.string(),
  tempKey: z.string(),
  proxyKey: z.string(),
  peerUrl: z.string(),
  peerProvider: providerSchema,
  peerModel: z.string(),
  tokensGranted: z.number().int(),
  tokensToServe: z.number().int(),
  inputTokensGranted: z.number().int().optional(),
  outputTokensGranted: z.number().int().optional(),
  inputTokensToServe: z.number().int().optional(),
  outputTokensToServe: z.number().int().optional(),
});

export const usageReportMessageSchema = baseMessageSchema.extend({
  type: z.literal('usage_report'),
  offerId: z.string(),
  tokens: z.number().int(),
  inputTokens: z.number().int().optional(),
  outputTokens: z.number().int().optional(),
});

export const unpairedMessageSchema = baseMessageSchema.extend({
  type: z.literal('unpaired'),
});

export const errorMessageSchema = baseMessageSchema.extend({
  type: z.literal('error'),
  message: z.string(),
});

export const websocketMessageSchema = z.discriminatedUnion('type', [
  registerMessageSchema,
  ackMessageSchema,
  pairedMessageSchema,
  usageReportMessageSchema,
  unpairedMessageSchema,
  errorMessageSchema,
]);

export type RegisterMessage = z.infer<typeof registerMessageSchema>;
export type AckMessage = z.infer<typeof ackMessageSchema>;
export type PairedMessage = z.infer<typeof pairedMessageSchema>;
export type UsageReportMessage = z.infer<typeof usageReportMessageSchema>;
export type UnpairedMessage = z.infer<typeof unpairedMessageSchema>;
export type ErrorMessage = z.infer<typeof errorMessageSchema>;
export type WebSocketMessage = z.infer<typeof websocketMessageSchema>;
