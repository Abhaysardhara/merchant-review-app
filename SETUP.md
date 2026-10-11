# ReviewReach — Quick Start

## Install & Run

```bash
cd merchant-review-app
npm install
npx expo start
```

Press **a** for Android emulator, **i** for iOS simulator, or scan the QR code with the Expo Go app.

## Default Merchant PIN
`1234`  — change it in Dashboard → (any branch detail screen in a future settings screen).

## Merchant Flow
1. Tap **Dashboard** tab → enter PIN `1234`
2. Tap **+** → paste a Google Maps link (e.g. `https://www.google.com/maps/place/Eiffel+Tower/`)
3. Tap **Resolve Place ID** → fill in branch name, category, tone, keywords
4. The branch card appears with a generated QR code — share it to print on counter tent cards

## Customer Flow
1. Tap **Scan & Review** tab → point at a branch QR code
2. Select a star rating (1–5)
   - **4–5 stars** → AI review editor → Copy & Open Google Maps
   - **1–3 stars** → Private feedback form → sent to manager only
3. Optionally switch language (English / Español / हिन्दी / ગુજરાતી)
4. Edit the draft, tap **Copy Review & Open Google Maps**, then paste in the Maps review box

## Key files
| Path | Purpose |
|------|---------|
| `types/index.ts` | All TypeScript interfaces & navigation param lists |
| `services/mapsResolver.ts` | Google Maps URL parser + Place ID generator |
| `services/aiService.ts` | Multi-language review draft templates |
| `services/analytics.ts` | AsyncStorage persistence + analytics helpers |
| `store/MerchantContext.tsx` | Global state (branches, auth) |
| `components/` | StarRating, LanguageSelector, QRCodeCard |
| `screens/` | All 6 screens |
| `navigation/AppNavigator.tsx` | Tab + stack navigation wiring |
