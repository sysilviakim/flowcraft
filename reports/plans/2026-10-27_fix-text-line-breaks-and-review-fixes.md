# Status: DONE

# Fix line breaks in shape text, plus small verified bug fixes from a full-codebase review

(Saved from the approved plan on 2026-10-27.)

## Context

Reproduced in the running app (served from `.claude/launch.json` on port 8765): line breaks disappear whenever shape text is **rich** (bold/italic/colour/list). The inline editor has `white-space: pre-wrap`, so Chrome inserts a literal `\n` instead of `<br>` on Shift+Enter. Plain text survives (`htmlToPlainText` keeps the `\n`), but rich text is stored as e.g. `<b>Line two\nLine three</b>` and `parseHtmlToRuns` only breaks lines on `<br>`, so the SVG collapses the newline to a space. The same thing happens when a newline is typed into the properties-panel Label textarea for a rich shape. Three read-only review passes over all modules found further bugs; the small, safe ones are folded in here, the larger ones are listed as follow-ups and not done in this plan.

## Objective

1. A line break typed anywhere (inline editor via Shift+Enter, Label textarea) renders as a line break for both plain and rich text, and previously saved diagrams with a raw `\n` inside rich HTML render correctly.
2. The Label textarea never overwrites a newer inline edit and never corrupts rich text.
3. Container / swimlane / milestone headers never show literal `<b>` tags.
4. Five small review findings fixed: stable group ids for undo/redo, delete-undo restores z-order and container membership, stale selection after undo/new, no-op resize/rotate clicks don't pollute history, export reports oversize instead of throwing.

## Files affected

- `js/utils.js` (RichText: `sanitizeHtml`, `parseHtmlToRuns`)
- `js/ui.js` (Label textarea at ~937, `shape:changed` listener at ~36, shortcuts dialog at ~2160)
- `js/tools.js` (`startInlineEdit` finish at ~1650, `init` subscriptions, resize/rotate mouseup at ~1104-1131, `startLaneEdit` finish at ~1738)
- `js/history.js` (`GroupCommand`, `UngroupCommand`, `RemoveShapeCommand`)
- `js/model.js` (`addGroup` optional id, `addShape` optional index)
- `js/export.js` (three `toBlob` callbacks)

## Ordered steps

### A. Line breaks (the reported bug)

1. `utils.js` `sanitizeHtml`: after `cleanNode`, walk text nodes and replace each `\n` with a `<br>` element so stored rich HTML never contains raw newlines. In the `div, p` unwrap loop, skip inserting a `<br>` when `el.previousSibling` is a `UL`/`OL` (a list already ends its line; today this yields a blank line after every list, seen in the test).
2. `utils.js` `parseHtmlToRuns`: in the text-node branch, split on `\n` and push a new line per segment. This renders diagrams already saved with raw `\n` in rich text (localStorage autosave and `.json` files).
3. `ui.js` Label textarea: on `change`, compute `newText = Utils.RichText.isRichText(v) ? Utils.RichText.normalizeText(v, shape.textStyle.color) : v`; return early if `newText === (shape.text || '')`. Give the textarea `dataset.shapeId`; in the existing `diagram.on('shape:changed')` listener, if the changed shape's id matches and the textarea is not `document.activeElement`, set its value to `shape.text`. Fixes the stale-overwrite bug (panel showed "" after the inline edit in the test).
4. `tools.js` `startInlineEdit` finish: when `def.customText`, store `Utils.RichText.htmlToPlainText(newText)` instead of HTML (those shapes render titles with `escapeText`, so HTML shows as literal tags).
5. `ui.js` shortcuts dialog: add rows "Line break (while editing) — Shift+Enter" and "Finish editing — Enter / Esc". Enter-to-commit stays as is.

### B. Small safe fixes from the review

6. Stable group ids: `GroupCommand` creates `this.groupId = Utils.uid('grp')` in its constructor; `Model.addGroup(shapeIds, name, id)` honours a supplied id; `UngroupCommand.undo` re-adds with `this.group.id` and `execute` always removes `this.group.id` (drop `regroupId`). This is the "redo for ungroup still broken" commit.
7. `RemoveShapeCommand`: in `execute` record `this.index = diagram.shapes.indexOf(shape)` and `this.childIds = diagram.getChildrenOfContainer(id).map(c => c.id)`; `undo` re-inserts at `index` (add optional `index` param to `addShape`, splice instead of push) and re-sets `containerId` on surviving children.
8. `tools.js` `init`: subscribe to `shape:removed`, `diagram:cleared`, `diagram:loaded` and re-resolve `selectedShapes` by id (`diagram.getShape(s.id)`), dropping the connector if gone, then refresh handles and call `onSelectionChanged`. Prevents Delete after Undo resurrecting a shape.
9. `tools.js` mouseup: skip `History.record` for resize/rotate when final bounds equal `_startBounds`. `startLaneEdit` finish: snapshot lanes before edit and go through `History.execute(new History.ChangeShapeDataCommand(...))` instead of a direct `updateShapeDeep`.
10. `export.js`: in each `toBlob` callback, `if (!blob) { alert('Diagram is too large to export at this scale.'); return; }`.

### Not in this plan (follow-ups, each a task of its own)

- Rich text stored from files/Label is parsed as live HTML (`innerHTML` on a detached div still fires `<img onerror>`); fix by parsing through `<template>` and sanitising in `normalizeShape`. Lane colours / font family are also interpolated unescaped into SVG attributes.
- Rotation is ignored by ports, hit-testing, selection handles and export bounds.
- Rich text does not word-wrap while plain text does.
- `MoveShapeCommand._moveChildren` double-moves a selected child of a selected container (arrow keys, undo of a drag).
- User waypoints are discarded by `updateConnectorsForShape` on any endpoint move.
- Drags released outside the SVG never end; auto-pan keeps running. Shortcuts fire behind modals; `spaceHeld` sticks after Alt+Tab.
- Export font weights: `'300'` string vs number compare; bold runs never embedded.

## Verification

Run in the browser pane against `http://localhost:8765` (server already in `.claude/launch.json`), driving the app with the exposed globals (`Tools.handlePaletteDrop`, `Tools.startInlineEdit`, `History`, `Renderer`):

1. Plain shape: type `a`, Shift+Enter, `b`, Enter → `shape.text === "a\nb"`, two tspans.
2. Bold shape: `execCommand('bold')`, Ctrl+End, Shift+Enter, `c`, Enter → stored HTML contains `<br>` and no raw `\n`; three tspans on separate lines.
3. Pre-existing text `<b>x\ny</b>` set via `ChangeTextCommand` → renders as two lines.
4. List: toggle bullets, Enter, Enter to exit, type → no blank line between list and paragraph.
5. Label textarea on a rich shape: append `\nnew` → `<br>new` stored; after an inline edit the textarea shows the new text without reselecting.
6. Container header: Ctrl+B then type → header shows plain title, no tags.
7. Undo/redo: group, ungroup, Ctrl+Z ×2, Ctrl+Y ×2 → `diagram.groups` has exactly one group after the first redo and none after the second; shapes' `groupId` consistent. Delete a sent-to-back shape, undo → it is still at index 0 and children keep `containerId`.
8. Paste, Ctrl+Z, Delete → no command recorded, Ctrl+Z does not re-add. Single click on a resize handle, Ctrl+Z → previous real action undone.
9. No console errors in any of the above; `git diff` reviewed for 80-col and style.

Checks that cannot run here: export oversize path (needs a >268 M-pixel canvas); I will unit-check the guard by stubbing `toBlob` to pass `null`.

Estimated effort: A ≈ 45 min, B ≈ 1.5 h, verification ≈ 30 min.

## Verification results (2026-10-27)

All checks ran in the built-in browser against `http://localhost:8765` after refetching the scripts with `cache: 'reload'` (python's static server lets the browser cache the old JS, which produced one false "still broken" run).

| Check | Result |
|-------|--------|
| 1. Plain Shift+Enter | PASS: `"a
b"`, two tspans |
| 2. Bold + Shift+Enter | PASS: `<b>a<br>b<br>c</b>`, no raw newline, three tspans |
| 3. Saved `<b>x
y</b>` | PASS: renders as two lines |
| 4. List then paragraph | PASS: no blank line between list and "after" |
| 5. Label textarea | PASS: shows inline edits without reselecting; appended newline stored as `<br>` |
| 6. Container header + bold | PASS: stored and drawn as plain "Sales" |
| 7. Group/ungroup undo/redo | PASS: groups 0→1→0→1→0→1→0, member ids consistent; delete + undo restores model index and DOM order; child `containerId` restored |
| 8. Paste, undo, Delete | PASS: nothing recorded, redo stack intact, shape not resurrected |
| 9. Console errors | none |
| 10. Export null blob | PASS via stubbed `toBlob(null)`: alert shown, no exception |

Not verified by running: lane rename through `ChangeShapeDataCommand` (swimlane edit is only reachable by double-click; checked by reading), and no-op resize-handle click (needs a real pointer on a handle; `boundsEqual` guard checked by reading).

## Deviations

- Steps 6–7 were proposed as a separate session but it was not started, so they were done here.
- Skipped pruning deleted ids from `groups[].shapeIds` in `removeShape` (reviewer finding 7): undoing a delete would then need group-membership restore too; left for a follow-up.
- `Model.addShape` emits `shape:reordered` on an indexed insert so the renderer matches model order (the renderer appends on `shape:added`).
- Shortcut label shortened to "Line break (editing)" to keep the line under 80 columns.
