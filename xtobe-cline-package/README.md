# XTOBE — Bridge to Home — Cline Ready Package

All chats, one home. For everyone. No numbers, just XTOBE.

## Run in Cline (VS Code)

1. Open this folder in VS Code with Cline
2. Cline: Install dependencies
```
npm install
```

3. Run web version (instant):
```
npm run dev
# → http://localhost:3000
```

4. Build native apps for stores:
```
npm run cap:init
npm run cap:add
npm run cap:copy
```

5. Open in Android Studio / Xcode:
```
npm run cap:open:android
npm run cap:open:ios
```

6. Run on device/emulator from Cline:
```
npm run cap:run:android
npm run cap:run:ios
```

7. Build Play Store AAB:
```
npm run bundle:android
# output: android/app/build/outputs/bundle/release/app-release.aab
```

## What you get
- www/index.html — Landing Bridge to Home
- www/dashboard.html — Home dashboard (no jargon)
- www/manifest.json — PWA
- www/icon-1024.png / 512 / 192 — XTOBE icons
- capacitor.config.json — com.hulkerveug.xtobe
- Store ready: Play $25, App Store $99/year

## Store Listing
Title: XTOBE — Bridge to Home
Short: All chats, one home. For everyone.
Description in www/store-listing.txt

Cline can push this to GitHub Pages: just copy www/* to your xtobe-connector repo root.
