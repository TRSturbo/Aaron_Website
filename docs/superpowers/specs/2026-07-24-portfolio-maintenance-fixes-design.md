# Portfolio Maintenance Fixes Design

## Goal

Resolve the release-blocking mouse-wheel regression and the two verified Tetris accessibility/responsive defects without removing the site's motion or easter egg.

## Considered approaches

1. **Targeted repairs (selected):** keep native scrolling for wheel and touch input, apply smooth motion only to deliberate navigation-link clicks, compact the mobile game, and correct the canvas semantics. This preserves the intended experience with a small change surface.
2. **Disable Tetris on small screens:** avoids the responsive defect but removes a feature precisely where the new touch controls were intended to help.
3. **Remove Tetris entirely:** produces the smallest site but discards a distinctive interaction for issues that can be repaired locally.

## Scrolling design

- Remove the global `html { scroll-behavior: smooth; }` rule. Native wheel, trackpad, scrollbar, keyboard, and touch scrolling must respond immediately.
- Add smooth scrolling only to `.nav-link` and `.cta-button` links that target an in-page section.
- Respect `prefers-reduced-motion: reduce` by using immediate anchor navigation for those users.
- Preserve the URL hash after an intercepted anchor click so links remain shareable and browser history remains meaningful.
- Do not intercept the skip link; its native focus and navigation behavior is accessibility-critical.

## Tetris responsive design

- Keep the existing desktop two-column game layout.
- On narrow or coarse-pointer devices, use a compact vertical layout with a viewport-relative board height.
- Keep the board, score row, and touch controls within one modal viewport at 320x700 and larger test sizes.
- Hide the redundant keyboard-instruction panel on coarse-pointer/mobile layouts while leaving it available on desktop.
- Prevent horizontal modal scrolling while retaining vertical overflow as a fallback for unusually short screens.

## Canvas accessibility design

- Expose the canvas as an image with a concise accessible name describing the interactive Tetris board.
- Replace the false browser-support fallback with useful alternative text.
- Keep score announcements and named controls intact.

## Verification

- Extend the dependency-free structural checks with regression assertions for the global smooth-scroll rule and canvas semantics.
- Run the structural test once before implementation and confirm it fails for the intended reasons.
- Implement the minimal HTML/CSS/JavaScript changes, then run the full structural and JavaScript syntax checks.
- Browser-test wheel scrolling, anchor scrolling, modal focus/close behavior, and Tetris geometry at 1280x720, 390x844, and 320x700.
- Confirm the working tree contains only intended changes before committing and pushing the existing PR branch.

## Out of scope

The Cloudflare HTTP-to-HTTPS redirect is an external edge-setting change and will not be bundled into this repository commit.
