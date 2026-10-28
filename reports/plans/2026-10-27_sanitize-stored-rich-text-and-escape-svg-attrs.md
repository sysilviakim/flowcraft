# Status: DONE

# Make stored rich text safe to render (inert parsing, load-time sanitising, SVG attribute escaping)

(Task handed over from the parent session on 2026-10-27; the user handles git, so nothing here is committed.)

## Objective

1. Every `Utils.RichText` helper parses HTML in an inert document (`<template>` contents), so `<img onerror>` and `<script>` in untrusted HTML never execute, while serialised output for already-clean input stays byte-identical.
2. `Diagram.fromJSON` sanitises rich shape text and rich connector labels on load, so a hostile `.json` file or autosave is stored as clean HTML (`<b>x</b>` for the attack case).
3. Custom shape renders in `js/shapes.js` escape every attribute value that comes from user data (lane colours and fills, text colours, font family/weight/style/decoration, header stroke, container background), so a crafted colour string cannot break out of the attribute and inject SVG elements.

## Files affected

- `js/utils.js` — `RichText`: new private `parseInert`; `htmlToPlainText`, `sanitizeHtml`, `newlinesToBr`, `parseHtmlToRuns`, `stripDefaultColorSpans` switch to it.
- `js/model.js` — new `sanitizeRich` helper used by `normalizeShape` (text) and `normalizeConnector` (label.text), guarded for `Utils` being undefined.
- `js/shapes.js` — new `escapeAttr`; applied in the business swim-lane, timeline, milestone, container, swimlane-h and swimlane-v renders.

## Ordered steps

1. Add `parseInert(html)` to `RichText` and route the five parsing sites through it; element creation inside `sanitizeHtml`/`newlinesToBr` uses the inert document so re-parsed inner HTML never touches the live document.
2. Add `sanitizeRich` to `js/model.js` and call it from `normalizeShape` and `normalizeConnector`.
3. Add `escapeAttr` to `js/shapes.js`; wrap the user-derived locals (`ff`, `fw`, `fst`, `td`, `tc`, lane colour/fill/textColor, `bgFill`, `laneFill`, header stroke, container `bg`, timeline `strokeColor`, milestone `fill`/colour) and coerce font sizes with `Number()`.
4. Serve the folder with the `flowcraft-static` launch entry, refetch the three JS files with `cache: 'reload'`, load a hostile diagram via `Diagram.fromJSON` and confirm `window.__pwned` stays undefined and stored text is `<b>x</b>`; confirm existing rich text (bold, list, colour, `<br>`) still serialises and renders unchanged.

## How it will be verified

- Browser console: `window.__pwned === undefined` after loading the hostile JSON; the swim-lane `<g>` contains no `<image>`; stored shape text equals `<b>x</b>`.
- Round-trip check: `sanitizeHtml`, `parseHtmlToRuns`, `htmlToPlainText` on a fixture with bold, italic, underline, coloured span, `<br>` and `<ul>` give the same results as before the change (compared against the pre-change implementation evaluated inline).
- `node --check` on the three files; added lines ≤ 80 chars.
- Not covered: visual diff of every custom shape; other sessions are editing `js/shapes.js` concurrently (port rotation), so a final `git diff` is re-read after editing.

## Verification results (2026-10-27, built-in browser on the shared port-8765 server)

- Hostile autosave loaded through `Diagram.fromJSON` (nine shapes covering the rectangle, business swim-lane, swimlane-h, swimlane-v, container, timeline line and milestone renders, plus one connector label; every colour/fill/font attribute set to `"/><image href="x" onerror="window.__pwned=N"/><rect fill="`): `window.__pwned` stayed undefined; the canvas SVG contained 0 `<image>` and 0 `<script>` elements; the hostile strings appeared only as literal attribute values (22 fill, 16 stroke, 4 font-family attributes).
- Stored text after load: shape `<b>x</b><img src=x onerror=…>` → `<b>x</b>`; connector label `<b>lbl</b><img …>` → `<b>lbl</b>`; `<b>a</b><script>…</script><x><img onerror…></x><b onmouseover=…>c</b>` → `<b>a</b><b>c</b>`.
- Existing rich text fixture (bold, italic, underline, coloured span, `<br>`, `<ul>`) is a fixed point of `sanitizeHtml`, parses to the expected runs/lines, renders as tspans with the red span coloured, and `htmlToPlainText` gives `Bold it u red\nline2\n• a\n• b`; `normalizeText` still strips the default-colour span.
- Direct `sanitizeHtml` on `<svg><image onerror>` and nested `<x><y><img onerror></y></x>` returns clean HTML and never sets `window.__pwned` (the live-document parse would have).
- `node --check` passes on all three files. No console errors.

## Deviations

- Two pre-existing sanitiser gaps found while testing and fixed in `cleanNode`: unwrapped children were never re-scanned (so `<x><img onerror></x>` survived), and allowed tags kept all attributes (so `<b onmouseover>` survived). `<script>`/`<style>`/`<template>` are now dropped with their contents instead of leaking their text.
- Lines I touched in `js/shapes.js` that were already far over 80 chars (the long `<text …>` template literals) were shortened but not brought under 80; only new lines respect the limit.
- Not verified: a visual screenshot (the browser pane was hidden and screenshots timed out); verification is DOM/state-based. The real file-open dialog path (`loadFromFile`) was not exercised, but it calls the same `fromJSON`.
