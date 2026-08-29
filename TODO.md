# Redline product to-do list

This list records the next product slices after the first version-safe review workflow. Each
item should be delivered incrementally with versioned APIs, organisation-scoped permissions,
audit events where appropriate, and automated tests.

## Completed

- [x] Upload and parse `.docx` headings and paragraphs.
- [x] Create, accept, and reject paragraph replacements.
- [x] Create, accept, and reject clean paragraph deletions.
- [x] Propose paragraphs at the end of the document, including after all resolved content is
      deleted.
- [x] Export resolved `.docx` files and auditable review-queue CSV reports.
- [x] Explicit immutable versions, history, restore, download, and block-based comparison.
- [x] Version-bound participant presence and concurrency-safe review decisions.

## Next product slices

1. [ ] Add threaded discussions to review items.
   - [x] Create validated, attributable top-level comments through an organisation-scoped,
         versioned API and audit comment creation.
   - [ ] Display comment history with author attribution and timestamps.
   - [ ] Create replies and refresh discussions for concurrent reviewers.
2. [ ] Add review-queue filters and sorting.
   - Filter by reviewer, category, status, section, and priority.
   - Preserve an accessible table and keyboard workflow.
3. [ ] Add reviewer invitations and review-round assignments.
4. [ ] Allow paragraph additions between existing document blocks, with immutable
       before/after anchors.
5. [ ] Build a composable accessible modal/dialog system from scratch.
   - Use native dialog semantics where practical, with focus trapping and restoration,
     Escape/backdrop handling, scroll management, accessible labels, and reduced-motion
     behavior.
   - Use it only where a modal interruption is appropriate, such as destructive confirmations
     or focused comparison settings; keep routine review processing inline.
   - Add keyboard and accessibility-focused component tests.
6. [ ] Evaluate and integrate [`@pierre/diffs`](https://diffs.com/) for document-version
       comparison.
   - Prototype split and unified prose comparisons with word-level inline changes.
   - Confirm screen-reader semantics, keyboard behavior, wrapping, theming, Shadow DOM
     integration, bundle cost, and performance on long documents.
   - Preserve the existing structured block comparison as a fallback until the prototype meets
     accessibility and document-review requirements.
   - Keep accept/reject decisions in Redline's review engine and audit model rather than making
     the rendering library a source of truth.
7. [ ] Add image and graph blocks with safe upload, preview, versioning, and export behavior.
8. [ ] Improve collaboration updates beyond polling where they materially improve proposal and
       discussion workflows; do not turn this phase into unrestricted real-time word processing.
