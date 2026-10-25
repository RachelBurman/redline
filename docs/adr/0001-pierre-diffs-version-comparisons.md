# ADR 0001: Reject `@pierre/diffs` and retain an application-owned comparison renderer

- Status: Accepted
- Date: 2026-10-25
- Issue: [#8](https://github.com/RachelBurman/redline/issues/8)

## Context

Redline compares immutable document versions by stable block key. That application-owned model
classifies added, modified, removed, and unchanged blocks without changing document, proposal,
permission, or audit state. This spike evaluated whether `@pierre/diffs` could improve the
presentation of prose while remaining a replaceable renderer rather than a second source of truth.

The evaluation covered the React and SSR APIs, split and unified layouts, wrapping and word-level
changes, Shadow DOM accessibility, browser find and selection, initial and lazy bundle cost,
large-document behavior, licensing, release maturity, maintenance, and dependency security.

## Decision

Do not ship `@pierre/diffs`. The newest candidate whose dependency graph passed the repository's
unchanged pnpm trust policy, `1.2.11`, mounted its custom element in Chromium but left its diff body
empty at desktop and phone widths. There were no console errors or failed requests. A jsdom
component test rendered content, so that test alone would have produced a false-positive adoption
decision. Releases after `1.2.11`, including the current `1.6.1`, could not be evaluated for
adoption because installation failed with `ERR_PNPM_TRUST_DOWNGRADE` for `@pierre/theme`. Redline
does not weaken or exclude that check.

Redline instead lazy-loads a small application-owned presentation component. It uses the mature
BSD-3-Clause `diff@9.0.0` package only to calculate word changes from two local strings. Redline
owns all markup, version labels, reading order, layout, fallback behavior, and application state.

The selected approach:

- offers unified/stacked and split layouts as a local preference keyed by user ID;
- uses native `ins` and `del` elements, explicit Added/Removed text, and visible old/new version
  labels so meaning does not depend on colour;
- keeps all content in the light DOM with wrapped long words, stable old-then-new reading order,
  browser find, selection, printing, and normal keyboard navigation;
- renders unchanged, page-break, and unsupported blocks through the structured comparison;
- catches renderer failures and returns the structured block;
- lets users select the structured comparison at any time; and
- automatically selects the structured comparison above 200 changed blocks or 500,000 changed
  characters, while individual blocks above 50,000 old/new characters also fall back, to keep very
  large comparisons responsive without virtualization.

No comparison code can edit content or persist annotations, accept/reject actions, merges, or
selection state. Those decisions remain in Redline's review and audit model. No unpublished text is
sent to Pierre, `diff`, or any other service; tokenisation and rendering run in the browser.

## Evaluation

| Criterion                        | Existing structured view                 | `@pierre/diffs` spike                                                                       | Selected word-level view                                                                     |
| -------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Prose changes                    | Whole-block old/new cards                | Word changes documented upstream, but the safe candidate rendered an empty body in Chromium | Wrapped word changes in native markup                                                        |
| Layout                           | Stacked; modified cards split on desktop | Split and stacked options available                                                         | Per-user unified/stacked and split controls                                                  |
| Meaning without colour           | Explicit change labels                   | Would require application labels outside Shadow DOM                                         | Visible status, old/new labels, `ins`/`del`, and screen-reader Added/Removed text            |
| Screen reader and keyboard model | Named native articles and sections       | Content and semantics cross a Shadow DOM boundary; real-browser content was absent          | Named light-DOM articles and version regions in old-then-new order; no custom keyboard model |
| Mobile and wrapping              | Native cards wrap                        | `overflow: "wrap"` configured, but no real-browser rows rendered                            | Cards stack below the desktop breakpoint; whitespace and long words wrap                     |
| Find, selection, and print       | Preserved                                | Shadow content and print behavior add integration risk                                      | Preserved in the light DOM; canonical exports still use application data                     |
| State ownership                  | Redline comparison model                 | Could be presentation-only                                                                  | Redline remains canonical; `diff` returns transient string segments only                     |
| Failure behavior                 | Always available                         | Custom element could mount empty without throwing                                           | Unsupported inputs and caught render failures use the structured view                        |

The selected markup adds no animation, so reduced-motion settings require no special override.
Change text uses the same contrast-tested foreground as the surrounding view; background colour is
supplementary rather than the only signal.

### SSR and hydration

Pierre documents server preload utilities, but adopting them would initialize syntax-highlighting
work on the server and require exact input and option parity during hydration. Redline fetches this
permission-scoped comparison inside the authenticated client workspace. Both the Pierre prototype
and the selected renderer therefore used a lazy client boundary guarded by Redline's hydration
snapshot, with the deterministic structured view as the server-renderable path. This avoids a
hydration race and keeps word-diff code out of the initial document route.

### Bundle measurement

Production Vite builds were measured on 2026-10-25:

| Asset                        |              Before spike |           Pierre candidate |         Selected renderer |               Selected change |
| ---------------------------- | ------------------------: | -------------------------: | ------------------------: | ----------------------------: |
| Authenticated document route | 146.75 kB / 40.94 kB gzip |  149.95 kB / 41.93 kB gzip | 150.51 kB / 42.21 kB gzip |      +3.76 kB / +1.27 kB gzip |
| Lazy comparison chunk        |                       n/a | 417.74 kB / 119.16 kB gzip |   12.31 kB / 4.55 kB gzip | Loaded after comparison opens |
| Separate theme chunk         |                       n/a |    30.52 kB / 4.72 kB gzip |                       n/a |     No renderer theme payload |

The Pierre build also emitted Shiki language and theme assets unrelated to prose. The selected
renderer has no syntax highlighter or theme payload, and the comparison remains a separate lazy
chunk. The 4.55 kB gzip selected chunk is 96% smaller than the 119.16 kB gzip Pierre candidate.

The automated performance fixture maps a 5,000-block manuscript three times in under 1,000 ms.
Word-level rendering is limited to 200 changed blocks, 500,000 changed characters in one comparison,
and 50,000 old/new characters in one block. Larger inputs use the non-virtualized structured view so
browser find, text selection, and assistive-technology reading order remain intact. Desktop and
phone end-to-end fixtures verify wrapping without horizontal document overflow.

## Dependency assessment

`@pierre/diffs` is Apache-2.0 and actively maintained, but licence and activity are insufficient
when the installable candidate does not render in the supported browser. The current release's
dependency provenance also fails Redline's unchanged package-manager trust check.

The selected `diff@9.0.0` package is BSD-3-Clause, was published on 2026-04-13, and is already used
transitively in the application toolchain. It is pinned as a direct runtime dependency so its use is
reviewable. The production dependency audit is required to report zero known vulnerabilities before
the pull request is opened.

## Consequences

Users receive the requested prose-friendly word changes and layout preference without the failed
custom-element integration, the 119 kB gzip renderer payload, Shiki assets, or a Shadow DOM
accessibility boundary. Redline owns a small amount of presentation code and must maintain its
markup and styles. A future Pierre release may be reconsidered only after its complete dependency
graph passes the unchanged trust policy and real Chromium tests demonstrate visible, accessible
content at desktop and mobile widths.
