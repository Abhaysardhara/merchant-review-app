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
  ws_title: 'Last 7 days',
  ws_people: '{{n}} people opened your review page',
  ws_google: '{{n}} went to Google to post a review',
  ws_liked: 'Customers liked',
  ws_unhappy: 'Customers unhappy',
  ws_stars: 'Stars customers gave',
  ws_none: 'No visits yet this week. Put your QR poster where every customer can see it.',
  ws_noPicks: 'Nothing picked yet.',
  card_line: '{{a}} scanned · {{b}} reviews',
  fb_call: 'Call',
  cs_listen: 'Listen',
  cs_explain:
    'These are the buttons your customers see when they write a review. ' +
    'Customers tap what they bought and what they liked, and the review is written from their taps. ' +
    'To remove a button, tap it and choose Remove. If you change your mind, tap Undo. ' +
    'To add more, tap the microphone on your keyboard and say what you sell, then tap Add.',
  poster_btn: 'Print poster',
  poster_scan: 'Scan to review us on Google',
  poster_time: 'Takes 30 seconds',
  wa_message: 'Hi! Thank you for visiting {{shop}}. Please share your honest review, it takes 30 seconds:',
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
  ws_title: 'पिछले 7 दिन',
  ws_people: '{{n}} लोगों ने आपका रिव्यू पेज खोला',
  ws_google: '{{n}} लोग रिव्यू पोस्ट करने Google पर गए',
  ws_liked: 'ग्राहकों को पसंद आया',
  ws_unhappy: 'ग्राहक नाखुश थे',
  ws_stars: 'ग्राहकों ने दिए स्टार',
  ws_none: 'इस हफ़्ते अभी कोई नहीं आया। अपना QR पोस्टर ऐसी जगह लगाएँ जहाँ हर ग्राहक देखे।',
  ws_noPicks: 'अभी कुछ नहीं चुना गया।',
  card_line: '{{a}} स्कैन · {{b}} रिव्यू',
  fb_call: 'कॉल करें',
  cs_listen: 'सुनें',
  cs_explain:
    'ये वो बटन हैं जो ग्राहक रिव्यू लिखते समय देखते हैं। ' +
    'ग्राहक दबाते हैं कि उन्होंने क्या लिया और क्या अच्छा लगा, और रिव्यू उन्हीं से लिखा जाता है। ' +
    'कोई बटन हटाने के लिए उसे दबाइए और हटाएँ चुनिए। मन बदल जाए तो वापस लाएँ दबाइए। ' +
    'और जोड़ने के लिए कीबोर्ड का माइक दबाइए, बोलिए कि आप क्या बेचते हैं, फिर जोड़ें दबाइए।',
  poster_btn: 'पोस्टर प्रिंट करें',
  poster_scan: 'Google पर रिव्यू देने के लिए स्कैन करें',
  poster_time: 'सिर्फ़ 30 सेकंड',
  wa_message: 'नमस्ते! {{shop}} आने के लिए धन्यवाद। कृपया अपना सच्चा रिव्यू दें, सिर्फ़ 30 सेकंड लगेंगे:',
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
  ws_title: 'છેલ્લા 7 દિવસ',
  ws_people: '{{n}} લોકોએ તમારું રિવ્યુ પેજ ખોલ્યું',
  ws_google: '{{n}} લોકો રિવ્યુ પોસ્ટ કરવા Google પર ગયા',
  ws_liked: 'ગ્રાહકોને ગમ્યું',
  ws_unhappy: 'ગ્રાહકો નાખુશ હતા',
  ws_stars: 'ગ્રાહકોએ આપેલા સ્ટાર',
  ws_none: 'આ અઠવાડિયે હજુ કોઈ આવ્યું નથી. તમારું QR પોસ્ટર એવી જગ્યાએ મૂકો જ્યાં દરેક ગ્રાહક જુએ.',
  ws_noPicks: 'હજુ કંઈ પસંદ થયું નથી.',
  card_line: '{{a}} સ્કેન · {{b}} રિવ્યુ',
  fb_call: 'કૉલ કરો',
  cs_listen: 'સાંભળો',
  cs_explain:
    'આ એ બટન છે જે ગ્રાહકો રિવ્યુ લખતી વખતે જુએ છે. ' +
    'ગ્રાહકો દબાવે છે કે તેમણે શું લીધું અને શું ગમ્યું, અને રિવ્યુ એમાંથી જ લખાય છે. ' +
    'કોઈ બટન દૂર કરવા તેને દબાવો અને દૂર કરો પસંદ કરો. વિચાર બદલાય તો પાછું લાવો દબાવો. ' +
    'વધુ ઉમેરવા કીબોર્ડનું માઇક દબાવો, તમે શું વેચો છો તે બોલો, પછી ઉમેરો દબાવો.',
  poster_btn: 'પોસ્ટર પ્રિન્ટ કરો',
  poster_scan: 'Google પર રિવ્યુ આપવા સ્કેન કરો',
  poster_time: 'માત્ર 30 સેકન્ડ',
  wa_message: 'નમસ્તે! {{shop}} આવવા બદલ આભાર. કૃપા કરીને તમારો સાચો રિવ્યુ આપો, માત્ર 30 સેકન્ડ લાગશે:',
};

const ALL: Record<string, Record<ExtraKey, string>> = { en, hi, gu };

/** Text for the review-buttons screens in the app's current language. */
export function useExtraText() {
  const { locale } = useI18n();
  const strings = ALL[locale] ?? en;
  const t = useCallback(
    (key: ExtraKey, vars?: Record<string, string | number>) => {
      let str = strings[key] ?? en[key];
      if (vars) Object.entries(vars).forEach(([k, v]) => { str = str.replace(`{{${k}}}`, String(v)); });
      return str;
    },
    [strings],
  );
  /** Language to show button labels in: the app's language if we have it, else English. */
  const buttonLang: 'en' | 'hi' | 'gu' = locale === 'hi' || locale === 'gu' ? locale : 'en';
  return { t, buttonLang };
}
