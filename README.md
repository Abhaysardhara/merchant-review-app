# ReviewReach

AI-powered Google review generator for local businesses. Merchants create QR codes for each branch — customers scan, get an AI-drafted review, and paste it on Google Maps in under 30 seconds.

## How It Works

1. **Merchant** signs in, adds a branch (selects from Google Maps), and gets a QR code + shareable link
2. **Customer** scans the QR / opens the link, rates the experience, gets an AI-generated review draft
3. Customer taps "Copy & Open Google" — the review is copied to clipboard, Google Maps opens to the review page
4. **Merchant** sees real-time analytics: scans, link visits, reviews copied, and conversion rate

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.86 + Expo SDK 57 |
| Language | TypeScript 5.7 |
| Auth | Firebase Auth + Google Sign-In (native) |
| Database | Cloud Firestore |
| AI | Gemini API (review generation on web page) |
| Navigation | React Navigation 6 (native stack) |
| i18n | 25 languages (custom lightweight system) |
| OTA Updates | EAS Update |
| Build | EAS Build (APK/AAB) |

## Project Structure

```
merchant-review-app/
├── App.tsx                  # Root — providers + navigator
├── config.ts                # Environment variables (Maps, OAuth client IDs)
├── metro.config.js          # Firebase dual-package fix for SDK 57
├── navigation/
│   └── AppNavigator.tsx     # Auth-gated merchant stack
├── screens/
│   ├── SignInScreen.tsx      # Google Sign-In (native) + dev skip
│   ├── MerchantDashboardScreen.tsx  # Branch list + overall stats
│   ├── BranchDetailScreen.tsx       # Per-branch stats, QR code, edit
│   ├── StoreSelectorScreen.tsx      # Google Maps place picker
│   ├── FeedbackInboxScreen.tsx      # Private customer feedback
│   ├── SettingsScreen.tsx           # Preferences, legal, account
│   └── ...                          # About, FAQ, Contact, Privacy, Terms, etc.
├── components/
│   ├── QRCodeCard.tsx       # QR code generation + share/save
│   ├── StarRating.tsx       # Interactive star rating
│   ├── LanguageSelector.tsx # Review language picker
│   └── StoreSelector.tsx    # Google Maps autocomplete
├── services/
│   ├── firebase.ts          # Auth, Firestore CRUD, analytics writes
│   ├── aiService.ts         # Offline review draft generation (in-app)
│   ├── analytics.ts         # Stat helpers (CVR, formatting)
│   └── mapsResolver.ts      # Google Maps URL → Place ID resolver
├── store/
│   └── MerchantContext.tsx  # Global state — auth, branches, CRUD
├── i18n/                    # 25 translation files + index
├── types/
│   └── index.ts             # Domain types, nav param lists
└── web/
    └── index.html           # Customer-facing review page (GitHub Pages)
```

## Setup

### Prerequisites

- Node.js >= 20.19
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- Firebase project with Auth (Google provider) + Firestore enabled
- Google Cloud Console: Maps API key, OAuth client IDs (Web + Android)

### Install

```bash
git clone https://github.com/Abhaysardhara/merchant-review-app.git
cd merchant-review-app
npm install --legacy-peer-deps
```

### Environment Variables

Create a `.env` file:

```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_api_key
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_web_client_id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your_android_client_id
```

### Firebase Setup

1. Create a Firebase project and enable **Authentication** (Google provider) and **Firestore**
2. Add an Android app (`com.reviewreach.app`) with your EAS build SHA-1 fingerprint
3. Download `google-services.json` and place it in the project root
4. The Web Client ID from Firebase Auth's Google provider config goes in `SignInScreen.tsx`

### Run

```bash
# Development (Expo Go — uses dev skip for auth)
npx expo start

# Build APK
npx eas-cli build --platform android --profile preview

# Build AAB (production)
npx eas-cli build --platform android --profile production

# OTA update
CI=1 npx eas-cli update --branch main --message "description" --environment production
```

## Key Architecture Decisions

**Firebase JS SDK (not @react-native-firebase):** Uses the web-compatible Firebase SDK with a Metro config override to fix the dual-package CJS/ESM resolution issue in SDK 57. See `metro.config.js`.

**Native Google Sign-In:** Uses `@react-native-google-signin/google-signin` for reliable auth in APK builds. Falls back to dev skip button in Expo Go (native module not available).

**Customer web page:** The customer review flow runs on a static HTML page (`web/index.html`) hosted on GitHub Pages — not inside the app. QR codes and share links point to this page. This avoids requiring customers to install anything.

**Flat Firestore analytics:** Branch analytics (`totalScans`, `linkVisits`, `reviewsCopied`) are stored as flat fields on the branch document and incremented atomically via `FieldValue.increment()` (app) or Firestore REST `fieldTransforms` (web page).

## Supported Languages

English, Spanish, Hindi, Gujarati, Arabic, Bengali, Chinese, French, German, Indonesian, Italian, Japanese, Kannada, Korean, Malayalam, Marathi, Odia, Panjabi, Portuguese, Russian, Tamil, Telugu, Thai, Turkish, Urdu

## License

Private — All rights reserved.
