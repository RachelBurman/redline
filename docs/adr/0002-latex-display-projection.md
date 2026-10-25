# ADR 0002: LaTeX is a per-user projection of canonical blocks

## Status

Accepted

## Context

Redline's source of truth is an immutable, ordered block model. Review items target an exact
version, block ID, content hash, and UTF-16 selection anchor. Making LaTeX a second stored document
would split that source of truth, make proposals mode-dependent, and allow two viewers to disagree
about the content under review.

LaTeX is also a programming language with file, network, macro, and process-adjacent capabilities
in common engines. Redline must not run untrusted TeX or treat a browser-rendered result as
canonical content.

## Decision

Normal, LaTeX source, and rendered LaTeX are presentation modes over the same `DocumentDetail`
blocks. The mode is stored in browser local storage under a user-ID-scoped key. It is deliberately
absent from document, version, block, proposal, export, and audit records. A browser or device can
therefore remember a user's choice without changing another user or any immutable digest.

The source view projects one canonical block at a time. A source edit is parsed to canonical plain
paragraph text before it opens the existing replacement-proposal form. Submission uses the same
version ID, round ID, block ID, content hash validation, immutable anchor, decision path, audit
event, version materialisation, and DOCX export code as normal view. LaTeX source is never stored as
an alternative manuscript.

The rendered view is a local React presentation. React creates text nodes; Redline does not inject
HTML and does not invoke a TeX compiler. Inline text delimited by dollar signs receives a
keyboard-focusable `math` role and an explicit text alternative. The original canonical text
remains the review and export value.

## Supported subset

| Content                               | Source projection                                    | Source editing                                | Rendered presentation                                         |
| ------------------------------------- | ---------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------- |
| Paragraph text                        | Exact escaped text                                   | Yes; deterministic lossless parse             | Semantic paragraph                                            |
| Line breaks                           | `\\`                                                 | Yes                                           | Preserved canonical whitespace                                |
| Headings 1–6                          | Section command selected by level                    | Read-only                                     | Semantic `h1`–`h6`                                            |
| LaTeX special characters              | `\# \$ \% \& \_ \{ \}` and named text escapes        | Yes                                           | Original canonical characters                                 |
| Inline `$…$` mathematical text        | Dollar signs escaped because the source is canonical | No executable math syntax; display-only       | Focusable math text with an accessible expression label       |
| List items already in the block model | `\item` projection                                   | Read-only                                     | Canonical block content                                       |
| Page breaks                           | `\newpage` projection                                | Read-only                                     | Canonical block boundary                                      |
| Tables, rows, cells, and images       | Explicit `REDLINE_UNSUPPORTED` verbatim placeholder  | Read-only                                     | Existing explicit unsupported-content presentation            |
| Emphasis, references, and citations   | Preserved as canonical text when present             | No LaTeX macro interpretation in this release | Literal, safe text; no invented resolution or silent deletion |

The editable grammar is intentionally smaller than TeX: text plus the documented character and
line-break escapes. Any other control sequence, unescaped brace, or comment marker is rejected with
an actionable message naming the command or character. Unsupported canonical block content is
shown read-only and retained exactly; it is never discarded.

## Parsing boundary and round-trip guarantee

For every non-empty canonical paragraph `p` within the review size limit:

`parse(project(p)) = p`

Projection order is canonical block order and the same input always produces the same source.
Tests exercise reserved characters, backslashes, Unicode, and generated combinations. The
guarantee is semantic and canonical, not byte-for-byte preservation of arbitrary user-authored TeX
formatting. Headings and non-paragraph structures are display projections until Redline supports
anchored proposals for those block types.

## Security boundary

The source parser is bounded before scanning and has no filesystem, process, network, HTML, or TeX
engine dependency. Commands such as `\input`, `\include`, `\includegraphics`, `\write18`,
`\href`, `\html`, `\newcommand`, and every other non-subset command are rejected by the same
allow-list rule. Unknown environments cannot enter the editable grammar. Rendered content is placed
in React text nodes, so markup-like manuscript text cannot create scripts or event handlers.

## Consequences

- Two users can view the same version in different modes while proposals and statuses remain shared.
- Display preference changes produce no audit event and cannot affect a document/version hash.
- Existing normal viewing and DOCX export paths are unchanged.
- This release does not claim full TeX compatibility, package support, arbitrary macros, server-side
  compilation, rich emphasis round-tripping, citation resolution, image loading, or editable tables.
  Adding those features requires extending the canonical model first, followed by a new ADR and
  migrations—not relaxing this parser around a parallel LaTeX source of truth.
