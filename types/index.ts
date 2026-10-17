// ─────────────────────────────────────────────
//  Core domain types
// ─────────────────────────────────────────────

export type Language = 'en' | 'es' | 'hi' | 'gu';

export type BranchCategory =
  | 'Restaurant' | 'Cafe' | 'Bar' | 'Bakery' | 'Fast Food' | 'Sweet Shop'
  | 'Hospital' | 'Clinic' | 'Pharmacy' | 'Dentist' | 'Veterinary'
  | 'Salon' | 'Spa' | 'Gym' | 'Yoga' | 'Fitness'
  | 'Hotel' | 'Resort' | 'Hostel'
  | 'Retail' | 'Clothing' | 'Jewelry' | 'Electronics' | 'Furniture'
  | 'Grocery' | 'Supermarket' | 'Hardware' | 'Books' | 'Sports' | 'Pet Shop'
  | 'Automotive' | 'Real Estate' | 'Bank' | 'School' | 'Travel'
  | 'Photography' | 'Events' | 'Laundry' | 'Other';

export interface BranchAnalytics {
  totalScans: number;    // QR code scans
  linkVisits: number;    // Shared link visits
  reviewsCopied: number;
  lastScanAt?: string;   // ISO date string
}

export interface Branch {
  id: string;
  name: string;
  category?: BranchCategory; // legacy — no longer collected during onboarding
  businessName: string;
  address: string;
  placeId: string;
  googleMapsUrl: string;
  /** Custom keywords the merchant wants highlighted (e.g. "clean rooms, fast service") */
  keywords: string;
  /** Adjective tone the AI uses (e.g. "professional", "friendly", "luxury") */
  tone: string;
  analytics: BranchAnalytics;
  createdAt: string; // ISO date string
}

// ─────────────────────────────────────────────
//  QR payload — embedded in every QR code
// ─────────────────────────────────────────────

export interface QRPayload {
  branchId: string;
  placeId: string;
  /** Firebase UID of the merchant — used to write analytics to users/{uid}/branches/{placeId} */
  uid: string;
  branchName: string;
  businessName: string;
  tone: string;
  keywords: string;
  /** Schema version for forward-compatibility */
  v: number;
}

// ─────────────────────────────────────────────
//  Review & feedback types
// ─────────────────────────────────────────────

export interface ReviewDraft {
  text: string;
  language: Language;
  rating: number;
}

export interface PrivateFeedback {
  branchId: string;
  rating: number;
  comment: string;
  phone?: string;
  email?: string;
  submittedAt: string; // ISO date string
}

// ─────────────────────────────────────────────
//  UI helper types
// ─────────────────────────────────────────────

export interface LanguageOption {
  code: Language;
  label: string;
  nativeLabel: string;
  flag: string;
}

// ─────────────────────────────────────────────
//  Navigation param lists
// ─────────────────────────────────────────────

export type CustomerStackParamList = {
  CustomerScanner: undefined;
  FeedbackGate: { payload: QRPayload };
  ReviewEditor: { payload: QRPayload; rating: number; language: Language };
  PrivateFeedback: { payload: QRPayload; rating: number };
};

export type MerchantStackParamList = {
  SignIn: undefined;
  MerchantDashboard: {
    /** Set by StoreSelectorScreen after a map pick — opens the modal pre-filled */
    fromMapStore?: {
      name: string;
      placeId: string;
      address: string;
      coordinate: { latitude: number; longitude: number };
    };
  } | undefined;
  BranchDetail: { branchId: string };
  FeedbackInbox: { branchId: string; branchName: string };
  Reviews: { branchId: string; branchName: string; locationName: string };
  ReviewReply: {
    branchName: string;
    businessTone: string;
    review: {
      name: string;
      reviewerName: string;
      rating: number;
      comment: string;
      createTime: string;
      existingReply?: string;
    };
  };
  StoreSelector: undefined;
  Settings: undefined;
  Language: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  ContactUs: undefined;
  FAQ: undefined;
  About: undefined;
  DeleteAccount: undefined;
};

