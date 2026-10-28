# Fix pointer capture, waypoint loss, and double move

**Status:** DONE

## Objective

Fix three interaction bugs from the 2026-10-27 review: (a) a drag released outside the SVG left drag state and the auto-pan loop running; (b) moving an endpoint shape rebuilt `conn.points` and discarded user-inserted waypoints; (c) a selected child inside a selected container moved twice on arrow keys, align and distribute.

## Files affected

- `js/tools.js`: window-level mousemove/mouseup during a press, blur fallback, `manualRoute` flag on waypoint drags, exclude sets for container child moves (arrow keys, align, distribute, drag).
- `js/connectors.js`: `routeConnector` keeps interior points for `manualRoute` connectors and refreshes only the endpoints.
- `js/history.js`: `MoveShapeCommand` takes an `excludeIds` set that `_moveChildren` skips.

## Ordered steps

1. Replace the SVG mousemove/mouseup listeners with window listeners attached on mousedown and removed on mouseup; keep an SVG mousemove for hover only; add a window blur fallback; call `stopAutoPan()` on every release.
2. Mark a connector `manualRoute: true` when a waypoint is inserted or dragged, record the flag in the `ChangeConnectorCommand`, and make `routeConnector` honor it.
3. Add `excludeIds` to `MoveShapeCommand`; pass the selected ids from the arrow-key loop, `alignShapes` and `distributeShapes`; pass selected plus recorded child ids from the drag path.
4. Verify in the browser.

## Deviation from the brief

The brief offered "only recompute endpoints when `points.length > 2`". Auto-routed orthogonal connectors already have more than two points, so that rule would have frozen every step connector after the first move. A per-connector `manualRoute` flag was used instead. Connector routing type changes in `js/ui.js` (out of scope) do not clear the flag, so switching Step to Straight keeps the user's waypoints.

## Verification (scripted and real-mouse, served from port 8765)

- Shape drag to the auto-pan zone, released over the palette: move recorded, pan stops within one frame, hover moves do not move the shape, undo restores. PASS (scripted and real pointer drag).
- Marquee, pan tool, resize, rotate, connector tool, waypoint drag: each released over the palette ends cleanly with no stuck state. PASS.
- Connector tool released off-canvas creates no dangling connector. PASS.
- Window blur mid-drag ends the drag at the last pointer position. PASS.
- Inserted waypoint survives ArrowDown on the source shape; undo of the nudge and of the insertion restore points and `manualRoute`; redo restores them. PASS.
- Container plus child selected, ArrowRight: both move one grid step (40), undo and redo exact. Align left with both selected: child aligns once. Container alone: child follows. PASS.
- No console errors from the new code. Two `ERR_CONNECTION_RESET` entries came from the shared static server during page loads, before any test ran.
- Not verified: touch or pointer events (the app binds mouse events only), and a release outside the browser window on a real OS pointer.
