import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import React from 'react';

import en from './locales/en.json';
import ptPT from './locales/pt-PT.json';
import { getDeviceLanguage } from './languages';
import { getStoredLanguage } from './storage';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    'pt-PT': { translation: ptPT },
  },
  lng: getDeviceLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v4',
});

const hydrateLanguagePreference = async () => {
  const storedLanguage = await getStoredLanguage();
  const nextLanguage = storedLanguage || getDeviceLanguage();

  if (i18n.resolvedLanguage !== nextLanguage) {
    await i18n.changeLanguage(nextLanguage);
  }
};

void hydrateLanguagePreference();

const translatableProps = new Set([
  'title',
  'label',
  'placeholder',
  'headerTitle',
  'tabBarLabel',
  'accessibilityLabel',
]);

const translateLiteral = (value) => {
  if (typeof value !== 'string') return value;
  if (!value.trim()) return value;
  return i18n.t(value, {
    defaultValue: value,
    keySeparator: false,
    nsSeparator: false,
  });
};

const translateChildren = (children) => {
  if (typeof children === 'string') return translateLiteral(children);
  if (Array.isArray(children)) return children.map(translateChildren);
  return children;
};

if (!globalThis.__IRHIS_I18N_PATCHED__) {
  const originalCreateElement = React.createElement;
  React.createElement = (type, props, ...children) => {
    let nextProps = props;
    if (props) {
      nextProps = { ...props };
      for (const key of translatableProps) {
        if (typeof nextProps[key] === 'string') {
          nextProps[key] = translateLiteral(nextProps[key]);
        }
      }
    }

    const nextChildren = children.map(translateChildren);
    return originalCreateElement(type, nextProps, ...nextChildren);
  };

  globalThis.__IRHIS_I18N_PATCHED__ = true;
}

export default i18n;
