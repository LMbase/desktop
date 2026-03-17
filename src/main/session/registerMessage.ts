import { z } from 'zod';
import { type ExchangeConfig } from '../../shared/contracts/session';

export const registerWireMessageSchema = z.object({
  type: z.literal('register'),
  provider: z.string(),
  model: z.string(),
  tokens_offered: z.number().int().nonnegative(),
  want_provider: z.string(),
  want_model: z.string(),
  proxy_url: z.string(),
  input_tokens_offered: z.number().int().nonnegative().optional(),
  output_tokens_offered: z.number().int().nonnegative().optional(),
});

export interface RemainingOffer {
  tokensToServeRem: number;
  inputTokensToServeRem: number;
  outputTokensToServeRem: number;
}

export type RegisterWireMessage = z.infer<typeof registerWireMessageSchema>;

function baseMessage(config: ExchangeConfig): Omit<RegisterWireMessage, 'tokens_offered'> {
  return {
    type: 'register',
    provider: config.provider,
    model: config.model,
    want_provider: config.wantProvider,
    want_model: config.wantModel,
    proxy_url: config.proxyUrl,
  };
}

export function buildInitialRegisterMessage(config: ExchangeConfig): RegisterWireMessage {
  const tokensOffered = config.advanced ? config.inputTokensOffered + config.outputTokensOffered : config.tokensOffered;
  const message: RegisterWireMessage = {
    ...baseMessage(config),
    tokens_offered: tokensOffered,
  };

  if (config.advanced) {
    message.input_tokens_offered = config.inputTokensOffered;
    message.output_tokens_offered = config.outputTokensOffered;
  }

  return registerWireMessageSchema.parse(message);
}

export function buildRemainingRegisterMessage(config: ExchangeConfig, remaining: RemainingOffer): RegisterWireMessage {
  const message: RegisterWireMessage = {
    ...baseMessage(config),
    tokens_offered: Math.max(0, remaining.tokensToServeRem),
  };

  if (config.advanced) {
    message.input_tokens_offered = Math.max(0, remaining.inputTokensToServeRem);
    message.output_tokens_offered = Math.max(0, remaining.outputTokensToServeRem);
  }

  return registerWireMessageSchema.parse(message);
}
