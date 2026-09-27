# iOS Home Screen App Roadmap

Last updated: 2026-09-26

## Objective

Make JGantts.com a polished web app that readers can add to an iPhone or iPad
Home Screen and launch directly into the site. Keep the existing Vue application
and same-origin content APIs.

Related roadmap: [Push Notifications](PUSH-NOTIFICATIONS-ROADMAP.md).
This document owns installability, manifest identity, icons, launch behavior,
standalone navigation, and iOS device QA. The push roadmap owns permission,
subscriptions, sending, and the single shared `/sw.js` registration. Installation
must work and remain useful without notification permission.

## Current state

- Status: Planned; no Home Screen app implementation has started.
- Next item: Phase 1 — manifest, icons, and release asset delivery.
- [The HTML entry](../jgantts-com/index.html) already has theme colors and
  `viewport-fit=cover`, but no manifest link or explicit Apple touch icon link.
- [An Apple touch icon](../jgantts-com/public/apple-touch-icon.png) exists; its
  dimensions and appearance still need review before reuse.
- [Vue Router](../jgantts-com/src/router/index.ts) uses history navigation, and
  [Express](../jgantts-server/src/app.ts) serves initial HTML and post redirects.
- [Vite](../jgantts-com/vite.config.ts) excludes the public directory from
  production builds. Installation assets require explicit packaging/delivery
  verification through the existing release pipeline.

## Platform baseline

A manifest with standalone display provides explicit app identity and supports
older iOS installation behavior. On iOS/iPadOS 26, users can open any website as
a web app when adding it to the Home Screen; install instructions must account
for the newer `Open as Web App` choice. See
[WebKit's Safari 26 release notes](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/).

iOS/iPadOS Web Push requires a Home Screen app on supported versions starting
with 16.4. Adding the app and granting notification permission are separate
actions. See [WebKit's Home Screen Web Push documentation](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

Use capability detection for functionality and standalone display detection for
context. Do not assume that an ordinary browser tab shares the installed app's
storage, session, or notification subscription. Recheck actual behavior on the
supported physical devices before release.

## App contract

- Proposed manifest: stable `id: "/"`, `name: "JGantts.com"`,
  `short_name: "JGantts"`, `start_url: "/photos"`, `scope: "/"`, and
  `display: "standalone"`, with matching background/theme colors. Confirm the
  photos-first launch choice before implementation; keep identity stable across
  releases, install entry pages, and notification links.
- Serve `/manifest.webmanifest` with the manifest MIME type and revalidation.
  Provide reviewed 192 × 192 and 512 × 512 PNG icons, a separate maskable icon,
  and an explicit 180 × 180 Apple touch icon. Check cropping and light/dark
  surroundings on device rather than assuming the existing asset is sufficient.
- Provide a dismissible `Add to Home Screen` help view reachable from site
  navigation and the notification setup flow. Describe the tested Share → Add
  to Home Screen steps and, where present, `Open as Web App`. Explain that the
  reader must launch the installed icon before enabling iOS notifications.
- Do not rely on `beforeinstallprompt` for the iOS install flow or claim that
  clicking an in-page button installs the app. If installation is unavailable
  in the current context, suggest opening the site in Safari.
- When launched standalone, hide redundant install prompts and provide visible
  navigation to the gallery, posts, and notification settings. Opening a deep
  link must preserve its requested post rather than return to `start_url`.
- Preserve theme, orientation support, safe-area padding, accessible touch
  targets, and keyboard focus. Check the gallery, comments sheet, media viewer,
  and share controls without Safari's usual browser chrome.
- External destinations such as Mastodon must have a usable return path. Do
  not assume Safari login state is available in the standalone app; private
  authoring remains governed by the existing server authentication.
- v1 is online-first. Do not cache posts, admin APIs, media libraries, or map
  tiles. Show a useful retry state when content requests fail offline; a cold
  offline launch may show the platform's network error. Offline shell/content
  support is a separate future feature, not an installation promise.

## Implementation phases

### Phase 1 — App identity and installation assets

- [ ] **1.1** Confirm manifest identity, scope, default launch route, name,
  colors, and icon artwork.
- [ ] **1.2** Add the manifest and HTML links; create or adapt the icon set.
- [ ] **1.3** Package and serve the manifest/icons explicitly, preserving the
  existing metadata injection and separate map deployment. Missing assets must
  return 404 rather than SPA HTML.
- [ ] **1.4** Verify headers and actual asset bytes in a packaged release.

Exit condition: a physical iPhone can install the intended name/icon and launch
the standalone app at the chosen route.

### Phase 2 — Installation guidance and standalone experience

- [ ] **2.1** Add accessible, dismissible install guidance with copy checked
  against supported iOS/iPadOS versions.
- [ ] **2.2** Add standalone context detection and persistent navigation/settings
  access; retain normal browsing when installation is declined.
- [ ] **2.3** Verify safe areas, orientation changes, comments/media overlays,
  back navigation, external links, sharing, and offline retry behavior.

Exit condition: readers can install, launch, navigate, and return to content
without browser chrome or notification permission.

### Phase 3 — Push integration

- [ ] **3.1** Consume the shared registration and notification UI from the
  [push roadmap](PUSH-NOTIFICATIONS-ROADMAP.md); never register a second worker.
- [ ] **3.2** From an ordinary iOS tab, guide readers through installation and
  launch. Inside the installed app, offer the explicit notification opt-in.
- [ ] **3.3** Verify notification clicks with an open app and a terminated app,
  including old slugs, revision redirects, and unavailable posts.
- [ ] **3.4** Verify independent permission/subscription state after app removal,
  reinstall, or multiple installations. Do not silently restore consent.

Exit condition: an installed app receives a real test notification and opens
the correct post through the shared push implementation.

### Phase 4 — Device QA and release

- [ ] **4.1** Record physical iPhone and iPad results for the oldest supported
  OS available for testing and the current shipping OS; include the iOS 26
  installation flow. Clearly record any untested versions.
- [ ] **4.2** Test installation from the home page and a post deep link, repeat
  launch, removal/reinstall, portrait/landscape, light/dark mode, VoiceOver,
  enlarged text, and reduced motion.
- [ ] **4.3** Test a deployment and rollback while an older installed app is
  open. Verify that identity stays stable and worker updates preserve browsing
  and pending notification compatibility.
- [ ] **4.4** Run frontend tests/build and production asset smoke checks. Record
  physical-device results alongside the push roadmap's canary results.
- [ ] **4.5** Release installation support first or together with push; expose
  the notification offer only when its backend and device QA are ready.

## Completion and rollback

Complete when installation consistently produces the intended app identity,
standalone browsing and deep links work, the shared worker survives updates,
and real-device accessibility/navigation checks pass. Claim iOS push support
only after the push roadmap's delivery criteria pass as well.

If installation guidance or push needs disabling, retain the manifest, stable
app identity, icons, launch routes, and worker URL for existing installations.
Hiding an install prompt does not uninstall readers' apps.

Out of scope: native Swift/Capacitor packaging, App Store submission, paid Apple
developer enrollment, offline media downloads, background synchronization, and
unread badge counts.
