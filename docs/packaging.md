# Desktop and mobile packaging

All targets consume the same Vite/Next-compatible web output in `dist/`; there is no separate UI fork.

## Tauri desktop

Prerequisites are the Rust/Tauri platform requirements. Then run:

```bash
npm run desktop:dev
npm run desktop:build
```

The shell configuration is in `src-tauri/`. A production desktop deployment should either point API calls at a configured HTTPS Nest service or add a narrowly scoped Tauri sidecar; browser code must not embed database credentials.

## Capacitor Android/iOS

```bash
npm run mobile:sync
npm run mobile:android
npm run mobile:ios   # requires macOS/Xcode
```

The first sync creates/updates the ignored `android/` and `ios/` native projects. Capacitor serves the same responsive PWA bundle. IndexedDB remains the offline data layer; native plugins should be added only through isolated adapters.
