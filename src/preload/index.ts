import { contextBridge } from 'electron';
import { createAuthApi, type AuthApi } from './authApi';
import { createProviderApi, type ProviderApi } from './providerApi';
import { createSessionApi, type SessionApi } from './sessionApi';
import { createSettingsApi, type SettingsApi } from './settingsApi';

export interface TokenHubApi {
  providers: ProviderApi;
  auth: AuthApi;
  settings: SettingsApi;
  session: SessionApi;
}

const tokenhubApi: TokenHubApi = {
  providers: createProviderApi(),
  auth: createAuthApi(),
  settings: createSettingsApi(),
  session: createSessionApi(),
};

contextBridge.exposeInMainWorld('tokenhub', tokenhubApi);

declare global {
  interface Window {
    tokenhub: TokenHubApi;
  }
}
