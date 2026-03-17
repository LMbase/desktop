import { contextBridge } from 'electron';
import { createAuthApi, type AuthApi } from './authApi';
import { createProviderApi, type ProviderApi } from './providerApi';
import { createSessionApi, type SessionApi } from './sessionApi';
import { createSettingsApi, type SettingsApi } from './settingsApi';

export interface LMbaseApi {
  providers: ProviderApi;
  auth: AuthApi;
  settings: SettingsApi;
  session: SessionApi;
}

const lmbaseApi: LMbaseApi = {
  providers: createProviderApi(),
  auth: createAuthApi(),
  settings: createSettingsApi(),
  session: createSessionApi(),
};

contextBridge.exposeInMainWorld('lmbase', lmbaseApi);

declare global {
  interface Window {
    lmbase: LMbaseApi;
  }
}
