# Photo Comments Panel Revamp Roadmap

Last updated: 2026-09-15

## Objective

Replace the current mobile photo-comments drawer with a predictable, accessible
comments experience that has one vertical scroll owner, never moves the gallery
behind an open panel, and does not depend on custom multi-stop swipe physics.

Desktop may retain a side panel where enough space exists, but it must also use
one vertical scroller. Phone portrait and landscape should use the same simple
full-height modal-sheet model.

## Current state

- Status: Implementation complete; automated and simulated-device QA passed.
- Active item: 5.6 — physical-device release QA.
- Next item: Run the final iOS Safari and Android Chrome device matrix before
  production release.
- Primary implementation:
  [`jgantts-com/src/views/photos/IndexView.vue`](../jgantts-com/src/views/photos/IndexView.vue)
  and
  [`jgantts-com/src/views/photos/ClusteredPhotoMasonry.vue`](../jgantts-com/src/views/photos/ClusteredPhotoMasonry.vue).
- Current interaction: mobile and short landscape use a compact comments dock
  and a full-height modal sheet; larger viewports use a single-scroll side panel.
  The old multi-stop drag state and custom swipe physics have been removed.

## Implementation and verification summary

- `PhotoCommentsPanel.vue` now owns the responsive shell, compact dock, modal
  semantics, body scroll lock, focus trap/restoration, browser-back handling,
  share controls, and all discussion states.
- `IndexView.vue` renders only the active panel, makes the gallery inert while a
  modal is open, preserves direct routes and scroll position, and restores focus
  to the selected photo when selection closes.
- `ClusteredPhotoMasonry.vue` pauses exposure tracking while the modal is open;
  panel visibility no longer depends on selected-photo intersection.
- `MediaCarousel.vue` preserves an existing document scroll lock when its own
  nested media dialog opens and closes.
- Eleven component tests cover panel state, history, focus, cleanup, discussion
  states, deep replies, warnings, media, and nested modal scroll-lock ownership.
- Two Playwright tests cover background scroll prevention, single scroll
  ownership, keyboard operation, reduced motion, and 200% zoom.
- Manual responsive browser checks passed at 390 × 844, 430 × 932, 844 × 390,
  1025 × 800, and a wide desktop viewport, including orientation changes,
  direct links, share controls, and accessibility-tree isolation.

## Verified baseline

The live site was exercised at phone-sized viewports on 2026-09-14.

### Portrait: 390 × 844

- The document remained vertically scrollable while the comments drawer was
  open: document height was 2,002 px for an 844 px viewport.
- The intermediate drawer added another scroll viewport: 375 px of content in a
  328 px viewport.
- A scroll beginning inside the drawer moved that inner viewport while leaving
  the page at `scrollY: 0`.
- A scroll beginning on the exposed gallery moved the page to `scrollY: 844`.
  That made the selected photo leave the visibility calculation, which applied
  `is-out-of-view`, `aria-hidden="true"`, and zero opacity to the still-open
  comments panel. The panel disappeared without being closed.
- The drag handle occupied roughly 150 px and owned its own gesture behavior,
  while the content immediately below it owned normal scrolling. The same
  vertical motion therefore had different results depending on its starting
  position.

### Landscape: 844 × 390

Three simultaneous vertical scroll regions were present:

1. Page: 1,635 px of content in a 390 px viewport.
2. Comments panel: 511 px of content in a 358 px viewport.
3. Post-text box: 181 px of content in an 86 px viewport.

This confirms the reported “scrollboxes in scrollboxes” problem. Landscape also
falls back to the sticky side-panel presentation at a height where it cannot
comfortably contain its own header, post context, controls, and replies.

## Root causes

1. **The background is not locked.** The fixed mobile drawer and the document
   can both receive vertical scrolling.
2. **Panel visibility is coupled to gallery visibility.** Scrolling the gallery
   can hide an open comments panel because selected-post intersection drives the
   panel's opacity and `aria-hidden` state.
3. **There are too many vertical scroll owners.** The page, panel, drawer body,
   and post-text excerpt can each become independently scrollable at different
   breakpoints.
4. **Gesture ownership is split by hit area.** The large handle uses
   `touch-action: none` and custom pointer capture; the reply body uses native
   scrolling. Users must discover where a swipe is allowed to scroll or resize.
5. **The interaction has unnecessary state.** Three snap positions, velocity
   smoothing, projected offsets, tap-to-toggle behavior, and separate arrow
   controls all express the same basic choice: view comments or return to the
   gallery.
6. **Phone landscape is treated like desktop.** The width-only side-panel
   breakpoint does not account for the severely constrained height.

## Product contract

### Mobile and phone landscape

1. The closed state is a compact dock or button showing the reply count. It is
   not a partially interactive 120–150 px drawer.
2. Activating the dock opens a full-height modal sheet with one scrollable body.
3. The document is scroll-locked while the sheet is open. Gallery position is
   preserved and restored exactly when the sheet closes.
4. The sheet remains visible until the user explicitly closes it. Gallery
   intersection or exposure tracking cannot hide it.
5. A sticky sheet header contains Close, `Replies`, reply count, and Share.
6. Photo/post context is concise and may expand inline, but it never becomes a
   separate vertical scroller.
7. Buttons are the primary controls. Swipe-down-to-close is optional progressive
   enhancement, never required for operation.
8. If swipe-down-to-close is implemented, it may begin only when the reply body
   is at `scrollTop === 0`, must require clear downward vertical intent, and must
   not compete with links, buttons, or horizontal media gestures.
9. Browser back and Escape close the sheet before leaving the selected photo,
   where platform conventions allow it.
10. Opening moves focus into the sheet; closing restores focus to the comments
    trigger or selected photo.

### Tablet and desktop

1. Use the modal sheet until both viewport width and height can support a side
   panel without cramped nested scrolling.
2. The side panel has one vertical scroller for post context, replies, and the
   reply link together.
3. Post text is never independently scrollable. Long text participates in the
   panel's normal document flow and may use an explicit expand/collapse control.
4. The sticky heading may remain, provided it does not create another scroll
   boundary or obscure focused content.

## Implementation plan

### Phase 1 — Simplify state and component boundaries

- [x] **1.1** Define the panel state as `closed | open`. Remove the intermediate
  state from the product contract and document route/back-button behavior.
- [x] **1.2** Extract a dedicated `PhotoCommentsPanel.vue` from `IndexView.vue`.
  Give it explicit inputs for selected post, replies, reply count, remote reply
  URL, and open state, plus open/close/share events.
- [x] **1.3** Remove custom offset calculation, velocity smoothing, projected
  snap selection, pointer capture, and up/down step controls.
- [x] **1.4** Render only the active panel instead of maintaining one hidden
  comments section per photo post.
- [x] **1.5** Keep discussion normalization and threaded-reply presentation
  independent from the sheet/side-panel shell.

Exit condition: the feature has one explicit open state and no custom multi-stop
gesture state machine.

### Phase 2 — Build the mobile modal sheet

- [x] **2.1** Add the compact closed dock with a clear `View comments` label and
  reply count. Keep its touch target at least 44 × 44 CSS pixels.
- [x] **2.2** Build a fixed, safe-area-aware modal sheet for portrait and phone
  landscape with a sticky header and one `overflow-y: auto` body.
- [x] **2.3** Lock document scrolling while open without losing the gallery's
  current scroll position. Restore the original document styles and position on
  every close and unmount path.
- [x] **2.4** Make the gallery inert while open, trap focus within the sheet, and
  restore focus on close. Provide correct dialog naming and close semantics.
- [x] **2.5** Move post context into a compact, non-scrolling summary. Add a
  disclosure only when the text exceeds the useful collapsed length.
- [x] **2.6** Preserve safe-area padding, reduced-motion behavior, and visible
  focus styles. Do not animate large content areas when reduced motion is set.
- [x] **2.7** Evaluate swipe-down-to-close after the button-driven interaction is
  complete. Ship without it if scroll-boundary arbitration is not consistently
  reliable on iOS Safari and Android Chrome.

Decision: ship without swipe-to-close. The explicit close button, Escape, and
browser Back paths cover dismissal without reintroducing gesture competition.

Exit condition: while comments are open on a phone, only the reply body can
scroll vertically and the gallery cannot move or hide the panel.

### Phase 3 — Repair wider responsive layouts

- [x] **3.1** Replace the width-only breakpoint with a layout decision that also
  accounts for viewport height and available panel width.
- [x] **3.2** Use the modal sheet for short landscape viewports. Do not activate
  the sticky side panel merely because a phone is wider than `44rem`.
- [x] **3.3** Remove `overflow-y: auto` and the viewport-relative max height from
  `.comments-post-text`; let it flow inside the panel's single scroller.
- [x] **3.4** Keep one sticky panel heading on desktop and verify that keyboard
  focus is never hidden under it.
- [x] **3.5** Validate very long post text, deep reply indentation, comment media,
  content warnings, share controls, and the Mastodon reply link.

Exit condition: tablet and desktop layouts contain no nested vertical scrollbox
and phone landscape uses the mobile interaction model.

### Phase 4 — Decouple selection visibility and harden navigation

- [x] **4.1** Stop applying selected-photo visibility opacity and `aria-hidden`
  state to an open comments panel.
- [x] **4.2** Pause or isolate selected-photo exposure calculations while the
  modal sheet is open so comments do not affect gallery analytics or selection
  state.
- [x] **4.3** Preserve the canonical `/photos/:slug` route, direct-link behavior,
  selected photo, gallery scroll position, and focus across open/close actions.
- [x] **4.4** Define behavior for orientation changes while open. The panel must
  remain usable and must not resurrect a removed intermediate state.
- [x] **4.5** Verify loading, unavailable, empty, cached, and truncated discussion
  states within the new shell.

Exit condition: comments remain stable through background layout changes,
navigation, orientation changes, and discussion-state transitions.

### Phase 5 — Automated and device QA

- [x] **5.1** Add component tests for open/close, focus entry and restoration,
  inert background, scroll locking, Escape/back behavior, and cleanup on unmount.
- [x] **5.2** Add browser tests that assert the page scroll position cannot change
  while the mobile panel is open and that the panel remains visible.
- [x] **5.3** Add browser tests that assert there is exactly one scrollable
  vertical region inside the open mobile panel.
- [x] **5.4** Exercise empty, one-reply, long-thread, deeply nested, long-post,
  media-heavy, and unavailable discussions.
- [x] **5.5** Test at minimum 390 × 844, 430 × 932, 844 × 390, the narrow desktop
  breakpoint boundary, and a wide desktop viewport.
- [ ] **5.6** Perform physical-device QA in current iOS Safari and Android Chrome,
  including slow drags, quick flicks, scroll reversal, horizontal media swipes,
  orientation changes, dynamic browser chrome, and safe areas.
- [x] **5.7** Run keyboard and screen-reader smoke tests and verify 200% zoom and
  reduced motion.

Exit condition: automated tests cover scroll ownership and visibility regressions,
and physical-device QA finds no ambiguous vertical gesture path.

## Release sequence

Deliver the work as three reviewable changes:

1. **Structural PR:** extract the component, reduce state to open/closed, and add
   the first tests without materially changing desktop styling.
2. **Mobile PR:** ship the modal sheet, body lock, focus management, compact
   header/context, phone-landscape behavior, and mobile browser coverage.
3. **Desktop and hardening PR:** remove remaining nested overflow, decouple
   gallery visibility, finish responsive behavior, and complete device QA.

## Acceptance criteria

- At every supported mobile size, no more than one vertical scroll container is
  active while comments are open.
- The page's scroll position cannot change while the mobile comments sheet is
  open.
- An open panel never disappears because its photo moved outside the viewport.
- The same vertical gesture does not scroll, resize, or dismiss different layers
  solely because it began a few pixels higher or lower.
- All panel functionality is available without a swipe gesture.
- Long post text does not create a nested vertical scrollbar.
- Opening and closing preserve the selected photo, route, gallery position, and
  logical focus target.
- Empty, loading, unavailable, cached, truncated, and populated discussions are
  usable at all target breakpoints.
- Keyboard, screen-reader, reduced-motion, zoom, safe-area, and orientation tests
  pass before release.

## Out of scope

- Changing the Mastodon comments API or cache policy.
- Adding native comment composition to JGantts.com.
- Redesigning the masonry gallery outside changes required for modal isolation,
  restored focus, and preserved scroll position.
- Replacing the expanded-photo viewer.
