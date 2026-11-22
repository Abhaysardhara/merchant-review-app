/**
 * i18n/extra.ts — text for the review-buttons screens (English, Hindi, Gujarati).
 * Other app languages fall back to English.
 */

import { useCallback } from 'react';
import { useI18n } from '.';

const en = {
  sell_label: 'What do you sell?',
  sell_hint: 'Tap 🎤 on your keyboard and say it. Example: biryani, thali, party orders',
  sell_placeholder: 'Optional',
  cs_title: 'What customers see',
  cs_entrySub: 'Buttons customers tap when they write a review',
  cs_making: 'Making your buttons…',
  cs_bought: 'What customers had',
  cs_good: 'What was good',
  cs_tapHint: 'Tap a button to remove or rename it.',
  cs_addLabel: 'Add more',
  cs_addBtn: 'Add',
  cs_adding: 'Adding…',
  cs_remove: 'Remove',
  cs_rename: 'Rename',
  cs_removed: 'Removed',
  cs_undo: 'Undo',
  cs_empty: 'No buttons yet.',
  cs_make: 'Make buttons',
  cs_remake: 'Make new buttons',
  cs_error: 'Something went wrong. Please try again.',
  cs_complaintsNote: 'Customers can also pick “could be better” buttons. We manage those for you.',
  cs_newName: 'New name',
  cs_save: 'Save',
  cs_cancel: 'Cancel',
};

export type ExtraKey = keyof typeof en;

const hi: Record<ExtraKey, string> = {
  sell_label: 'आप क्या बेचते हैं?',
  sell_hint: 'कीबोर्ड पर 🎤 दबाइए और बोलिए। जैसे: बिरयानी, थाली, पार्टी ऑर्डर',
  sell_placeholder: 'ज़रूरी नहीं',
  cs_title: 'ग्राहक क्या देखेंगे',
  cs_entrySub: 'रिव्यू लिखते समय ग्राहक ये बटन दबाते हैं',
  cs_making: 'आपके बटन बन रहे हैं…',
  cs_bought: 'ग्राहकों ने क्या लिया',
  cs_good: 'क्या अच्छा था',
  cs_tapHint: 'हटाने या नाम बदलने के लिए बटन दबाइए।',
  cs_addLabel: 'और जोड़ें',
  cs_addBtn: 'जोड़ें',
  cs_adding: 'जोड़ रहे हैं…',
  cs_remove: 'हटाएँ',
  cs_rename: 'नाम बदलें',
  cs_removed: 'हटा दिया',
  cs_undo: 'वापस लाएँ',
  cs_empty: 'अभी कोई बटन नहीं।',
  cs_make: 'बटन बनाएँ',
  cs_remake: 'नए बटन बनाएँ',
  cs_error: 'कुछ गड़बड़ हुई। फिर से कोशिश करें।',
  cs_complaintsNote: 'ग्राहक “क्या बेहतर हो सकता है” वाले बटन भी चुन सकते हैं। उन्हें हम संभालते हैं।',
  cs_newName: 'नया नाम',
  cs_save: 'सहेजें',
  cs_cancel: 'रद्द करें',
};

const gu: Record<ExtraKey, string> = {
  sell_label: 'તમે શું વેચો છો?',
  sell_hint: 'કીબોર્ડ પર 🎤 દબાવો અને બોલો. જેમ કે: બિરયાની, થાળી, પાર્ટી ઓર્ડર',
  sell_placeholder: 'જરૂરી નથી',
  cs_title: 'ગ્રાહકો શું જોશે',
  cs_entrySub: 'રિવ્યુ લખતી વખતે ગ્રાહકો આ બટન દબાવે છે',
  cs_making: 'તમારા બટન બની રહ્યા છે…',
  cs_bought: 'ગ્રાહકોએ શું લીધું',
  cs_good: 'શું સારું હતું',
  cs_tapHint: 'દૂર કરવા અથવા નામ બદલવા બટન દબાવો.',
  cs_addLabel: 'વધુ ઉમેરો',
  cs_addBtn: 'ઉમેરો',
  cs_adding: 'ઉમેરી રહ્યા છીએ…',
  cs_remove: 'દૂર કરો',
  cs_rename: 'નામ બદલો',
  cs_removed: 'દૂર કર્યું',
  cs_undo: 'પાછું લાવો',
  cs_empty: 'હજુ કોઈ બટન નથી.',
  cs_make: 'બટન બનાવો',
  cs_remake: 'નવા બટન બનાવો',
  cs_error: 'કંઈક ખોટું થયું. ફરી પ્રયાસ કરો.',
  cs_complaintsNote: 'ગ્રાહકો “શું સારું થઈ શકે” બટન પણ પસંદ કરી શકે છે. તે અમે સંભાળીએ છીએ.',
  cs_newName: 'નવું નામ',
  cs_save: 'સાચવો',
  cs_cancel: 'રદ કરો',
};

const ALL: Record<string, Record<ExtraKey, string>> = { en, hi, gu };

/** Text for the review-buttons screens in the app's current language. */
export function useExtraText() {
  const { locale } = useI18n();
  const strings = ALL[locale] ?? en;
  const t = useCallback((key: ExtraKey) => strings[key] ?? en[key], [strings]);
  /** Language to show button labels in: the app's language if we have it, else English. */
  const buttonLang: 'en' | 'hi' | 'gu' = locale === 'hi' || locale === 'gu' ? locale : 'en';
  return { t, buttonLang };
}
