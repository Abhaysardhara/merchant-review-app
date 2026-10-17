/**
 * i18n/index.ts — Lightweight i18n system
 *
 * Supported languages: 11 Indian + 14 Global = 25 total
 * Translations load lazily — only English is bundled eagerly.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en, { type TranslationKeys } from './en';

const LANG_KEY = '@reviewreach:app_language';

// ─────────────────────────────────────────────
//  Language metadata
// ─────────────────────────────────────────────

export interface LangMeta {
  code: string;
  label: string;        // English name
  nativeLabel: string;  // Name in own script
  flag: string;
  region: 'indian' | 'global';
}

export const LANGUAGES: LangMeta[] = [
  // Indian
  { code: 'hi', label: 'Hindi',      nativeLabel: '\u0939\u093f\u0902\u0926\u0940',      flag: '\ud83c\uddee\ud83c\uddf3', region: 'indian' },
  { code: 'gu', label: 'Gujarati',   nativeLabel: '\u0a97\u0ac1\u0a9c\u0ab0\u0abe\u0aa4\u0ac0',   flag: '\ud83c\uddee\ud83c\uddf3', region: 'indian' },
  { code: 'mr', label: 'Marathi',    nativeLabel: '\u092e\u0930\u093e\u0920\u0940',    flag: '\ud83c\uddee\ud83c\uddf3', region: 'indian' },
  { code: 'ta', label: 'Tamil',      nativeLabel: '\u0ba4\u0bae\u0bbf\u0bb4\u0bcd',      flag: '\ud83c\uddee\ud83c\uddf3', region: 'indian' },
  { code: 'te', label: 'Telugu',     nativeLabel: '\u0c24\u0c46\u0c32\u0c41\u0c17\u0c41',     flag: '\ud83c\uddee\ud83c\uddf3', region: 'indian' },
  { code: 'kn', label: 'Kannada',    nativeLabel: '\u0c95\u0ca8\u0ccd\u0ca8\u0ca1',    flag: '\ud83c\uddee\ud83c\uddf3', region: 'indian' },
  { code: 'ml', label: 'Malayalam',  nativeLabel: '\u0d2e\u0d32\u0d2f\u0d3e\u0d33\u0d02',  flag: '\ud83c\uddee\ud83c\uddf3', region: 'indian' },
  { code: 'bn', label: 'Bengali',    nativeLabel: '\u09ac\u09be\u0982\u09b2\u09be',    flag: '\ud83c\uddee\ud83c\uddf3', region: 'indian' },
  { code: 'pa', label: 'Punjabi',    nativeLabel: '\u0a2a\u0a70\u0a1c\u0a3e\u0a2c\u0a40',    flag: '\ud83c\uddee\ud83c\uddf3', region: 'indian' },
  { code: 'ur', label: 'Urdu',       nativeLabel: '\u0627\u0631\u062f\u0648',       flag: '\ud83c\uddee\ud83c\uddf3', region: 'indian' },
  { code: 'or', label: 'Odia',       nativeLabel: '\u0b13\u0b21\u0b3c\u0b3f\u0b06',       flag: '\ud83c\uddee\ud83c\uddf3', region: 'indian' },

  // Global
  { code: 'en', label: 'English',    nativeLabel: 'English',    flag: '\ud83c\uddfa\ud83c\uddf8', region: 'global' },
  { code: 'es', label: 'Spanish',    nativeLabel: 'Espa\u00f1ol',    flag: '\ud83c\uddea\ud83c\uddf8', region: 'global' },
  { code: 'fr', label: 'French',     nativeLabel: 'Fran\u00e7ais',    flag: '\ud83c\uddeb\ud83c\uddf7', region: 'global' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Portugu\u00eas', flag: '\ud83c\udde7\ud83c\uddf7', region: 'global' },
  { code: 'ar', label: 'Arabic',     nativeLabel: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629',     flag: '\ud83c\uddf8\ud83c\udde6', region: 'global' },
  { code: 'zh', label: 'Chinese',    nativeLabel: '\u4e2d\u6587',       flag: '\ud83c\udde8\ud83c\uddf3', region: 'global' },
  { code: 'ja', label: 'Japanese',   nativeLabel: '\u65e5\u672c\u8a9e',      flag: '\ud83c\uddef\ud83c\uddf5', region: 'global' },
  { code: 'ko', label: 'Korean',     nativeLabel: '\ud55c\uad6d\uc5b4',      flag: '\ud83c\uddf0\ud83c\uddf7', region: 'global' },
  { code: 'de', label: 'German',     nativeLabel: 'Deutsch',    flag: '\ud83c\udde9\ud83c\uddea', region: 'global' },
  { code: 'it', label: 'Italian',    nativeLabel: 'Italiano',   flag: '\ud83c\uddee\ud83c\uddf9', region: 'global' },
  { code: 'ru', label: 'Russian',    nativeLabel: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439',    flag: '\ud83c\uddf7\ud83c\uddfa', region: 'global' },
  { code: 'tr', label: 'Turkish',    nativeLabel: 'T\u00fcrk\u00e7e',     flag: '\ud83c\uddf9\ud83c\uddf7', region: 'global' },
  { code: 'th', label: 'Thai',       nativeLabel: '\u0e44\u0e17\u0e22',       flag: '\ud83c\uddf9\ud83c\udded', region: 'global' },
  { code: 'id', label: 'Indonesian', nativeLabel: 'Bahasa',     flag: '\ud83c\uddee\ud83c\udde9', region: 'global' },
];

// ─────────────────────────────────────────────
//  Lazy translation loaders
// ─────────────────────────────────────────────

type Translations = Record<TranslationKeys, string>;

// Eagerly import all translations (Metro doesn't support dynamic imports well)
// Indian languages
import hi from './hi';
import gu from './gu';
import mr from './mr';
import ta from './ta';
import te from './te';
import kn from './kn';
import ml from './ml';
import bn from './bn';
import pa from './pa';
import ur from './ur';
import or_ from './or';
// Global languages
import es from './es';
import fr from './fr';
import pt from './pt';
import ar from './ar';
import zh from './zh';
import ja from './ja';
import ko from './ko';
import de from './de';
import it from './it';
import ru from './ru';
import tr from './tr';
import th from './th';
import id from './id';

const translationMap: Record<string, Translations> = {
  en, hi, gu, mr, ta, te, kn, ml, bn, pa, ur, or: or_,
  es, fr, pt, ar, zh, ja, ko, de, it, ru, tr, th, id,
};

function loadTranslation(code: string): Translations {
  return translationMap[code] ?? en;
}

// ─────────────────────────────────────────────
//  Context
// ─────────────────────────────────────────────

interface I18nContextValue {
  locale: string;
  setLocale: (code: string) => Promise<void>;
  t: (key: TranslationKeys, vars?: Record<string, string>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within <I18nProvider>');
  return ctx;
}

// ─────────────────────────────────────────────
//  Provider
// ─────────────────────────────────────────────

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState('en');
  const [strings, setStrings] = useState<Translations>(en);

  // Load persisted language on mount
  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((saved) => {
      if (saved && saved !== 'en') {
        setStrings(loadTranslation(saved));
        setLocaleState(saved);
      }
    }).catch(() => {});
  }, []);

  const setLocale = useCallback(async (code: string) => {
    setStrings(loadTranslation(code));
    setLocaleState(code);
    await AsyncStorage.setItem(LANG_KEY, code);
  }, []);

  const t = useCallback(
    (key: TranslationKeys, vars?: Record<string, string>): string => {
      let str = strings[key] ?? en[key] ?? key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          str = str.replace(`{{${k}}}`, v);
        });
      }
      return str;
    },
    [strings],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return React.createElement(I18nContext.Provider, { value }, children);
}
