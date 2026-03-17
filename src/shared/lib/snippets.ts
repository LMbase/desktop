import type { PairingInfo } from '../contracts/session';

export function generateCodeSnippet(pairing: PairingInfo): string {
  const { peerProvider, peerModel, peerUrl, proxyKey } = pairing;

  switch (peerProvider) {
    case 'openai':
    case 'github-copilot':
      return `import requests

resp = requests.post(
    "${peerUrl}/v1/chat/completions",
    headers={"Authorization": "Bearer ${proxyKey}"},
    json={
        "model": "${peerModel}",
        "messages": [{"role": "user", "content": "What is the capital of France?"}],
    },
)
print(resp.json()["choices"][0]["message"]["content"])`;

    case 'anthropic':
      return `import requests

resp = requests.post(
    "${peerUrl}/v1/messages",
    headers={"x-api-key": "${proxyKey}", "content-type": "application/json"},
    json={
        "model": "${peerModel}",
        "max_tokens": 1024,
        "messages": [{"role": "user", "content": "What is the capital of France?"}],
    },
)
print(resp.json()["content"][0]["text"])`;

    case 'gemini':
      return `import requests

resp = requests.post(
    "${peerUrl}/v1beta/models/${peerModel}:generateContent",
    headers={"x-goog-api-key": "${proxyKey}"},
    json={
        "contents": [{"parts": [{"text": "What is the capital of France?"}]}],
    },
)
print(resp.json()["candidates"][0]["content"]["parts"][0]["text"])`;

    default:
      return '# Unknown provider';
  }
}
