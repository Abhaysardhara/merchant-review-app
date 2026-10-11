/**
 * aiService.ts
 *
 * Generates contextual, multi-language review drafts without requiring
 * an external AI API.  Each draft is assembled from modular sentence pools
 * that reference the branch name, category, tone, keywords, and rating.
 *
 * To wire up a real LLM (e.g. Claude / GPT), replace `generateReviewDraft`
 * with an API call and keep the same return type.
 */

import type { Language, BranchCategory, ReviewDraft } from '../types';

// ─────────────────────────────────────────────
//  Sentence pools per language
// ─────────────────────────────────────────────

interface SentencePools {
  opening: string[];
  service: string[];
  highlight: string[];
  closing: string[];
}

type PoolsByCategory = Partial<Record<BranchCategory | 'default', SentencePools>>;

const POOLS: Record<Language, PoolsByCategory> = {
  // ── English ──────────────────────────────────
  en: {
    Restaurant: {
      opening: [
        'Had an absolutely wonderful dining experience at {name}!',
        'What a fantastic meal at {name} — will definitely be back!',
        '{name} has quickly become my favourite dining spot in the area.',
      ],
      service: [
        'The staff were incredibly attentive and friendly throughout.',
        'Service was prompt and the team went above and beyond to make us feel welcome.',
        'Our server was knowledgeable about the menu and gave excellent recommendations.',
      ],
      highlight: [
        'The food was fresh, flavourful and beautifully presented.',
        'Every dish we ordered was cooked to perfection.',
        'Generous portions and outstanding taste — tremendous value for money.',
      ],
      closing: [
        'Highly recommend to anyone looking for a memorable meal!',
        '10/10 — cannot wait to return!',
        'A must-visit restaurant. Do yourself a favour and try it!',
      ],
    },
    Hospital: {
      opening: [
        'I recently visited {name} and was thoroughly impressed.',
        'Exceptional care received at {name} — highly professional team.',
        '{name} provided me with an outstanding healthcare experience.',
      ],
      service: [
        'The doctors and nurses were compassionate, patient, and knowledgeable.',
        'Every staff member I interacted with was courteous and professional.',
        'The medical team took the time to thoroughly explain every step.',
      ],
      highlight: [
        'Facilities were spotless, modern, and very well-maintained.',
        'Minimal waiting time and highly efficient patient flow.',
        'State-of-the-art equipment combined with expert medical care.',
      ],
      closing: [
        'I would not hesitate to recommend {name} to family and friends.',
        'Truly a world-class healthcare facility. Thank you!',
        'Outstanding experience — five stars is not enough!',
      ],
    },
    Salon: {
      opening: [
        'Just had an amazing session at {name} and I am absolutely loving my look!',
        '{name} exceeded all my expectations — phenomenal talent here!',
        'Hands down the best salon experience I have ever had at {name}.',
      ],
      service: [
        'The stylists were creative, listened carefully to what I wanted, and delivered perfectly.',
        'Professional team that truly cares about client satisfaction.',
        'Friendly atmosphere and every staff member made me feel special.',
      ],
      highlight: [
        'Premium products used throughout with stunning results.',
        'The transformation was beyond what I imagined — absolute perfection.',
        'Clean, stylish space and meticulous attention to every detail.',
      ],
      closing: [
        'Already booked my next appointment — cannot recommend enough!',
        'If you want to look your best, this is the place to go!',
        'Five well-deserved stars for {name}!',
      ],
    },
    default: {
      opening: [
        'Had a wonderful experience at {name}!',
        'Absolutely impressed with {name} — highly professional service.',
        '{name} delivered an outstanding experience from start to finish.',
      ],
      service: [
        'The staff were warm, welcoming and incredibly professional.',
        'Customer service here is second to none — every team member was helpful.',
        'The team went out of their way to ensure complete satisfaction.',
      ],
      highlight: [
        'Exceptional quality and attention to detail throughout.',
        'Everything exceeded my expectations — truly impressive.',
        'Outstanding value and a premium experience overall.',
      ],
      closing: [
        'Will definitely be recommending {name} to everyone I know!',
        'Five stars without any hesitation — brilliant!',
        'A truly exceptional experience. Cannot wait to return!',
      ],
    },
  },

  // ── Spanish ──────────────────────────────────
  es: {
    default: {
      opening: [
        '¡Tuve una experiencia increíble en {name}!',
        'Me dejé impresionado por el excelente servicio de {name}.',
        '{name} superó todas mis expectativas — totalmente recomendado.',
      ],
      service: [
        'El personal fue muy amable, atento y profesional en todo momento.',
        'Un equipo excepcional que se preocupa genuinamente por sus clientes.',
        'Cada miembro del equipo fue cortés y dispuesto a ayudar.',
      ],
      highlight: [
        'Calidad excepcional y atención al detalle en cada aspecto.',
        'Todo estuvo perfecto — desde la atención hasta el producto final.',
        'Una experiencia de primera clase que vale cada centavo.',
      ],
      closing: [
        '¡Sin duda lo recomendaré a todos mis conocidos!',
        '¡Cinco estrellas bien merecidas para {name}!',
        '¡Una experiencia extraordinaria — regresaré sin duda!',
      ],
    },
  },

  // ── Hindi ─────────────────────────────────────
  hi: {
    default: {
      opening: [
        '{name} में मेरा अनुभव बेहद शानदार रहा!',
        '{name} की सेवाओं से मैं पूरी तरह प्रभावित हूँ।',
        '{name} ने सभी उम्मीदों को पार कर दिया — वाकई अद्भुत!',
      ],
      service: [
        'स्टाफ बेहद विनम्र, सहायक और पेशेवर था।',
        'हर कर्मचारी ने ग्राहक की संतुष्टि को प्राथमिकता दी।',
        'टीम ने हर कदम पर हमारी मदद की और बहुत अच्छा व्यवहार किया।',
      ],
      highlight: [
        'सुविधाएं उत्कृष्ट थीं और गुणवत्ता बेमिसाल।',
        'हर चीज़ बेहतरीन थी — सेवा से लेकर माहौल तक।',
        'इतने अच्छे अनुभव की उम्मीद नहीं थी — सच में लाजवाब!',
      ],
      closing: [
        'मैं {name} को अपने सभी दोस्तों और परिवार को सुझाऊंगा।',
        'पाँच सितारे बिना किसी हिचकिचाहट के!',
        'शानदार अनुभव — जल्द ही वापस आऊंगा!',
      ],
    },
  },

  // ── Gujarati ─────────────────────────────────
  gu: {
    default: {
      opening: [
        '{name} ખાતે મારો અનુભવ અત્યંત ઉત્તમ રહ્યો!',
        '{name} ની સેવા થી હું ખૂબ જ પ્રભાવિત થયો/થઈ.',
        '{name} એ બધી અપેક્ષાઓ ઓળંગી ગઈ — ખરેખર અદ્ભુત!',
      ],
      service: [
        'સ્ટાફ ખૂબ જ નમ્ર, મददगार અને વ્યાવસાયિક હતા.',
        'દરેક ટીમ સભ્ય ગ્રાહક સંતોષ માટે પ્રતિબદ્ધ હતા.',
        'ટીમ એ દરેક પગલે ઉત્કૃષ્ટ સેવા પ્રદાન કરી.',
      ],
      highlight: [
        'સુવિધાઓ ઉત્કૃષ્ટ હતી અને ગુણવત્તા અજોડ.',
        'સેવા થી માંડીને વાતાવરણ સુધી — સર્વ ઉત્તમ.',
        'આટલો સારો અનુભવ ખરેખર આશ્ચર્યજનક હતો!',
      ],
      closing: [
        'હું {name} ને મારા તમામ મિત્રો અને પરિવારને ભલામણ કરીશ.',
        'કોઈ સંકોચ વગર પાંચ તારા!',
        'ઉત્કૃષ્ટ અનુભવ — ટૂંક સમયમાં ફરીથી આવીશ!',
      ],
    },
  },
};

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getPool(language: Language, category: BranchCategory): SentencePools {
  const langPools = POOLS[language];
  return (langPools[category] ?? langPools['default']) as SentencePools;
}

function interpolate(template: string, name: string): string {
  return template.replace(/\{name\}/g, name);
}

// ─────────────────────────────────────────────
//  Keyword injection
// ─────────────────────────────────────────────

function buildKeywordSentence(keywords: string, language: Language): string {
  const kws = keywords
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (kws.length === 0) return '';

  const templates: Record<Language, string> = {
    en: `Especially loved the ${kws.join(', ')}.`,
    es: `Especialmente me encantó ${kws.join(', ')}.`,
    hi: `विशेष रूप से ${kws.join(', ')} बहुत पसंद आया।`,
    gu: `ખાસ કરીને ${kws.join(', ')} ખૂબ ગમ્યું.`,
  };

  return templates[language] ?? templates.en;
}

// ─────────────────────────────────────────────
//  Public API
// ─────────────────────────────────────────────

export interface DraftInput {
  branchName: string;
  businessName: string;
  category: BranchCategory;
  tone: string;
  keywords: string;
  rating: number;
  language: Language;
}

/**
 * Generates a contextual, language-specific review draft.
 * Every call produces a slightly different text due to random sentence selection.
 */
export function generateReviewDraft(input: DraftInput): ReviewDraft {
  const { branchName, businessName, category, keywords, rating, language } = input;
  const displayName = businessName || branchName;

  const pool = getPool(language, category);

  const opening = interpolate(pick(pool.opening), displayName);
  const service = pick(pool.service);
  const highlight = pick(pool.highlight);
  const kwSentence = buildKeywordSentence(keywords, language);
  const closing = interpolate(pick(pool.closing), displayName);

  // For lower ratings in the positive path (4 stars), tone down slightly
  const ratingPrefix: Record<Language, string> =
    rating === 4
      ? { en: 'Really enjoyed my visit to ', es: 'Disfruté mucho mi visita a ', hi: '', gu: '' }
      : { en: '', es: '', hi: '', gu: '' };

  const parts = [
    ratingPrefix[language] ? `${ratingPrefix[language]}${displayName}!` : opening,
    service,
    highlight,
    kwSentence,
    closing,
  ].filter(Boolean);

  return {
    text: parts.join(' '),
    language,
    rating,
  };
}

/**
 * Regenerates a draft with a new random sentence selection.
 * Useful for the "Regenerate" button in the Review Editor.
 */
export function regenerateDraft(input: DraftInput): ReviewDraft {
  return generateReviewDraft(input);
}

export const LANGUAGE_OPTIONS = [
  { code: 'en' as Language, label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { code: 'es' as Language, label: 'Spanish', nativeLabel: 'Español', flag: '🇪🇸' },
  { code: 'hi' as Language, label: 'Hindi', nativeLabel: 'हिन्दी', flag: '🇮🇳' },
  { code: 'gu' as Language, label: 'Gujarati', nativeLabel: 'ગુજરાતી', flag: '🇮🇳' },
];
