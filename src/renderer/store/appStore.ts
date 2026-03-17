import { create } from 'zustand';
import type { Provider } from '@shared/constants';
import type { SessionSnapshot, ActivityEvent } from '@shared/contracts/session';

export type AuthMethod = 'api_key' | 'copilot';

export interface OfferConfig {
  provider: Provider | null;
  model: string;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  advanced: boolean;
}

export interface ReceiveConfig {
  provider: Provider | null;
  model: string;
}

export interface CopilotAuthState {
  status: 'idle' | 'pending' | 'success' | 'error' | 'cancelled';
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  error: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

interface AppState {
  offer: OfferConfig;
  receive: ReceiveConfig;
  authMethod: AuthMethod;
  apiKey: string;
  copilotAuth: CopilotAuthState;
  session: SessionSnapshot | null;
  activityLog: ActivityEvent[];
  errors: ValidationError[];
  isConnecting: boolean;
  showAdvanced: boolean;

  setOfferProvider: (provider: Provider) => void;
  setOfferModel: (model: string) => void;
  setOfferTokens: (tokens: number) => void;
  setOfferInputTokens: (tokens: number) => void;
  setOfferOutputTokens: (tokens: number) => void;
  setOfferAdvanced: (advanced: boolean) => void;
  setReceiveProvider: (provider: Provider) => void;
  setReceiveModel: (model: string) => void;
  setAuthMethod: (method: AuthMethod) => void;
  setApiKey: (key: string) => void;
  setCopilotAuth: (state: Partial<CopilotAuthState>) => void;
  setSession: (snapshot: SessionSnapshot | null) => void;
  addActivity: (event: ActivityEvent) => void;
  setErrors: (errors: ValidationError[]) => void;
  setConnecting: (connecting: boolean) => void;
  toggleAdvanced: () => void;
  reset: () => void;
}

const initialOffer: OfferConfig = {
  provider: null,
  model: '',
  tokens: 0,
  inputTokens: 7000,
  outputTokens: 3000,
  advanced: false,
};

const initialReceive: ReceiveConfig = {
  provider: null,
  model: '',
};

const initialCopilotAuth: CopilotAuthState = {
  status: 'idle',
  deviceCode: '',
  userCode: '',
  verificationUri: '',
  error: '',
};

export const useAppStore = create<AppState>((set) => ({
  offer: initialOffer,
  receive: initialReceive,
  authMethod: 'api_key',
  apiKey: '',
  copilotAuth: initialCopilotAuth,
  session: null,
  activityLog: [],
  errors: [],
  isConnecting: false,
  showAdvanced: false,

  setOfferProvider: (provider) =>
    set((state) => ({
      offer: { ...state.offer, provider, model: '' },
    })),

  setOfferModel: (model) =>
    set((state) => ({
      offer: { ...state.offer, model },
    })),

  setOfferTokens: (tokens) =>
    set((state) => ({
      offer: { ...state.offer, tokens },
    })),

  setOfferInputTokens: (inputTokens) =>
    set((state) => ({
      offer: { ...state.offer, inputTokens },
    })),

  setOfferOutputTokens: (outputTokens) =>
    set((state) => ({
      offer: { ...state.offer, outputTokens },
    })),

  setOfferAdvanced: (advanced) =>
    set((state) => ({
      offer: { ...state.offer, advanced },
    })),

  setReceiveProvider: (provider) =>
    set((state) => ({
      receive: { ...state.receive, provider, model: '' },
    })),

  setReceiveModel: (model) =>
    set((state) => ({
      receive: { ...state.receive, model },
    })),

  setAuthMethod: (authMethod) =>
    set((state) => ({
      authMethod,
      offer:
        authMethod === 'copilot'
          ? {
              ...state.offer,
              provider: state.offer.provider === 'github-copilot' ? state.offer.provider : null,
              model: state.offer.provider === 'github-copilot' ? state.offer.model : '',
            }
          : {
              ...state.offer,
              provider: state.offer.provider === 'github-copilot' ? null : state.offer.provider,
              model: state.offer.provider === 'github-copilot' ? '' : state.offer.model,
            },
      copilotAuth: authMethod === 'copilot' ? state.copilotAuth : initialCopilotAuth,
    })),

  setApiKey: (apiKey) => set({ apiKey }),

  setCopilotAuth: (partial) =>
    set((state) => ({
      copilotAuth: { ...state.copilotAuth, ...partial },
    })),

  setSession: (session) => set({ session }),

  addActivity: (event) =>
    set((state) => ({
      activityLog: [event, ...state.activityLog].slice(0, 100),
    })),

  setErrors: (errors) => set({ errors }),

  setConnecting: (isConnecting) => set({ isConnecting }),

  toggleAdvanced: () =>
    set((state) => ({
      showAdvanced: !state.showAdvanced,
    })),

  reset: () =>
    set({
      offer: initialOffer,
      receive: initialReceive,
      authMethod: 'api_key',
      apiKey: '',
      copilotAuth: initialCopilotAuth,
      session: null,
      activityLog: [],
      errors: [],
      isConnecting: false,
      showAdvanced: false,
    }),
}));

export const selectOffer = (state: AppState) => state.offer;
export const selectReceive = (state: AppState) => state.receive;
export const selectAuthMethod = (state: AppState) => state.authMethod;
export const selectApiKey = (state: AppState) => state.apiKey;
export const selectCopilotAuth = (state: AppState) => state.copilotAuth;
export const selectSession = (state: AppState) => state.session;
export const selectActivityLog = (state: AppState) => state.activityLog;
export const selectErrors = (state: AppState) => state.errors;
export const selectIsConnecting = (state: AppState) => state.isConnecting;
export const selectShowAdvanced = (state: AppState) => state.showAdvanced;
