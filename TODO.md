# ReviewReach — TODO

Working list for the honest one-tap review flow and the merchant features.
Order matters: finish a phase before starting the next.

**Rules for every task**
- Every customer gets the same path to Google, whatever their rating. No gating.
- The AI writes only from the customer's own stars, button taps and voice. No invented praise.
- Merchants are not technical: automatic by default, no jargon, voice before typing, their language, big buttons, undo instead of confirm dialogs.
- Every change ships in the app build (EAS) and the web page, not just one of them.

Design reference: "ReviewReach One-Tap Review Flow" canvas (v2). Plan: "ReviewReach Change Plan" doc.

**Already done:** Private feedback inbox (`FeedbackInboxScreen.tsx`), WhatsApp follow-up button (`BranchDetailScreen.tsx`).

---

## Phase 1 — Lock down the server (½–1 day, do first)

### 1.1 Stop the open Gemini proxy
- [x] `server/src/routes/review.ts`: stop accepting `systemInstruction` and `prompt` from the request body
- [x] New request body: `{ mode: "draft", stars, lang }` or `{ mode: "voice", transcript, lang, stars? }` with the session token in the `X-Session-Token` header; every field validated (stars 1–5, lang code, transcript ≤ 1,000 chars). `buttonIds` comes in Phase 3/4
- [x] Build the system prompt and user prompt on the server only (`server/src/services/gemini.ts`)
- [x] Remove the browser-side prompt builders in `web/index.html`
- **Done when:** a `curl` with a custom prompt is rejected with 400 ✅ (tested 2026-11-22)

### 1.2 Restrict who can call the server
- [x] `server/src/index.ts`: replace `cors()` with an allow-list (`ALLOWED_ORIGINS`, plus `localhost` in dev)
- [x] Add `express-rate-limit`: per IP (20 AI requests/min, 120 requests/min overall, 60 sessions/10 min, 30 Places lookups/min)
- [x] Daily Gemini and Deepgram budget per branch; return 429 with a friendly message when exceeded
- [x] Add `helmet` and a JSON body size limit (50 kb)
- [x] Voice stream: Origin check, session required, 2-minute recording cap
- **Done when:** requests from another origin fail, and the 21st request in a minute gets 429 ✅ (tested 2026-11-22)

### 1.3 Rotate and restrict keys
- [x] Delete `web/test.html` everywhere (checked: not on disk and never committed)
- [x] Rotate `GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`, `DEEPGRAM_API_KEY`; update the Render environment variables
- [x] Restrict the Maps key to the Android package + SHA-1 and the review page domain
- [x] Remove the hardcoded Maps key from `app.json` (`app.config.js` injects `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`)
- [x] Move the app's shop search to the server: `POST /api/v1/places/search` (Firebase ID token required, 30/min and 300/day per merchant); legacy Places fallback removed
- [ ] Use two keys: **app key** restricted to *Maps SDK for Android + iOS* only (+ Android app restriction); **server key** on Render restricted to *Places API (New)* only
- [x] Put the new app key in EAS: `eas env:create --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value <key> --environment production --environment preview --visibility sensitive`, and in the local `.env` (it still has the old key)
- [ ] Google Cloud: daily quota cap on Places API (New) and a billing budget alert
- [ ] Test in the app: sign in, add a shop by search and by Google Maps link
- **Done when:** old keys return errors; the app and web page work with the new ones

### 1.4 Protect merchant routes and stats
- [x] Verify the Firebase ID token on merchant-only routes — none exist on the server today (the app talks to Firestore directly); add this with the first one in Phase 4.2 (`buttons/generate`)
- [x] New `POST /api/v1/session`: issues a 30-minute signed token, only for branches that exist
- [x] `analytics.ts`, `feedback.ts`, `places.ts`, `review.ts` require the session token for that branch; each analytics event counts once per session
- [x] Server reads/writes Firestore with the Admin SDK (`FIREBASE_SERVICE_ACCOUNT` or `GOOGLE_APPLICATION_CREDENTIALS`)
- [x] Firestore rules written in `firestore.rules`: merchant manages own data; feedback created only by the server
- [ ] Publish `firestore.rules` (Firebase console → Firestore → Rules, or `firebase deploy --only firestore:rules`) — **after** the new server is live
- [x] Removed unused public endpoints: `voice-review` upload route, `branches` config route
- **Done when:** replaying an analytics request does not increase counts

### 1.5 Deploy (do in this order)
- [x] Render: service account as the `FIREBASE_SERVICE_ACCOUNT` variable (the Secret File path didn't resolve on Render)
- [x] Render: `NODE_ENV=production`, `SESSION_SECRET` (32+ random characters); remove the unused `FIREBASE_API_KEY`
- [x] Deploy the server and the web page together (2026-11-22; live check passed: session, draft, places)
- [x] Publish `firestore.rules`
- [ ] Turn off Render auto-deploy, or always deploy server and web page together — they depend on each other
- [ ] Smoke test on a phone: scan a QR, type a review, copy & open Google, send private feedback, record a voice review

---

## Phase 2 — Make reviews compliant (1 day)

### 2.1 Remove what breaks Google's rules
- [ ] Delete `screens/FeedbackGateScreen.tsx` (rating gate at line 46)
- [ ] Delete the unused customer screens: `CustomerScannerScreen.tsx`, `ReviewEditorScreen.tsx`, `PrivateFeedbackScreen.tsx`
- [ ] Remove `CustomerScanner`, `FeedbackGate`, `ReviewEditor` routes from `types/index.ts` (lines 92–94)
- [ ] Delete `services/aiService.ts` (template praise sentences) and its imports
- [ ] Remove the old-flow helpers in `services/analytics.ts` ("Log a 5-star review copy", `logPrivateFeedback` tied to 1–3★)
- [ ] Remove the "always 5-star" wording in `server/src/services/gemini.ts` (lines 3, 65, 70, 104) and `server/src/routes/voiceReview.ts` (line 19)
- [ ] Remove the banned-phrase lists (`gemini.ts:94`, `web/index.html:1561, 2101`)
- **Done when:** `grep -ri "5-star\|five stars\|BANNED" server/src web services` returns nothing

### 2.2 New honest prompts
- [ ] Star-only draft: one short sentence stating only the customer's rating, in their language; 5–10 varied phrasings per rating
- [ ] Draft from buttons: use only the chosen buttons; negative buttons stay negative; no added claims
- [ ] Voice: remove filler words and fix grammar only; keep meaning, sentiment and the chosen star rating
- [ ] Write 20 test cases (each rating × with/without buttons × English/Hindi) and check the outputs by hand
- **Done when:** a 2★ voice note saying "food was cold" never turns into praise

---

## Phase 3 — New customer review page (3–5 days)

Build the v2 design into `web/index.html`.

### 3.1 Layout and look
- [ ] Full-screen layout: `height: 100dvh`, scrolling content area, fixed bottom action bar (main button always visible)
- [ ] Compact mode under 700 px height (face 72 px, headline 30 px)
- [ ] Fonts: Bricolage Grotesque + Inter + Noto Sans Devanagari/Gujarati, self-hosted subsets, `font-display: swap`
- [ ] Colours: paper `#FBF7F0`, ink `#1B1A17`, marigold `#F2A900`, green `#1F6E50`, clay `#B8431F`, star outline `#8C7B5C`, chip border `#A89878`
- [ ] Minimum text 13 px, touch targets ≥ 48 px

### 3.2 Rate screen
- [ ] Shop monogram, name and area from the branch endpoint
- [ ] Language button "English · हिंदी" (auto-detect from the browser on first load)
- [ ] Reacting face (food, salon) or calm mark (clinic, pharmacy), chosen from the Google place type
- [ ] Stars as `role="radiogroup"`; tapped star pops in 320 ms
- [ ] On star tap: copy the pre-made draft **inside the tap handler**, check the result, `vibrate(8)` on Android
- [ ] 1.2 s progress line with "Stay here"; tapping another star changes the rating; "Continue" if they stay
- [ ] Bottom bar: progress/Continue, "Add details first", private-feedback link

### 3.3 Draft endpoint
- [ ] New `GET /api/v1/branches/:placeId/drafts?lang=` returns 5 star-only drafts (one per rating)
- [ ] Cache per branch + language for a few hours; vary wording across customers
- [ ] Page fetches drafts on load so the star tap copies instantly

### 3.4 Details screen
- [ ] All three button groups at every rating (ordered by rating, never hidden)
- [ ] Draft updates live with the new phrase highlighted; `aria-live="polite"`
- [ ] Voice button using the existing Deepgram streaming; visible recording state
- [ ] "Copy & open Google" disabled until a star is chosen

### 3.5 Copied screen
- [ ] Receipt with print animation, stamp and zigzag edge
- [ ] "Posting to" card: place name, area, Google rating and review count from the Places API
- [ ] Numbered Google steps using the customer's own star count ("Tap 4 stars again")
- [ ] "Open Google" is a real tap: `location.href` to `https://search.google.com/local/writereview?placeid=…`
- [ ] Android: try the Google Maps app intent first
- [ ] If the page is still visible 1.5 s after the tap: show "Didn't open? Tap again"
- [ ] Copy failed: "Copy it yourself" screen with the text ready to select

### 3.6 Edge cases
- [ ] Detect in-app browsers (Instagram, Facebook, WhatsApp, PhonePe, Paytm, Google Lens): "Open in Chrome" (Android intent) or "Open in Safari" instructions (iOS)
- [ ] Thank-you screen only after the customer returns (`visibilitychange` after `pagehide`)
- [ ] Private-feedback form reachable from every screen, at any rating
- [ ] `prefers-reduced-motion` turns off all animation
- [ ] Screen reader: focus moves to each screen's heading; status messages announced

### 3.7 Analytics events
- [ ] `scan_landed {source, browser, is_webview, lang}`
- [ ] `star_tapped {n, ms_to_tap}`, `star_changed`
- [ ] `details_opened`, `chip_toggled {id, kind, rating}`, `voice_started`, `voice_completed`
- [ ] `clipboard_write {ok}`, `copy_fallback_shown`
- [ ] `manual_google_tap`, `redirect_blocked`, `webview_escape_shown`, `webview_escape_tapped`
- [ ] `returned {seconds_away}`, `copy_again_tapped`
- [ ] `private_feedback_opened {stage, rating}`, `private_feedback_submitted`

### 3.8 Test on real phones
- [ ] Android Chrome on a budget phone (Redmi/Realme/Samsung) and iPhone Safari
- [ ] Inside WhatsApp, Instagram, Google Lens and PhonePe scanners
- [ ] Browser signed out of Google
- [ ] Slow 3G: page usable in under 3 s
- [ ] Hindi and Gujarati: no clipped vowel marks
- [ ] Core Web Vitals checked on the live page

---

## Phase 4 — Merchant features (1–2 weeks)

### 4.1 Data model
- [ ] Add `buttons: ReviewButton[]`, `servicesSpoken`, `buttonsGeneratedAt` to `Branch` in `types/index.ts`
- [ ] Add `draftsMade` and `privateFeedback` to `BranchAnalytics`
- [ ] Remove `keywords`, `tone`, `category`; migrate existing branches
- [ ] `QRPayload` v2 without `tone`/`keywords`; keep reading v1 QR codes
- [ ] One-time cleanup: delete the stale `analytics` map field from existing Firestore documents

### 4.2 Automatic customer buttons
- [ ] New `POST /api/v1/merchants/:uid/branches/:placeId/buttons/generate`
- [ ] Inputs: Places API type, summary, attributes and public reviews, plus the merchant's spoken "What do you sell?"
- [ ] Gemini with a JSON schema → `bought / good / improve` buttons with emoji, translated once into all 25 languages
- [ ] Rules: 1–3 words, no superlatives, no ranking claims
- [ ] Runs automatically when a branch is added; buttons go live immediately

### 4.3 Setup flow
- [ ] After picking the shop on Google Maps: one voice question "What do you sell?" in the merchant's language
- [ ] Auto-detect the app language from the phone; skip the language screen
- [ ] Remove the dev-skip sign-in button from production builds

### 4.4 "What customers see" screen (replaces keywords + tone in `BranchDetailScreen.tsx`)
- [ ] Phone-style preview of the customer page
- [ ] 🎤 Add: merchant speaks, AI turns it into buttons
- [ ] Tap a button → big 🗑️ Remove, with a 5-second Undo bar
- [ ] Tap a button → 🎤 Rename
- [ ] 🔊 20-second voice explanation in the merchant's language
- [ ] "Could be better" buttons managed by the system, not shown for editing

### 4.5 Dashboard in plain words (`MerchantDashboardScreen.tsx`, `services/analytics.ts`)
- [ ] "42 people scanned · 18 wrote a review" instead of a conversion rate
- [ ] "😋 Customers liked: Tasty food (42)" and "😟 Customers unhappy: Long wait (8)" from button counts
- [ ] Feedback inbox: buttons as emoji chips, one-tap Call / WhatsApp reply

### 4.6 Sharing and printing
- [ ] Printable counter poster and table stickers (PDF) in the merchant's language (`components/QRCodeCard.tsx`)
- [ ] WhatsApp follow-up: the same ready-made message for every customer, in the merchant's language
- [ ] NFC sticker support (same URL as the QR code)

---

## Phase 5 — Features merchants pay for (2–3 weeks)

- [ ] **Google review alerts:** fetch Google reviews and send a push notification when a new one arrives
- [ ] **One-tap AI reply:** polite reply draft in the review's language; merchant taps Send
- [ ] **Weekly report:** every Monday on WhatsApp, text plus a voice note in the merchant's language
- [ ] **Nearby comparison card:** "Your rating 4.3 · nearby shops 4.1"
- [ ] **Subscription:** free for one shop with a monthly limit; paid plan for unlimited reviews, replies, reports and more branches (Google Play Billing via RevenueCat); price to validate in the pilot

---

## Phase 6 — Store readiness and launch

### Play Store submission
- [ ] Feature graphic (`assets/feature-graphic.png`, 1024×500)
- [ ] Screenshots: minimum 2, ideally 8 (phone + 7-inch + 10-inch tablet): dashboard, "What customers see", QR poster, liked/unhappy summary, settings
- [ ] Deploy the privacy policy page to `https://abhaysardhara.github.io/merchant-review-app/privacy`
- [ ] Content rating questionnaire
- [ ] Data safety form (Google sign-in, Firestore storage, voice processed by Deepgram, no data sold)
- [ ] Google Play service account key (`google-play-service-account.json`) for EAS Submit
- [ ] Google Play App Signing
- [ ] Closed test with 12+ testers for 14 days (required for new personal developer accounts)

### Branding and contact
- [ ] Real support email (replace `support@reviewreach.app` in PrivacyPolicyScreen, TermsOfServiceScreen, ContactUsScreen and `store.config.json`)
- [ ] Real WhatsApp number (replace `919876543210` in `ContactUsScreen.tsx`)
- [ ] Final app icon (`assets/icon.png`, 1024×1024) and adaptive icon (`assets/adaptive-icon.png`, with safe zone)
- [ ] Final splash screen (`assets/splash.png`)

### Store listing
- [ ] Promo video (YouTube URL) in `store.config.json`
- [ ] Hindi and Gujarati listing reviewed by a native speaker
- [ ] Spanish (`es`) listing if targeting that market

### Monitoring
- [ ] Firebase Crashlytics in the app
- [ ] Server logs with request IDs; alert on 5xx spikes
- [ ] Move the server off a sleeping free tier (paid Render instance, or Cloud Run with a minimum of 1 instance)
- [ ] Play Console alerts for reviews, crashes and ANRs

---

## Phase 7 — Pilot with 5–10 real shops (2 weeks)

- [ ] Recruit shops: restaurant, sweet shop, salon, clinic, kirana
- [ ] Install posters and NFC stickers; watch 20 real customers use it at the counter
- [ ] Weekly phone call with each merchant
- [ ] Measure against targets:
  - [ ] Scans ending in a copied review ≥ 40%
  - [ ] Reviews still on Google after 30 days ≥ 95%
  - [ ] Merchants who finish setup without help ≥ 90%
  - [ ] Median time from scan to copied review ≤ 30 s
  - [ ] Merchants active after 30 days ≥ 70%
  - [ ] Gemini cost per copied review ≤ ₹0.10
- [ ] Compliance audit: compare the in-app rating with the posted Google rating; rating mix by entry path
- [ ] Decide pricing and v1.1 features from the results
