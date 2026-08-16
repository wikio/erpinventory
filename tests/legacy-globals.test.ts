import { describe, expect, it } from 'vitest';

const values = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => values.set(key, String(value)),
  removeItem: (key: string) => values.delete(key),
};

const { SARI_CONFIG, TRANSLATIONS } = await import('../js/config.js');
const { AuthController } = await import('../js/auth.js');
const { I18nController } = await import('../js/i18n.js');

describe('ES-module compatibility globals', () => {
  it('publishes configuration and translations for progressively migrated domains', () => {
    expect((globalThis as any).SARI_CONFIG).toBe(SARI_CONFIG);
    expect((globalThis as any).TRANSLATIONS).toBe(TRANSLATIONS);
    expect(TRANSLATIONS.fr.appName).toBeTruthy();
  });

  it('can resolve role and translation data across ES-module boundaries', () => {
    const controller = new AuthController();
    controller.currentRole = 'admin';
    expect(controller.getRole()).toBe(SARI_CONFIG.USER_ROLES.admin);

    const translations = new I18nController();
    expect(translations.t('appName')).toBe(TRANSLATIONS.fr.appName);
  });
});
