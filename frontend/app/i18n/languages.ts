import * as Localization from 'expo-localization';

export type AppLanguageCode = 'en' | 'pt-PT';

export interface AppLanguageOption {
  code: AppLanguageCode;
  flag: string;
  label: string;
}

export const DEFAULT_LANGUAGE: AppLanguageCode = 'en';

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

export const getDeviceLanguage = (): AppLanguageCode => {
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
