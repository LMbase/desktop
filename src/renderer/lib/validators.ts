import type { Provider } from '@shared/constants';
import { PROVIDERS } from '@shared/constants';
import type { OfferConfig, ReceiveConfig, AuthMethod, ValidationError } from '../store/appStore';

const MIN_TOKENS = 100;
const MAX_TOKENS = 10_000_000;

export function validateProvider(provider: Provider | null): ValidationError | null {
  if (!provider) {
    return { field: 'provider', message: 'Please select a provider' };
  }
  if (!PROVIDERS.includes(provider)) {
    return { field: 'provider', message: 'Invalid provider selected' };
  }
  return null;
}

export function validateModel(model: string): ValidationError | null {
  if (!model || model.trim() === '') {
    return { field: 'model', message: 'Please select a model' };
  }
  return null;
}

export function validateTokens(tokens: number, fieldName = 'tokens'): ValidationError | null {
  if (!Number.isInteger(tokens) || tokens < MIN_TOKENS) {
    return { field: fieldName, message: `Minimum ${MIN_TOKENS.toLocaleString()} tokens required` };
  }
  if (tokens > MAX_TOKENS) {
    return { field: fieldName, message: `Maximum ${MAX_TOKENS.toLocaleString()} tokens allowed` };
  }
  return null;
}

export function validateApiKey(apiKey: string): ValidationError | null {
  if (!apiKey || apiKey.trim() === '') {
    return { field: 'apiKey', message: 'API key is required' };
  }
  if (apiKey.length < 10) {
    return { field: 'apiKey', message: 'API key appears to be invalid' };
  }
  return null;
}

export function validateOfferConfig(offer: OfferConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  const providerError = validateProvider(offer.provider);
  if (providerError) errors.push(providerError);

  const modelError = validateModel(offer.model);
  if (modelError) errors.push(modelError);

  if (offer.advanced) {
    const inputError = validateTokens(offer.inputTokens, 'inputTokens');
    if (inputError) errors.push(inputError);

    const outputError = validateTokens(offer.outputTokens, 'outputTokens');
    if (outputError) errors.push(outputError);

    const totalTokens = offer.inputTokens + offer.outputTokens;
    if (totalTokens < MIN_TOKENS) {
      errors.push({
        field: 'tokens',
        message: `Total tokens must be at least ${MIN_TOKENS.toLocaleString()}`,
      });
    }
  } else {
    const tokensError = validateTokens(offer.tokens);
    if (tokensError) errors.push(tokensError);
  }

  return errors;
}

export function validateReceiveConfig(receive: ReceiveConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  const providerError = validateProvider(receive.provider);
  if (providerError) errors.push(providerError);

  const modelError = validateModel(receive.model);
  if (modelError) errors.push(modelError);

  return errors;
}

export function validateAuthConfig(
  authMethod: AuthMethod,
  apiKey: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (authMethod === 'api_key') {
    const keyError = validateApiKey(apiKey);
    if (keyError) errors.push(keyError);
  }

  return errors;
}

export function validateDistinctProviderModelPair(
  offer: OfferConfig,
  receive: ReceiveConfig
): ValidationError | null {
  if (!offer.provider || !receive.provider || !offer.model || !receive.model) {
    return null;
  }

  if (offer.provider === receive.provider && offer.model === receive.model) {
    return {
      field: 'model',
      message: 'Share and want cannot use the same provider and model',
    };
  }

  return null;
}

export function validateSetupForm(
  offer: OfferConfig,
  receive: ReceiveConfig,
  authMethod: AuthMethod,
  apiKey: string
): ValidationError[] {
  const distinctPairError = validateDistinctProviderModelPair(offer, receive);

  return [
    ...validateOfferConfig(offer),
    ...validateReceiveConfig(receive),
    ...validateAuthConfig(authMethod, apiKey),
    ...(distinctPairError ? [distinctPairError] : []),
  ];
}

export function formatTokenInput(value: string): string {
  const cleaned = value.replace(/[^0-9]/g, '');
  if (!cleaned) return '';
  return parseInt(cleaned, 10).toLocaleString();
}

export function parseTokenInput(value: string): number {
  const cleaned = value.replace(/[^0-9]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
}

export function getFirstError(errors: ValidationError[], field: string): string | null {
  const error = errors.find((e) => e.field === field);
  return error ? error.message : null;
}

export function hasFieldError(errors: ValidationError[], field: string): boolean {
  return errors.some((e) => e.field === field);
}
