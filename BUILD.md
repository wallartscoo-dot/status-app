# Status App — Build & Store Submission Guide (Phase 6)

This covers turning the app in this repo into installable builds and
submitting them to the App Store / Google Play. It uses **EAS Build**
(Expo's cloud build service) — you don't need a Mac to build for iOS, and
you don't need Android Studio to build for Android.

**Costs to budget for:** an Apple Developer Program membership ($99/year,
required to build/submit anything iOS beyond a simulator build) and a
Google Play Console account ($25 one-time). EAS Build itself has a free
tier sufficient for testing; check [expo.dev/pricing](https://expo.dev/pricing)
for current limits before a high-volume release.

---

## 0. One-time setup

```bash
npm install -g eas-cli
eas login                    # creates a free account if you don't have one

cd status-app              # repo root, where app.json lives
eas init                       # links this project to your Expo account —
                                # writes extra.eas.projectId into app.json.
                                # This repo deliberately ships without a
                                # projectId since it's account-specific.
```

`eas.json` already has three build profiles configured (`development`,
`preview`, `production`) and a `submit.production` profile — see below for
what each does. You shouldn't need to touch `eas.json` except to fill in
the placeholder values marked `REPLACE_WITH_...` before submitting.

---

## 1. Development builds

A development build is a custom "Expo Go"-like app with this project's
native dependencies baked in (needed because `expo-image-picker`,
`expo-media-library`, etc. aren't in the stock Expo Go app). Build one once,
then iterate with `npx expo start --dev-client` for fast reloads without
rebuilding.

```bash
eas build --profile development --platform android   # -> installable APK
eas build --profile development --platform ios        # -> requires a
                                                          # registered test
                                                          # device UDID, see
                                                          # step 3
```

## 2. Android

### APK for internal testing (spec section 32, Phase 6)

```bash
eas build --profile preview --platform android
```

Produces a standalone `.apk` you can install directly on any Android device
(`adb install path-to.apk`) or share a download link for — no Play Console
needed. Good for handing a build to testers before a store release.

### AAB for Google Play

```bash
eas build --profile production --platform android
```

Produces an `.aab` (Android App Bundle), the format Google Play requires
for new submissions. `eas.json`'s `production` profile already sets
`buildType: "app-bundle"` and `autoIncrement: true` (auto-bumps
`versionCode` in `app.json` on every production build, so you never submit
a duplicate version by accident).

### Submitting to Google Play

First release must be uploaded manually through the
[Play Console](https://play.google.com/console) — Google requires the first
version of any app to go through their web UI once. After that:

```bash
eas submit --platform android --profile production
```

`eas.json`'s `submit.production.android` is set to `track: "internal"` and
`releaseStatus: "draft"` — deliberately conservative defaults so a
CI-triggered submit never accidentally goes live to production users.
Promote through Play Console's UI (internal → closed → open → production)
once you've verified the build.

---

## 3. iOS

### Development build

Requires registering your test device(s) once:

```bash
eas device:create      # follow the prompt to register a device by UDID
eas build --profile development --platform ios
```

### Production build

```bash
eas build --profile production --platform ios
```

`eas.json`'s `production.autoIncrement: true` (set at the profile root,
applying to both platforms together — this is the officially documented
pattern for use with `cli.appVersionSource: "remote"`) auto-bumps the
build number on every production build.

### Submitting to the App Store

Fill in `eas.json`'s `submit.production.ios` first — replace:
- `appleId`: your Apple ID email
- `ascAppId`: the app's App Store Connect ID (create the app listing in
  [App Store Connect](https://appstoreconnect.apple.com) first — My Apps →
  "+" → New App — to get this)
- `appleTeamId`: found in your
  [Apple Developer account](https://developer.apple.com/account) under
  Membership

```bash
eas submit --platform ios --profile production
```

This uploads the build to App Store Connect. You still need to fill in the
store listing (screenshots, description, privacy details) and hit "Submit
for Review" manually in App Store Connect — `eas submit` only handles the
binary upload.

---

## 4. Before you submit for real: a checklist

Things this repo ships with placeholders for, which you should replace
before a real store submission:

- [ ] **App icon / splash / adaptive icon** (`assets/icon.png`,
      `assets/adaptive-icon.png`, `assets/splash.png`) are simple generated
      placeholders from Phase 1 — replace with real branded artwork.
      Apple requires the icon to have **no alpha channel/transparency**;
      `assets/icon.png` has already been flattened to RGB (no alpha) as of
      this phase so the *current* placeholder won't fail that specific
      check, but re-verify with `python3 -c "from PIL import Image;
      print(Image.open('assets/icon.png').mode)"` (expect `RGB`, not
      `RGBA`) after swapping in real artwork. Google Play additionally
      wants a 512×512 icon and a 1024×500 feature graphic uploaded
      separately in Play Console (not part of the app bundle).
- [ ] **Privacy Policy URL**: both stores require a *hosted, public* privacy
      policy URL in the store listing. `legal/privacy-policy.html` and
      `legal/terms-of-service.html` are standalone pages (not gated behind
      login, unlike `app/privacy.tsx`/`app/terms.tsx`) ready to host as-is
      — deploy them to GitHub Pages, Vercel, S3+CloudFront, or your own
      domain, then put the resulting URL in both stores' listing fields.
      Both files are still placeholder legal copy — have them reviewed by
      counsel before actually publishing.
- [ ] **`eas.json`'s placeholder values**: `appleId`, `ascAppId`,
      `appleTeamId` under `submit.production.ios` all say
      `REPLACE_WITH_...` or `your-apple-id@example.com` — fill in real
      values before running `eas submit`.
- [ ] **Production API URL**: `eas.json`'s `production` and `preview`
      profiles point `EXPO_PUBLIC_API_URL` at
      `https://api.statusapp.example.com` / `https://staging-api...` —
      placeholder domains. Point these at your actual deployed backend
      (see `backend/README.md`'s "Production deployment" section) before
      building for real.
- [ ] **Content moderation readiness**: both stores require user-generated-
      content apps to have working report/block mechanisms before approval.
      This app has both (`app/report content` flow, `POST
      /api/statuses/:id/report`, and the admin moderation dashboard) — make
      sure the admin dashboard is actually staffed/monitored before launch,
      since having the *feature* isn't the same as having a *process*.
- [ ] **Age rating / content rating questionnaire**: both stores ask about
      user-generated content, messaging, and content moderation during
      submission — answer based on the actual moderation flow in place.
- [ ] **iOS Privacy Manifest**: Apple requires a `PrivacyInfo.xcprivacy`
      declaring any "required reason" API usage (e.g. file timestamps,
      `UserDefaults`) for apps built after May 2024. EAS Build's managed
      workflow generates the iOS project fresh from `app.json` on every
      build, so add this via a config plugin
      (`expo-build-properties` or a custom plugin) rather than hand-editing
      a native project — check
      [Expo's privacy manifest docs](https://docs.expo.dev/guides/apple-privacy-manifests/)
      for the current recommended approach, since Apple's requirements here
      change fairly often.
- [ ] **Test on a real device before submitting**, not just the simulator/
      Expo Go — run a `preview` build and actually go through signup,
      upload, download, and payment-adjacent flows (even though payments
      aren't implemented — spec section 28 keeps that architecture-only for
      now) on a physical Android and iOS device.

---

## 5. Store listing content

### Data safety / App Privacy — what this app actually collects

Both stores ask you to declare data collection during submission. Answer
based on what this codebase actually does, not a generic template:

| Data type | Collected? | Purpose | Shared with 3rd parties? | Linked to identity? |
|---|---|---|---|---|
| Email address | Yes | Account creation, login | No | Yes |
| Name (full name, username) | Yes | Account, public profile | No | Yes |
| User-generated content (photos, videos) | Yes | Core app functionality | No | Yes |
| App activity (screen views, favorites, downloads, shares, follows, searches) | Yes | Analytics, personalized recommendations | No | Yes |
| Precise/approximate location | No | — | — | — |
| Financial info | No | — | — | — |
| Device/advertising IDs | No | — | — | — |

- **Encrypted in transit**: Yes, as long as your deployed
  `EXPO_PUBLIC_API_URL` is `https://` (see the Production API URL item
  above) — mark accordingly in both consoles.
- **User-deletable**: Yes — Settings → Log Out plus an account-deletion
  request flow (documented in the privacy policy).
- **Used for tracking** (Apple's App Tracking Transparency sense — cross-app/
  cross-site ad tracking via IDFA): **No**. This app doesn't use IDFA or
  share data with third parties for ad tracking, so no ATT prompt is
  needed and Apple's "Used for Tracking" column should be No throughout.
- **Content rating**: this app has user-generated video/image content with
  post-publish moderation (report button + admin review, not a pre-publish
  approval queue by default — see `backend/README.md`'s note on flipping
  uploads to a `PENDING` queue if you want stricter pre-screening). Expect
  a "Teen"/12+ range content rating from most questionnaires given
  unmoderated-until-reported UGC; answer both stores' questionnaires
  based on your actual moderation posture at submission time.

### Store listing copy

**App name**: Status App
**Subtitle / short description** (Play Store: 80 chars, iOS subtitle: 30 chars):
> Your Mood. Your Status. In 30 Seconds.

**Full description**:
> Find the perfect status in seconds. Browse trending short-form videos,
> images, and quotes across 20+ moods and categories — love, attitude,
> motivation, funny, and more. Download instantly to your gallery, follow
> your favorite creators, and share to WhatsApp, Instagram, and beyond.
> Upload your own 30-second statuses and build a following. Fast, modern,
> and built for how you actually share your mood.

**Keywords** (iOS, comma-separated, 100 char limit):
> status,whatsapp status,video status,love status,attitude status,short video,mood,quotes

**Category**: Social Networking (primary), Photo & Video (secondary, if
the store allows a second category).

**Screenshots**: capture from a real device/simulator running a
`preview`/`production` build against real (non-placeholder) content — Home,
a category grid, the status player, the upload flow, and a creator profile
are the strongest five if a store limits how many get featured first.

---

## 6. Why there's no committed `android/` or `ios/` folder

This project deliberately stays in Expo's **managed workflow** — no native
`android/`/`ios/` directories are committed. EAS Build generates them fresh
from `app.json` and the `plugins` array on every cloud build, which keeps
native config and JS config from drifting apart. If you need custom native
code EAS Build can't express via a config plugin, run:

```bash
npx expo prebuild
```

...to generate `android/`/`ios/` locally — but once you do, you're
responsible for keeping them in sync with `app.json` changes yourself (or
re-running `prebuild --clean`), and EAS Build will use your committed
native folders as-is instead of regenerating them.

---

## 7. Versioning

`app.json`'s `version` (currently `1.0.0`) is the user-facing version shown
in both stores. `ios.buildNumber` and `android.versionCode` are the
internal build counters each store uses to distinguish uploads of the same
version — both auto-increment on `production` profile builds per the
`eas.json` config above, so you generally shouldn't need to hand-edit them.
Bump `version` in `app.json` yourself for each real release (e.g. `1.0.0` →
`1.1.0`) following whatever semver convention you'd like.
