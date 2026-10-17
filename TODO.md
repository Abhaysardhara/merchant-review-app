# ReviewReach — Manual TODO

## Play Store Submission (Required)
- [ ] Create **feature graphic** (`assets/feature-graphic.png`) — 1024×500px banner for store listing
- [ ] Take **screenshots** — minimum 2, ideally 8 (phone + 7-inch + 10-inch tablet) showing: dashboard, QR code, analytics, review flow, settings
- [ ] Deploy **privacy policy page** to `https://abhaysardhara.github.io/merchant-review-app/privacy`
- [ ] Complete **content rating questionnaire** in Google Play Console
- [ ] Complete **data safety form** in Google Play Console (declare: Google auth, Firestore storage, no data sold)
- [ ] Create **Google Play service account key** (`google-play-service-account.json`) for EAS Submit
- [ ] Replace placeholder `GOOGLE_MAPS_API_KEY` in `app.json` with real restricted API key
- [ ] Set up **app signing** via Google Play App Signing in Play Console

## Firebase / Backend
- [ ] Update **Firestore security rules** to include feedback sub-collection (unauthenticated create needed for web page):
  ```
  match /users/{uid}/branches/{branchId}/feedback/{feedbackId} {
    allow create: if true;
    allow read: if request.auth != null && request.auth.uid == uid;
  }
  ```
- [ ] Delete stale `analytics` map field from existing Firestore documents (one-time manual cleanup)
- [ ] Delete or clean up `web/test.html` — contains exposed API keys

## Contact / Branding
- [ ] Replace placeholder email `support@reviewreach.app` with real support email (used in: PrivacyPolicyScreen, TermsOfServiceScreen, ContactUsScreen, store.config.json)
- [ ] Replace placeholder WhatsApp number `919876543210` in ContactUsScreen with real number
- [ ] Design proper **app icon** (`assets/icon.png` — 1024×1024) and **adaptive icon** (`assets/adaptive-icon.png` — 1024×1024 with safe zone)
- [ ] Design **splash screen** (`assets/splash.png`) with final branding

## Store Listing Optimization
- [ ] Add a **promo video** (YouTube URL) to `store.config.json` listings
- [ ] Review Hindi and Gujarati store translations with a native speaker
- [ ] Add Spanish (`es`) store listing in `store.config.json` if targeting that market

## Feature Roadmap
| Priority | Feature | Status |
|----------|---------|--------|
| **P0** | Private Feedback Inbox — view negative feedback already in Firestore | Done |
| **P1** | WhatsApp Follow-Up — send review request via WhatsApp template | Done |
| **P2** | Google Review Monitor — fetch & display actual Google reviews, push notify on new ones | TODO |
| **P3** | AI Review Reply Generator — one-tap Gemini response to Google reviews | TODO |
| **P4** | Weekly Performance Digest — local push notification with weekly stats | TODO |
| **P5** | Competitor Benchmark Card — compare rating/review count vs nearby businesses | TODO |

## Post-Launch
- [ ] Set up **Google Play Console alerts** for reviews, crashes, ANRs
- [ ] Set up **Firebase Crashlytics** for crash reporting
- [ ] Monitor **Core Web Vitals** on the review web page (GitHub Pages)
- [ ] Plan v1.1 features based on user feedback
