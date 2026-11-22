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
- [x] Delete `screens/FeedbackGateScreen.tsx` (rating gate)
- [x] Delete the unused customer screens: `CustomerScannerScreen.tsx`, `ReviewEditorScreen.tsx`, `PrivateFeedbackScreen.tsx` (and `components/LanguageSelector.tsx`, only used by them)
- [x] Remove `CustomerStackParamList` and the unused `ReviewDraft`, `PrivateFeedback`, `LanguageOption` types from `types/index.ts`
- [x] Delete `services/aiService.ts` (template praise sentences)
- [x] Remove the old-flow helpers in `services/analytics.ts` and the client-side Firestore writes in `services/firebase.ts` (`incrementTotalScans`, `incrementReviewsCopied`, `savePrivateFeedback` — now blocked by `firestore.rules`)
- [x] Remove the "always 5-star" wording and the banned-phrase lists (done in Phase 1)
- [x] Rewrite the Play Store listing (`store.config.json`, en/hi/gu): no "5-star" promises, no "feedback routing", no unsourced statistics, accurate privacy section
- [x] Sign-in tagline and the review page's private-feedback link no longer steer away from Google
- **Done when:** `grep -ri "5-star\|five stars\|BANNED" server/src web services` returns nothing ✅

### 2.2 New honest prompts
- [x] Star-only draft: one short sentence stating only the customer's rating, in their language and script; wording varies per request
- [ ] Draft from buttons: use only the chosen buttons; negative buttons stay negative; no added claims (with the buttons in Phase 3/4)
- [x] Voice: remove filler words and fix grammar only; keep meaning, sentiment and the chosen star rating
- [ ] Write the full 20-case check (each rating × with/without buttons × English/Hindi) once buttons exist — 8 cases checked so far
- **Done when:** a 2★ voice note saying "food was cold" never turns into praise ✅ (tested 2026-11-22)

---

## Phase 3 — New customer review page (3–5 days)

Build the v2 design into `web/index.html`.

### 3.1 Layout and look
- [x] Full-screen layout: `height: 100dvh`, scrolling content area, fixed bottom action bar (main button always visible)
- [x] Compact mode under 700 px height (face 72 px, headline 30 px)
- [x] Fonts: Bricolage Grotesque 800 self-hosted for headings (`web/fonts`, Latin subset, 38 KB, `font-display: swap`); body text and Indian scripts use the phone's fonts (Roboto/Noto on Android), which keeps the page fast on slow networks
- [x] Colours: paper `#FBF7F0`, ink `#1B1A17`, marigold `#F2A900`, green `#1F6E50`, clay `#B8431F`, star outline `#8C7B5C`, chip border `#A89878`
- [x] Minimum text 13 px, touch targets ≥ 48 px

### 3.2 Rate screen
- [x] Shop monogram, name and area (session + Places API)
- [x] Language button "English · हिंदी" (auto-detect from the browser on first load)
- [x] Reacting face; calm mark for clinics, hospitals, dentists, pharmacies, labs and vets (from the Google place type)
- [x] Stars as `role="radiogroup"`; tapped star pops in 320 ms
- [x] On star tap: copy the draft **inside the tap handler**, check the result, `vibrate(8)` on Android
- [x] 1.2 s progress line with "Stay here"; tapping another star changes the rating; "Continue" if they stay
- [x] Bottom bar: progress/Continue, "Write it yourself", private-feedback link

### 3.3 Draft endpoint
- [x] `GET /api/v1/review/drafts?lang=` (session required) returns 5 star-only drafts from one Gemini call
- [x] Cached per branch + language for 6 hours, up to 4 variants so wording varies; most loads cost no AI call
- [x] Page fetches drafts on load; if a customer taps before they arrive, a plain local sentence is copied instead

### 3.4 Details screen
- [ ] All three button groups at every rating — needs the merchant buttons from Phase 4; for now "Write it yourself" (type or speak)
- [x] Voice button using the existing Deepgram streaming; visible recording state; server tidies words without changing meaning
- [x] "Copy & open Google" disabled until a star is chosen and there is text

### 3.5 Copied screen
- [x] Receipt with print animation, stamp and zigzag edge
- [x] "Posting to" card: place name, area, Google rating and review count from the Places API
- [x] Numbered Google steps using the customer's own star count ("Tap 4 stars again")
- [x] "Open Google" is a real tap: `location.href` to `https://search.google.com/local/writereview?placeid=…`
- [x] ~~Android: try the Google Maps app intent first~~ — dropped: Google documents no deep link into the Maps app's review form, and an intent risks opening Maps without the form. The `writereview` link works in Chrome when the phone is signed in to Google; revisit if phone tests show drop-off here
- [x] If the page is still visible 1.5 s after the tap: show "Didn't open? Tap again"
- [x] Copy failed: "Copy it yourself" state with the text ready to select

### 3.6 Edge cases
- [x] Detect in-app browsers (Facebook, Instagram, Line, PhonePe, Paytm, Android WebView): "Open in browser" (Chrome intent on Android)
- [x] Thank-you screen only after the customer returns (`visibilitychange`, `pageshow`, or reload via `sessionStorage`)
- [x] Private-feedback sheet reachable from every screen, at any rating
- [x] `prefers-reduced-motion` turns off all animation
- [x] Screen reader: focus moves to each screen's heading; status messages announced
- [x] Browser test (Playwright, 390×844): load, 4★ copy, clipboard contents, receipt, Hindi, feedback sheet — no console errors

### 3.7 Analytics events
Daily counters per branch in `users/{uid}/branches/{placeId}/stats/{YYYY-MM-DD}` (India date), written by the server (`POST /api/v1/events`, sent with `sendBeacon`, whitelisted names, max 200 per session). Readable by the owner — **republish `firestore.rules`**.
- [x] `scan_landed_qr|link|direct`, `in_app_browser`, `lang_en|hi`, `lang_switched`
- [x] `star_tapped_1…5` (rating mix for the compliance audit), `star_changed`, `stay_tapped`
- [x] `details_opened`, `voice_started`, `voice_completed`, `voice_failed` — [ ] `chip_toggled` with the buttons in Phase 4
- [x] `clipboard_ok`, `clipboard_fail`
- [x] `google_tap`, `google_not_opened`, `webview_escape_shown`, `webview_escape_tapped`
- [x] `returned_lt30s|lt2m|gt2m`, `copy_again_tapped`
- [x] `private_feedback_opened`, `private_feedback_submitted`
- [x] Tested end to end: browser test → counters appear in Firestore

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
- [x] `buttons: ReviewButton[]` (labels en/hi/gu), `servicesSpoken`, `buttonsGeneratedAt` on the branch; buttons saved only via `saveBranchButtons` or the server
- [x] ~~`draftsMade`, `privateFeedback` on `BranchAnalytics`~~ — covered by the daily stats (`stats/{day}` counts)
- [x] Removed `keywords`, `tone`, `category` from the app (old Firestore fields are simply ignored)
- [x] `QRPayload` v2 without `tone`/`keywords`; QR links (`?pid&uid`) unchanged, so old codes keep working
- [ ] One-time cleanup: delete the stale `analytics` map field from existing Firestore documents

### 4.2 Automatic customer buttons
- [x] `POST /api/v1/merchants/:uid/branches/:placeId/buttons/generate` (merchant login, 10/min per merchant, shop's daily AI cap)
- [x] Inputs: Places API type, summary, attributes and up to 5 public reviews, plus "What do you sell?"
- [x] Gemini with a JSON schema → `bought / good / improve` buttons with emoji, labels in English, Hindi and Gujarati
- [x] Rules: 1–3 words, no superlatives, no ranking claims, only items the inputs show
- [x] Runs automatically in the background when a shop is added; older shops get buttons the first time "What customers see" opens
- [x] `.../buttons/add`: what the merchant says ("we sell biryani and thali") becomes new buttons
- [x] Review page: buttons on the details screen, all groups at every rating; draft from picks only (`mode: "buttons"`); picked buttons counted as `btn_<id>`

### 4.3 Setup flow
- [x] After picking the shop: one optional "What do you sell?" field with a "tap 🎤 on your keyboard" hint (uses the phone keyboard's voice typing)
- [x] ~~Auto-detect the app language from the phone~~ — decided not to do (2026-11-22)
- [x] Dev-skip sign-in button only exists in `__DEV__` builds (already the case)

### 4.4 "What customers see" screen (`screens/CustomerButtonsScreen.tsx`)
- [x] Phone-style preview of the customer page
- [x] Add more: merchant speaks (keyboard mic), AI turns it into buttons
- [x] Tap a button → big 🗑️ Remove, with a 5-second Undo bar
- [x] Tap a button → ✏️ Rename (the merchant's words are shown in every language)
- [x] 🔊 "Listen" button: spoken explanation in English, Hindi or Gujarati (`expo-speech`; uses the phone's voices)
- [x] "Could be better" buttons managed by the system, not shown for editing

### 4.5 Dashboard in plain words
- [x] Shop cards: "👀 42 scanned · 18 reviews" instead of a conversion rate
- [x] Shop screen "Last 7 days": people who opened the page, people who went to Google, "😋 Customers liked …" and "😟 Customers unhappy …" from button counts, and a star-rating bar chart (`components/WeekSummary.tsx`) — needs the updated `firestore.rules` published
- [x] Feedback inbox: the customer's picked buttons as emoji chips (sent with the private message), big Call and WhatsApp buttons

### 4.6 Sharing and printing
- [x] Printable A4 counter poster (PDF via `expo-print`, shared to WhatsApp/print shop) in the merchant's language; outline stars so it doesn't suggest a rating — [ ] table stickers
- [x] WhatsApp follow-up and "Share Link": the same honest message for every customer, in the merchant's language
- [ ] NFC sticker support (same URL as the QR code — works today with any NFC tag writer app; in-app writing later)

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
