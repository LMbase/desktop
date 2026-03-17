import { ipcRenderer } from 'electron';
import { IpcChannels, ipcSchemas } from '../shared/contracts/ipc';
import type { ExchangeEstimateResult, FetchModelsResult, ValidateResult } from '../shared/contracts/providers';

export interface ProviderApi {
  fetchModels: (request: { provider: string; apiKey?: string }) => Promise<FetchModelsResult>;
  validateKey: (request: { provider: string; apiKey: string }) => Promise<ValidateResult>;
  estimateExchange: (request: {
    offeredProvider: string;
    offeredModel: string;
    wantedProvider: string;
    wantedModel: string;
    offeredTokens?: number;
    offeredInputTokens?: number;
    offeredOutputTokens?: number;
  }) => Promise<ExchangeEstimateResult>;
}

export function createProviderApi(): ProviderApi {
  return {
    fetchModels: async (request) => {
      const parsedRequest = ipcSchemas[IpcChannels.providers.fetchModels].request.safeParse(request);
      if (!parsedRequest.success) {
        return { models: [], message: 'Invalid request payload' };
      }

      const response = await ipcRenderer.invoke(IpcChannels.providers.fetchModels, parsedRequest.data);
      const parsedResponse = ipcSchemas[IpcChannels.providers.fetchModels].response.safeParse(response);
      if (!parsedResponse.success) {
        return { models: [], message: 'Invalid IPC response payload' };
      }
      return parsedResponse.data;
    },

    validateKey: async (request) => {
      const parsedRequest = ipcSchemas[IpcChannels.providers.validateKey].request.safeParse(request);
      if (!parsedRequest.success) {
        return { valid: false, message: 'Invalid request payload' };
      }

      const response = await ipcRenderer.invoke(IpcChannels.providers.validateKey, parsedRequest.data);
      const parsedResponse = ipcSchemas[IpcChannels.providers.validateKey].response.safeParse(response);
      if (!parsedResponse.success) {
        return { valid: false, message: 'Invalid IPC response payload' };
      }
      return parsedResponse.data;
    },

    estimateExchange: async (request) => {
      const parsedRequest = ipcSchemas[IpcChannels.providers.estimateExchange].request.safeParse(request);
      if (!parsedRequest.success) {
        return { estimatedReceivedTokens: 0, message: 'Invalid request payload' };
      }

      const response = await ipcRenderer.invoke(IpcChannels.providers.estimateExchange, parsedRequest.data);
      const parsedResponse = ipcSchemas[IpcChannels.providers.estimateExchange].response.safeParse(response);
      if (!parsedResponse.success) {
        return { estimatedReceivedTokens: 0, message: 'Invalid IPC response payload' };
      }
      return parsedResponse.data;
    },
  };
}
