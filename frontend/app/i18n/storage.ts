import { AppLanguageCode } from './languages';

export const getStoredLanguage = async (): Promise<AppLanguageCode | null> => {
  return null;
};

export const persistLanguage = async (_language: AppLanguageCode): Promise<void> => {
  return Promise.resolve();
};
