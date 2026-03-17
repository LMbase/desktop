import { test, expect } from '@playwright/test';

test.describe('LMbase Setup Flow', () => {
  test('renders setup page', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await expect(page.getByText('LMbase')).toBeVisible();
    await expect(page.getByText('P2P Token Exchange')).toBeVisible();
  });

  test('shows provider selection', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await expect(page.getByText('OpenAI')).toBeVisible();
    await expect(page.getByText('Anthropic')).toBeVisible();
    await expect(page.getByText('Gemini')).toBeVisible();
    await expect(page.getByText('Copilot')).toBeVisible();
  });

  test('validates form before connect', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.getByRole('button', { name: /connect/i }).click();
    await expect(page.getByText(/please select/i)).toBeVisible();
  });
});

test.describe('LMbase Session Flow', () => {
  test('shows active session', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Setup would connect here in real test
    await page.evaluate(() => {
      window.lmbase.session.start({
        provider: 'openai',
        model: 'gpt-4',
        tokensOffered: 10000,
        wantProvider: 'anthropic',
        wantModel: 'claude-3',
        apiKey: 'test-key',
        authMethod: 'api_key',
      });
    });

    await expect(page.getByText('Active Session')).toBeVisible();
  });
});
