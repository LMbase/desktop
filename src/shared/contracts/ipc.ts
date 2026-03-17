import { z } from 'zod';
import {
  exchangeEstimateResultSchema,
  fetchModelsResultSchema,
  validateResultSchema,
} from './providers';
import { exchangeConfigSchema, sessionSnapshotSchema, activityEventSchema } from './session';

export const IpcChannels = {
  providers: {
    fetchModels: 'providers:fetchModels',
    validateKey: 'providers:validateKey',
    estimateExchange: 'providers:estimateExchange',
  },
  auth: {
    startCopilotAuth: 'auth:startCopilotAuth',
    cancelCopilotAuth: 'auth:cancelCopilotAuth',
    getCopilotAuthStatus: 'auth:getCopilotAuthStatus',
  },
  session: {
    start: 'session:start',
    stop: 'session:stop',
    getSnapshot: 'session:getSnapshot',
  },
  settings: {
    get: 'settings:get',
    set: 'settings:set',
  },
} as const;

export const copilotStatusEventSchema = z.object({
  status: z.enum(['pending', 'success', 'error', 'cancelled']),
  token: z.string().optional(),
  error: z.string().optional(),
});

export const sessionUpdateEventSchema = sessionSnapshotSchema;
export const activityLogEventSchema = activityEventSchema;

export const ipcSchemas = {
  [IpcChannels.providers.fetchModels]: {
    request: z.object({ provider: z.string(), apiKey: z.string().optional() }),
    response: fetchModelsResultSchema,
  },
  [IpcChannels.providers.validateKey]: {
    request: z.object({ provider: z.string(), apiKey: z.string() }),
    response: validateResultSchema,
  },
  [IpcChannels.providers.estimateExchange]: {
    request: z.object({
      offeredProvider: z.string(),
      offeredModel: z.string(),
      wantedProvider: z.string(),
      wantedModel: z.string(),
      offeredTokens: z.number().int().positive().optional(),
      offeredInputTokens: z.number().int().positive().optional(),
      offeredOutputTokens: z.number().int().positive().optional(),
    }),
    response: exchangeEstimateResultSchema,
  },
  [IpcChannels.auth.startCopilotAuth]: {
    request: z.object({}),
    response: z.object({
      deviceCode: z.string(),
      userCode: z.string(),
      verificationUri: z.string(),
    }),
  },
  [IpcChannels.auth.cancelCopilotAuth]: {
    request: z.object({}),
    response: z.void(),
  },
  [IpcChannels.auth.getCopilotAuthStatus]: {
    request: z.object({}),
    response: copilotStatusEventSchema,
  },
  [IpcChannels.session.start]: {
    request: exchangeConfigSchema,
    response: z.object({ success: z.boolean(), error: z.string().optional() }),
  },
  [IpcChannels.session.stop]: {
    request: z.object({}),
    response: z.void(),
  },
  [IpcChannels.session.getSnapshot]: {
    request: z.object({}),
    response: sessionSnapshotSchema.nullable(),
  },
  [IpcChannels.settings.get]: {
    request: z.object({ key: z.string() }),
    response: z.string().nullable(),
  },
  [IpcChannels.settings.set]: {
    request: z.object({ key: z.string(), value: z.string() }),
    response: z.boolean(),
  },
};

export const ipcEventChannels = {
  copilotStatus: 'event:copilotStatus',
  sessionUpdate: 'event:sessionUpdate',
  activityLog: 'event:activityLog',
} as const;

export type CopilotStatusEvent = z.infer<typeof copilotStatusEventSchema>;
