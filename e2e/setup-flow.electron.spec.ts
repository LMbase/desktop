import { sessionTestIds, setupTestIds } from '../src/renderer/lib/testIds';
import { expect, test } from './fixtures/electron';

test.describe('Desktop setup flow', () => {
  test('matches through the setup flow using stable automation hooks', async ({ page }) => {
    await expect(page.getByTestId(setupTestIds.page)).toBeVisible();

    await page.getByTestId(setupTestIds.authMethodTab('api_key')).click();
    await expect(page.getByTestId(setupTestIds.authMethodTab('api_key'))).toHaveAttribute('data-selected', 'true');

    await page.getByTestId(setupTestIds.providerCard('offer', 'openai')).click();
    await expect(page.getByTestId(setupTestIds.providerCard('offer', 'openai'))).toHaveAttribute('data-selected', 'true');

    await page.getByTestId(setupTestIds.apiKeyInput).fill('sk-test-valid-key');
    await page.getByTestId(setupTestIds.tokenAmountInput).fill('1000');

    await expect(page.getByTestId(setupTestIds.modelSelect('offer'))).toBeVisible();
    await expect(page.getByTestId(setupTestIds.modelStatus('offer'))).toContainText('Loaded');
    await page.getByTestId(setupTestIds.modelSelect('offer')).selectOption('gpt-4o');

    await page.getByTestId(setupTestIds.providerCard('receive', 'anthropic')).click();
    await expect(page.getByTestId(setupTestIds.providerCard('receive', 'anthropic'))).toHaveAttribute('data-selected', 'true');
    await expect(page.getByTestId(setupTestIds.modelStatus('receive'))).toContainText('Loaded');
    await page.getByTestId(setupTestIds.modelSelect('receive')).selectOption('claude-3-5-sonnet-20241022');

    await page.getByTestId(setupTestIds.findMatchButton).click();

    await expect(page.getByTestId(sessionTestIds.page)).toBeVisible();
    await expect(page.getByTestId(sessionTestIds.websocketStatus)).toContainText('Connected');
    await expect(page.getByTestId(sessionTestIds.tunnelStatus)).toContainText('https://peer.e2e.lmbase.local');
  });

  test('surfaces deterministic API key errors without coordinate clicking', async ({ page }) => {
    await page.getByTestId(setupTestIds.providerCard('offer', 'openai')).click();
    await page.getByTestId(setupTestIds.apiKeyInput).fill('sk-test-invalid-key');
    await page.getByTestId(setupTestIds.tokenAmountInput).fill('1000');
    await page.getByTestId(setupTestIds.modelSelect('offer')).selectOption('gpt-4o');

    await page.getByTestId(setupTestIds.providerCard('receive', 'anthropic')).click();
    await page.getByTestId(setupTestIds.modelSelect('receive')).selectOption('claude-3-5-sonnet-20241022');

    await page.getByTestId(setupTestIds.findMatchButton).click();

    await expect(page.getByTestId(setupTestIds.apiKeyError)).toContainText('Invalid API key for E2E stub');
  });
});
