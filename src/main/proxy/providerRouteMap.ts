import { PROVIDER_CONFIG, type Provider } from '../../shared/constants';

export interface ProviderRouteConfig {
  localPaths: string[];
  upstreamPath: string;
  modelFromPath: boolean;
}

const PROVIDER_ROUTE_MAP: Record<Provider, ProviderRouteConfig> = {
  openai: {
    localPaths: ['/v1/chat/completions', '/chat/completions'],
    upstreamPath: '/v1/chat/completions',
    modelFromPath: false,
  },
  anthropic: {
    localPaths: ['/v1/messages', '/messages'],
    upstreamPath: '/v1/messages',
    modelFromPath: false,
  },
  gemini: {
    localPaths: ['/v1beta/models/:model\\:generateContent'],
    upstreamPath: '/v1beta/models/:model:generateContent',
    modelFromPath: true,
  },
  'github-copilot': {
    localPaths: ['/chat/completions', '/v1/chat/completions'],
    upstreamPath: '/chat/completions',
    modelFromPath: false,
  },
};

export function providerRouteMap(provider: Provider): ProviderRouteConfig {
  return PROVIDER_ROUTE_MAP[provider];
}

export function resolveUpstreamUrl(provider: Provider, model: string): string {
  const { baseUrl } = PROVIDER_CONFIG[provider];
  const route = providerRouteMap(provider);
  if (!route.modelFromPath) {
    return `${baseUrl}${route.upstreamPath}`;
  }
  return `${baseUrl}${route.upstreamPath.replace(':model', model)}`;
}
