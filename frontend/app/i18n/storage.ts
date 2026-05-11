import AsyncStorage from '@react-native-async-storage/async-storage';

import { AppLanguageCode, normalizeLanguage } from './languages';

const LANGUAGE_STORAGE_KEY = '@iRHIS:language';

export const getStoredLanguage = async (): Promise<AppLanguageCode | null> => {
  try {
    const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    return storedLanguage ? normalizeLanguage(storedLanguage) : null;
  } catch (error) {
    console.warn('Failed to load language preference', error);
    return null;
  }
};

export const persistLanguage = async (language: AppLanguageCode): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.warn('Failed to persist language preference', error);
  }
};
