import electron from 'electron';
const { ipcMain } = electron;
import { IpcChannels, ipcSchemas } from '../../shared/contracts/ipc';
import {
  estimateExchange,
  fetchProviderModels,
  fetchPublicProviderModels,
  validateKey,
  type ProviderRegistry,
} from '../providers/providerRegistry';

interface IpcMainHandleLike {
  handle: (
    channel: string,
    listener: (event: unknown, request: unknown) => Promise<unknown> | unknown,
  ) => void;
  removeHandler: (channel: string) => void;
}

interface RegisterProviderHandlersOptions {
  ipcMainLike?: IpcMainHandleLike;
  providerRegistry?: Pick<
    ProviderRegistry,
    'fetchProviderModels' | 'fetchPublicProviderModels' | 'validateKey' | 'estimateExchange'
  >;
}

function errorMessageFromUnknown(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function registerProviderHandlers(options: RegisterProviderHandlersOptions = {}): () => void {
  const ipcMainLike = options.ipcMainLike ?? ipcMain;
  const providerRegistry = options.providerRegistry ?? {
    fetchProviderModels,
    fetchPublicProviderModels,
    validateKey,
    estimateExchange,
  };

  ipcMainLike.handle(IpcChannels.providers.fetchModels, async (_event, request) => {
    const parsed = ipcSchemas[IpcChannels.providers.fetchModels].request.safeParse(request);
    if (!parsed.success) {
      return { models: [], message: 'Invalid request payload' };
    }

    try {
      const { provider, apiKey } = parsed.data;
      const response = apiKey
        ? await providerRegistry.fetchProviderModels(provider, apiKey)
        : await providerRegistry.fetchPublicProviderModels(provider);
      const validResponse = ipcSchemas[IpcChannels.providers.fetchModels].response.safeParse(response);
      if (!validResponse.success) {
        return { models: [], message: 'Invalid provider response payload' };
      }
      return validResponse.data;
    } catch (error) {
      return {
        models: [],
        message: `Provider model fetch failed: ${errorMessageFromUnknown(error)}`,
      };
    }
  });

  ipcMainLike.handle(IpcChannels.providers.validateKey, async (_event, request) => {
    const parsed = ipcSchemas[IpcChannels.providers.validateKey].request.safeParse(request);
    if (!parsed.success) {
      return { valid: false, message: 'Invalid request payload' };
    }

    try {
      const response = await providerRegistry.validateKey(parsed.data.provider, parsed.data.apiKey);
      const validResponse = ipcSchemas[IpcChannels.providers.validateKey].response.safeParse(response);
      if (!validResponse.success) {
        return { valid: false, message: 'Invalid provider response payload' };
      }
      return validResponse.data;
    } catch (error) {
      return {
        valid: false,
        message: `Provider key validation failed: ${errorMessageFromUnknown(error)}`,
      };
    }
  });

  ipcMainLike.handle(IpcChannels.providers.estimateExchange, async (_event, request) => {
    const parsed = ipcSchemas[IpcChannels.providers.estimateExchange].request.safeParse(request);
    if (!parsed.success) {
      return { estimatedReceivedTokens: 0, message: 'Invalid request payload' };
    }

    try {
      const response = await providerRegistry.estimateExchange(parsed.data);
      const validResponse = ipcSchemas[IpcChannels.providers.estimateExchange].response.safeParse(response);
      if (!validResponse.success) {
        return { estimatedReceivedTokens: 0, message: 'Invalid provider response payload' };
      }
      return validResponse.data;
    } catch (error) {
      return {
        estimatedReceivedTokens: 0,
        message: `Exchange estimate failed: ${errorMessageFromUnknown(error)}`,
      };
    }
  });

  return () => {
    ipcMainLike.removeHandler(IpcChannels.providers.fetchModels);
    ipcMainLike.removeHandler(IpcChannels.providers.validateKey);
    ipcMainLike.removeHandler(IpcChannels.providers.estimateExchange);
  };
}
