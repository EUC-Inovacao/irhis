import i18n from './index';
import { AppLanguageCode, normalizeLanguage } from './languages';
import { persistLanguage } from './storage';

export const changeAppLanguage = async (
  language: AppLanguageCode | string,
): Promise<AppLanguageCode> => {
  const nextLanguage = normalizeLanguage(language);

  await i18n.changeLanguage(nextLanguage);
  await persistLanguage(nextLanguage);

  return nextLanguage;
};
