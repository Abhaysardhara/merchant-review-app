// ─────────────────────────────────────────────
//  Core domain types
// ─────────────────────────────────────────────

export type Language = 'en' | 'es' | 'hi' | 'gu';

export interface BranchAnalytics {
  totalScans: number;    // QR code scans
  linkVisits: number;    // Shared link visits
  reviewsCopied: number;
  lastScanAt?: string;   // ISO date string
}

/** A button customers tap on the review page ("Biryani", "Quick service", "Long wait"). */
export interface ReviewButton {
  id: string;
  kind: 'bought' | 'good' | 'improve';
  emoji: string;
  labels: { en: string; hi: string; gu: string };
  enabled: boolean;
  order: number;
  /** 'ai' = made from the Google listing; 'merchant' = added by the merchant */
  source: 'ai' | 'merchant';
}

export interface Branch {
  id: string;
  name: string;
  businessName: string;
  address: string;
  placeId: string;
  googleMapsUrl: string;
  /** Review buttons — saved only through saveBranchButtons / the server */
  buttons: ReviewButton[];
  /** What the merchant said they sell, if they did */
  servicesSpoken?: string;
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
  /** Schema version for forward-compatibility */
  v: number;
}

// ─────────────────────────────────────────────
//  Navigation param lists
//  (The customer review flow lives on the web page, not in the app.)
// ─────────────────────────────────────────────

export type MerchantStackParamList = {
  Welcome: undefined;
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
  CustomerButtons: { branchId: string };
  FeedbackInbox: { branchId: string; branchName: string };
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

