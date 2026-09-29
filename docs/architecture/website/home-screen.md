# Home Screen app and notification settings

**Responsibility:** installable app identity, reader navigation, and per-installation
notification setup without reader accounts.

**Entry points:** `/install` explains Add to Home Screen; `/notifications` manages
consent. The main-layout header links to notification settings with “Subscribe to
updates.” Notification settings guide readers to installation help when needed.

**Dependencies:** `/manifest.webmanifest`, explicitly linked Apple touch icon,
192/512 PNG icons and a maskable icon, the shared `/sw.js`, and the push API.
The manifest identity and scope are `/`, launch route is `/photos`, and display is
`standalone`. Notification deep links retain their destination.

**Invariants:** permission follows an explicit Enable click. An ordinary iPhone
or iPad browser tab gets installation guidance; the installed app offers consent.
Denied, unavailable, orphaned, pending, and revoked states have recovery controls.
A failed registration never claims subscription success. Unsubscribe retains a
pending record until both server revocation and browser unsubscribe complete.
Returning to the settings view reconciles permission and subscription state.
Browser and standalone storage/sign-ins must be treated independently.

The worker registers once at the stable root URL, uses no fetch interception,
and never forces activation/reloads an editor. Push produces a visible notification;
clicks accept only same-origin gallery/post destinations and preserve an open
admin editor. App use is online-first; no offline media/post storage is promised.

**Source:** [manifest](../../../jgantts-com/PUBLIC/manifest.webmanifest),
[worker](../../../jgantts-com/PUBLIC/sw.js),
[client lifecycle](../../../jgantts-com/src/notifications/client.ts),
[settings](../../../jgantts-com/src/views/NotificationsView.vue),
[install guidance](../../../jgantts-com/src/views/InstallAppView.vue),
[icon renderer](../../../scripts/generate-app-icons.js).

Physical-device installation, OS delivery, VoiceOver, and update/rollback QA
remain release gates in the [Home Screen roadmap](../../IOS-HOME-SCREEN-APP-ROADMAP.md).

Subscribed installations can set daily and weekly maximums in notification
settings. Defaults are 2 per day and 3 per week; blank means unlimited and 0
pauses post alerts. The UI explains rolling windows, skipped excess alerts,
and the exclusion of admin test notifications. Failed saves retain edits.
