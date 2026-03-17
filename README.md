# TokenHub Desktop

TokenHub Desktop lets you exchange LLM API access with another person.

You choose what you are willing to share, choose what you want in return, and TokenHub creates a temporary local proxy so you can use your matched peer's API through a copy-ready endpoint.

## What You Can Do

- Share access from one provider and request access to another
- Choose the exact model you want to offer and the exact model you want to use
- Set a token budget before connecting
- Use an API key or GitHub Copilot OAuth, depending on the provider
- Copy a ready-to-use endpoint snippet once a match is active
- Monitor the session while tokens are being used

## Supported Providers

- OpenAI
- Anthropic
- Gemini
- GitHub Copilot

## Before You Start

You will usually need:

- An account for the provider you want to share
- A valid API key, or GitHub login for Copilot OAuth
- Internet access
- Access to a running TokenHub pairing service

Your credentials stay on your machine. The app is designed to keep provider secrets local and expose only the temporary proxy details needed for the live exchange.

## How It Works

### 1. Choose what you are sharing

On the left side of the setup screen:

- Pick your authentication method
- Pick the provider you want to share
- Enter your API key or complete GitHub OAuth
- Choose the model you want to share
- Enter how many tokens you are willing to offer

If you need more control, you can open the advanced token settings and split your offer into input and output tokens.

### 2. Choose what you want in return

On the right side of the setup screen:

- Pick the provider you want to receive access to
- Pick the model you want to use

TokenHub shows an estimated token return based on current provider pricing.

### 3. Start matching

Click `Find Match`.

If your setup is valid, TokenHub:

- Validates your credentials when needed
- Connects to the pairing service
- Starts a local proxy on your machine
- Waits for a compatible peer

### 4. Use the session

When a match is active, the session screen shows:

- Your current connection status
- The model you are sharing
- The model you are receiving
- Token usage for both sides
- A copy-ready endpoint snippet you can paste into your client or script
- An activity log for the current session

## Typical Flow

1. Offer `OpenAI / gpt-4o` with a token budget
2. Request `Anthropic / claude-3-5-sonnet`
3. Click `Find Match`
4. Wait for TokenHub to pair you with someone compatible
5. Copy the generated endpoint snippet
6. Send requests through the local proxy until the session ends or the budget is exhausted

## Notes

- The exact number of tokens you receive can differ from the number you offer because TokenHub estimates exchanges using provider pricing
- Some providers may require different authentication flows
- The proxy endpoint is temporary and tied to the active session
- You can disconnect a session at any time from the session screen

## If Something Is Not Working

Check these first:

- Your API key is valid
- You selected both an offered model and a requested model
- Your token amount is greater than zero
- Your internet connection is working
- The pairing service is reachable

If the app falls back to cached model lists, the provider request likely timed out or was blocked by your network.

## Version

Current app version: `1.0.0`
