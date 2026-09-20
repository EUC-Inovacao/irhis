import * as Localization from 'expo-localization';

export type AppLanguageCode = 'en' | 'pt-PT';

export interface AppLanguageOption {
  code: AppLanguageCode;
  flag: string;
  label: string;
}

export const DEFAULT_LANGUAGE: AppLanguageCode = 'pt-PT';

export const SUPPORTED_LANGUAGES: readonly AppLanguageOption[] = Object.freeze([
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'pt-PT', flag: '🇵🇹', label: 'Português' },
]);

export const normalizeLanguage = (language?: string | null): AppLanguageCode => {
  if (!language) {
    return DEFAULT_LANGUAGE;
  }

  const normalizedLanguage = language.toLowerCase();

  if (normalizedLanguage.startsWith('pt')) {
    return 'pt-PT';
  }

  if (normalizedLanguage.startsWith('en')) {
    return 'en';
  }

  return DEFAULT_LANGUAGE;
};

/**
 * Language the app starts in when the user has not made an explicit choice.
 *
 * The app always starts in Portuguese regardless of the device locale, so that
 * every client receives the same experience out of the box. Users can still
 * switch language manually, and that choice is honoured on subsequent launches
 * (see getStoredLanguage / persistLanguage in ./storage).
 */
export const getDeviceLanguage = (): AppLanguageCode => DEFAULT_LANGUAGE;

/**
 * Resolves the device locale to a supported language.
 * Kept separate from getDeviceLanguage so the device preference can still be
 * read where it is genuinely needed (e.g. date or number formatting).
 */
export const getSystemLanguage = (): AppLanguageCode => {
  const languageTag = Localization.getLocales?.()[0]?.languageTag;
  return normalizeLanguage(languageTag);
};

export const getLanguageOption = (language?: string | null): AppLanguageOption => {
  const languageCode = normalizeLanguage(language);

  return (
    SUPPORTED_LANGUAGES.find(({ code }) => code === languageCode) ??
    SUPPORTED_LANGUAGES[0]
  );
};
