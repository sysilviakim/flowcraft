// FlowCraft - Tool System & Interactions
//
// Copyright (C) 2026 Silvia Kim
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published
// by the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

const Tools = (() => {
  let activeTool = null;
  let diagram, containerEl;
  let selectedShapes = [];
  let selectedConnector = null;
  let clipboard = [];
  let spaceHeld = false;
  let onSelectionChanged = null;
  let onToolChanged = null;

  function init(diag, container) {
    diagram = diag;
    containerEl = container;
    setupEvents();
    setTool('select');
  }

  function setOnSelectionChanged(fn) { onSelectionChanged = fn; }
  function setOnToolChanged(fn) { onToolChanged = fn; }

  function getSelectedShapes() { return selectedShapes; }
  function getSelectedConnector() { return selectedConnector; }

  function setSelection(shapes, connector) {
    selectedShapes = shapes || [];
    selectedConnector = connector || null;
    if (selectedShapes.length > 0) {
      Renderer.showSelectionHandles(selectedShapes);
      Renderer.clearWaypointHandles();
    } else {
      Renderer.clearSelectionHandles();
    }
    if (selectedConnector) {
      Renderer.showWaypointHandles(selectedConnector);
    } else {
      Renderer.clearWaypointHandles();
    }
    if (onSelectionChanged) onSelectionChanged(selectedShapes, selectedConnector);
  }

  function clearSelection() {
    setSelection([], null);
  }

  // --- Tool management ---
  const tools = {};
  let currentToolName = 'select';

  function setTool(name) {
    if (activeTool && activeTool.deactivate) activeTool.deactivate();
    currentToolName = name;
    activeTool = tools[name] || tools.select;
    if (activeTool.activate) activeTool.activate();
    if (onToolChanged) onToolChanged(name);
  }

  function getTool() { return currentToolName; }

  // --- Event setup ---
  function setupEvents() {
    const svgEl = Renderer.getSvg();

    svgEl.addEventListener('mousedown', e => {
      if (spaceHeld) {
        tools.pan.onMouseDown(e);
        return;
      }
      if (activeTool && activeTool.onMouseDown) activeTool.onMouseDown(e);
    });

    svgEl.addEventListener('mousemove', e => {
      if (spaceHeld && tools.pan._panning) {
        tools.pan.onMouseMove(e);
        return;
      }
      if (activeTool && activeTool.onMouseMove) activeTool.onMouseMove(e);
    });

    svgEl.addEventListener('mouseup', e => {
      if (tools.pan._panning) {
        tools.pan.onMouseUp(e);
        return;
      }
      if (activeTool && activeTool.onMouseUp) activeTool.onMouseUp(e);
    });

    svgEl.addEventListener('wheel', e => {
      e.preventDefault();
      const rect = containerEl.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Renderer.getZoom() * delta;
      Renderer.setZoom(newZoom, cx, cy);
      if (onToolChanged) onToolChanged(currentToolName); // update zoom display
    }, { passive: false });

    svgEl.addEventListener('dblclick', e => {
      if (activeTool && activeTool.onDoubleClick) activeTool.onDoubleClick(e);
    });

    document.addEventListener('keydown', e => {
      if (e.code === 'Space' && !e.repeat) {
        spaceHeld = true;
        containerEl.style.cursor = 'grab';
      }
      if (activeTool && activeTool.onKeyDown) activeTool.onKeyDown(e);
      handleGlobalKeys(e);
    });

    document.addEventListener('keyup', e => {
      if (e.code === 'Space') {
        spaceHeld = false;
        containerEl.style.cursor = '';
      }
      if (activeTool && activeTool.onKeyUp) activeTool.onKeyUp(e);
    });

    // Context menu
    svgEl.addEventListener('contextmenu', e => {
      e.preventDefault();
      showContextMenu(e);
    });
  }

  function getCanvasPos(e) {
    const rect = containerEl.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    return Renderer.screenToCanvas(sx, sy);
  }

  // ===== AUTO-PAN NEAR EDGES =====
  const AUTO_PAN_ZONE = 40;  // px from edge
  const AUTO_PAN_SPEED = 4;  // px per frame
  let _autoPanRAF = null;
  let _lastMouseClientX = 0, _lastMouseClientY = 0;

  function startAutoPan() {
    if (_autoPanRAF) return;
    function tick() {
      const rect = containerEl.getBoundingClientRect();
      const mx = _lastMouseClientX - rect.left;
      const my = _lastMouseClientY - rect.top;
      let dx = 0, dy = 0;
      if (mx < AUTO_PAN_ZONE) dx = AUTO_PAN_SPEED;
      else if (mx > rect.width - AUTO_PAN_ZONE) dx = -AUTO_PAN_SPEED;
      if (my < AUTO_PAN_ZONE) dy = AUTO_PAN_SPEED;
      else if (my > rect.height - AUTO_PAN_ZONE) dy = -AUTO_PAN_SPEED;
      if (dx !== 0 || dy !== 0) {
        const pan = Renderer.getPan();
        Renderer.setPan(pan.x + dx, pan.y + dy);
      }
      _autoPanRAF = requestAnimationFrame(tick);
    }
    _autoPanRAF = requestAnimationFrame(tick);
  }

  function stopAutoPan() {
    if (_autoPanRAF) {
      cancelAnimationFrame(_autoPanRAF);
      _autoPanRAF = null;
    }
  }

  // ===== SELECT TOOL =====
  tools.select = {
    _dragging: false,
    _resizing: false,
    _rotating: false,
    _marquee: false,
    _autoConnect: false,       // auto-suggest line dragging
    _autoConnectSource: null,  // { shape, port }
    _waypointDrag: false,      // dragging connector waypoint
    _waypointConnId: null,
    _waypointIdx: null,
    _waypointStartPoints: null,
    _labelDrag: false,         // dragging connector label
    _labelConnId: null,
    _startPos: null,
    _dragOffsets: null,
    _resizeHandle: null,
    _startBounds: null,
    _hoveredShape: null,

    activate() { containerEl.style.cursor = 'default'; },
    deactivate() {
      Renderer.clearPorts();
      this._hoveredShape = null;
    },

    onMouseDown(e) {
      if (e.button !== 0) return;
      const pos = getCanvasPos(e);

      // Check if clicking a port indicator (auto-suggest line)
      const portEl = e.target.closest('[data-port-id]');
      if (portEl) {
        const portId = portEl.getAttribute('data-port-id');
        const shapeId = portEl.getAttribute('data-shape-id');
        const shape = diagram.getShape(shapeId);
        if (shape) {
          const def = Shapes.get(shape.type);
          const ports = def.ports || Shapes.stdPorts();
          const port = ports.find(p => p.id === portId);
          if (port) {
            this._autoConnect = true;
            this._autoConnectSource = { shape, port };
            Renderer.clearPorts();
            Renderer.clearSelectionHandles();
            containerEl.style.cursor = 'crosshair';
            return;
          }
        }
      }

      // Check if clicking a waypoint handle
      const waypointEl = e.target.closest('[data-waypoint-idx]');
      if (waypointEl) {
        const idx = parseInt(waypointEl.getAttribute('data-waypoint-idx'));
        const connId = waypointEl.getAttribute('data-connector-id');
        const conn = diagram.getConnector(connId);
        if (conn) {
          this._waypointDrag = true;
          this._waypointConnId = connId;
          this._waypointIdx = idx;
          this._waypointStartPoints = conn.points.map(p => ({ ...p }));
          this._startPos = pos;
          return;
        }
      }

      // Check if clicking a midpoint handle (add waypoint)
      const midpointEl = e.target.closest('[data-midpoint-idx]');
      if (midpointEl) {
        const segIdx = parseInt(midpointEl.getAttribute('data-midpoint-idx'));
        const connId = midpointEl.getAttribute('data-connector-id');
        const conn = diagram.getConnector(connId);
        if (conn && conn.points) {
          const mx = (conn.points[segIdx].x + conn.points[segIdx + 1].x) / 2;
          const my = (conn.points[segIdx].y + conn.points[segIdx + 1].y) / 2;
          conn.points.splice(segIdx + 1, 0, { x: mx, y: my });
          diagram.updateConnector(connId, { points: [...conn.points] });
          // Start dragging the new waypoint
          this._waypointDrag = true;
          this._waypointConnId = connId;
          this._waypointIdx = segIdx + 1;
          this._waypointStartPoints = conn.points.map(p => ({ ...p }));
          this._startPos = pos;
          return;
        }
      }

      // Check if clicking a connector label handle
      const labelEl = e.target.closest('[data-label-handle]');
      if (labelEl) {
        const connId = labelEl.getAttribute('data-connector-id');
        this._labelDrag = true;
        this._labelConnId = connId;
        this._startPos = pos;
        return;
      }

      // Check if clicking a resize handle
      const handleEl = e.target.closest('[data-handle]');
      if (handleEl) {
        const handle = handleEl.getAttribute('data-handle');
        const shapeId = handleEl.getAttribute('data-shape-id');
        const shape = diagram.getShape(shapeId);
        if (shape) {
          if (handle === 'rotate') {
            this._rotating = true;
            this._startPos = pos;
            this._startBounds = { x: shape.x, y: shape.y, width: shape.width, height: shape.height, rotation: shape.rotation || 0 };
            return;
          }
          this._resizing = true;
          this._resizeHandle = handle;
          this._startPos = pos;
          this._startBounds = { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
          return;
        }
      }

      // Check if clicking a shape
      const shape = Renderer.getShapeAt(pos.x, pos.y);
      if (shape) {
        Renderer.clearPorts();
        if (e.shiftKey) {
          // Toggle selection
          const idx = selectedShapes.findIndex(s => s.id === shape.id);
          if (idx >= 0) {
            selectedShapes.splice(idx, 1);
            setSelection([...selectedShapes], null);
          } else {
            setSelection([...selectedShapes, shape], null);
          }
        } else {
          if (!selectedShapes.find(s => s.id === shape.id)) {
            setSelection([shape], null);
          }
        }
        // Start drag
        this._dragging = true;
        this._startPos = pos;
        this._dragOffsets = selectedShapes.map(s => ({ id: s.id, ox: s.x - pos.x, oy: s.y - pos.y, startX: s.x, startY: s.y }));

        // Alt+drag: clone shapes and drag the clones
        if (e.altKey && selectedShapes.length > 0) {
          History.beginBatch();
          const newShapes = [];
          selectedShapes.forEach(s => {
            const clone = Utils.deepClone(s);
            clone.id = Utils.uid('shp');
            History.execute(new History.AddShapeCommand(clone));
            const ns = diagram.getShape(clone.id);
            if (ns) newShapes.push(ns);
          });
          History.endBatch('Clone shapes');
          selectedShapes = newShapes;
          selectedConnector = null;
          Renderer.showSelectionHandles(selectedShapes);
          if (onSelectionChanged) onSelectionChanged(selectedShapes, selectedConnector);
          this._dragOffsets = selectedShapes.map(s => ({ id: s.id, ox: s.x - pos.x, oy: s.y - pos.y, startX: s.x, startY: s.y }));
        }
        return;
      }

      // Check if clicking a connector
      const conn = Renderer.getConnectorAt(pos.x, pos.y);
      if (conn) {
        Renderer.clearPorts();
        setSelection([], conn);
        return;
      }

      // Nothing hit - start marquee
      Renderer.clearPorts();
      if (!e.shiftKey) {
        clearSelection();
      }
      this._marquee = true;
      this._startPos = pos;
    },

    onMouseMove(e) {
      _lastMouseClientX = e.clientX;
      _lastMouseClientY = e.clientY;
      const pos = getCanvasPos(e);

      // Auto-connect line dragging
      if (this._autoConnect && this._autoConnectSource) {
        const srcPos = Shapes.getPortPosition(this._autoConnectSource.shape, this._autoConnectSource.port);
        Renderer.showConnectorPreview([srcPos, pos]);

        // Show ports on target shape
        const shape = Renderer.getShapeAt(pos.x, pos.y);
        if (shape && shape.id !== this._autoConnectSource.shape.id) {
          Renderer.showPorts(shape, false);
        } else {
          Renderer.clearPorts();
        }
        return;
      }

      // Waypoint dragging
      if (this._waypointDrag && this._waypointConnId) {
        const conn = diagram.getConnector(this._waypointConnId);
        if (conn && conn.points[this._waypointIdx]) {
          conn.points[this._waypointIdx].x = pos.x;
          conn.points[this._waypointIdx].y = pos.y;
          diagram.updateConnector(this._waypointConnId, { points: [...conn.points] });
          Renderer.showWaypointHandles(conn);
        }
        return;
      }

      // Label dragging
      if (this._labelDrag && this._labelConnId) {
        const conn = diagram.getConnector(this._labelConnId);
        if (conn && conn.points && conn.points.length >= 2) {
          let totalLen = 0;
          const segs = [];
          for (let i = 1; i < conn.points.length; i++) {
            const len = Utils.distance(conn.points[i - 1], conn.points[i]);
            segs.push({ from: conn.points[i - 1], to: conn.points[i], len });
            totalLen += len;
          }
          let bestDist = Infinity, bestT = 0.5, cumLen = 0;
          for (const seg of segs) {
            const sdx = seg.to.x - seg.from.x, sdy = seg.to.y - seg.from.y;
            const lenSq = sdx * sdx + sdy * sdy;
            let t = lenSq === 0 ? 0 : ((pos.x - seg.from.x) * sdx + (pos.y - seg.from.y) * sdy) / lenSq;
            t = Math.max(0, Math.min(1, t));
            const px = seg.from.x + t * sdx, py = seg.from.y + t * sdy;
            const dist = Utils.distance(pos, { x: px, y: py });
            if (dist < bestDist) {
              bestDist = dist;
              bestT = totalLen === 0 ? 0.5 : (cumLen + t * seg.len) / totalLen;
            }
            cumLen += seg.len;
          }
          diagram.updateConnector(this._labelConnId, { label: { text: conn.label.text, position: Math.max(0.05, Math.min(0.95, bestT)) } });
          Renderer.showWaypointHandles(conn);
        }
        return;
      }

      if (this._rotating && selectedShapes.length === 1) {
        const shape = selectedShapes[0];
        const cx = shape.x + shape.width / 2;
        const cy = shape.y + shape.height / 2;
        const angle = Math.atan2(pos.y - cy, pos.x - cx) * 180 / Math.PI + 90;
        const snapped = e.shiftKey ? Math.round(angle / 15) * 15 : angle;
        diagram.updateShape(shape.id, { rotation: snapped });
        Renderer.showSelectionHandles(selectedShapes);
        return;
      }

      if (this._resizing && selectedShapes.length === 1) {
        const shape = selectedShapes[0];
        const dx = pos.x - this._startPos.x;
        const dy = pos.y - this._startPos.y;
        const sb = this._startBounds;
        let newBounds = { x: sb.x, y: sb.y, width: sb.width, height: sb.height };

        const h = this._resizeHandle;
        if (h.includes('r')) { newBounds.width = Math.max(20, sb.width + dx); }
        if (h.includes('l')) { newBounds.x = sb.x + dx; newBounds.width = Math.max(20, sb.width - dx); }
        if (h.includes('b')) { newBounds.height = Math.max(20, sb.height + dy); }
        if (h.includes('t')) { newBounds.y = sb.y + dy; newBounds.height = Math.max(20, sb.height - dy); }

        if (diagram.settings.snapToGrid) {
          const gs = diagram.settings.gridSize;
          newBounds.x = Utils.snapToGrid(newBounds.x, gs);
          newBounds.y = Utils.snapToGrid(newBounds.y, gs);
          newBounds.width = Utils.snapToGrid(newBounds.width, gs);
          newBounds.height = Utils.snapToGrid(newBounds.height, gs);
          if (newBounds.width < gs) newBounds.width = gs;
          if (newBounds.height < gs) newBounds.height = gs;
        }

        diagram.updateShape(shape.id, newBounds);
        Connectors.updateConnectorsForShape(diagram, shape.id);
        Renderer.showSelectionHandles(selectedShapes);
        return;
      }

      if (this._dragging && selectedShapes.length > 0) {
        // Auto-pan when near edge
        const edgeRect = containerEl.getBoundingClientRect();
        const emx = e.clientX - edgeRect.left, emy = e.clientY - edgeRect.top;
        if (emx < AUTO_PAN_ZONE || emx > edgeRect.width - AUTO_PAN_ZONE ||
            emy < AUTO_PAN_ZONE || emy > edgeRect.height - AUTO_PAN_ZONE) {
          startAutoPan();
        } else {
          stopAutoPan();
        }

        const guides = [];
        const otherShapes = diagram.shapes.filter(s => !selectedShapes.find(sel => sel.id === s.id));
        const snapThreshold = 5;

        // Compute tentative positions for all selected shapes
        const tentative = selectedShapes.map((shape, i) => {
          const offset = this._dragOffsets[i];
          let nx = pos.x + offset.ox;
          let ny = pos.y + offset.oy;
          if (diagram.settings.snapToGrid) {
            const gs = diagram.settings.gridSize;
            nx = Utils.snapToGrid(nx, gs);
            ny = Utils.snapToGrid(ny, gs);
          }
          return { nx, ny, shape };
        });

        // Compute group bounding box from tentative positions
        let gx1 = Infinity, gy1 = Infinity, gx2 = -Infinity, gy2 = -Infinity;
        tentative.forEach(t => {
          gx1 = Math.min(gx1, t.nx);
          gy1 = Math.min(gy1, t.ny);
          gx2 = Math.max(gx2, t.nx + t.shape.width);
          gy2 = Math.max(gy2, t.ny + t.shape.height);
        });
        const gw = gx2 - gx1, gh = gy2 - gy1;

        // Reference points for the dragged group (left/center/right, top/center/bottom)
        const refXs = [gx1, gx1 + gw / 2, gx2];
        const refYs = [gy1, gy1 + gh / 2, gy2];

        // Collect target snap lines from other shapes
        const targetXs = new Set();
        const targetYs = new Set();
        otherShapes.forEach(o => {
          targetXs.add(o.x);
          targetXs.add(o.x + o.width / 2);
          targetXs.add(o.x + o.width);
          targetYs.add(o.y);
          targetYs.add(o.y + o.height / 2);
          targetYs.add(o.y + o.height);
        });

        // Find best X snap
        let bestDx = null, bestSnapX = null;
        for (const rx of refXs) {
          for (const tx of targetXs) {
            const d = Math.abs(rx - tx);
            if (d < snapThreshold && (bestDx === null || d < Math.abs(bestDx))) {
              bestDx = tx - rx;
              bestSnapX = tx;
            }
          }
        }

        // Find best Y snap
        let bestDy = null, bestSnapY = null;
        for (const ry of refYs) {
          for (const ty of targetYs) {
            const d = Math.abs(ry - ty);
            if (d < snapThreshold && (bestDy === null || d < Math.abs(bestDy))) {
              bestDy = ty - ry;
              bestSnapY = ty;
            }
          }
        }

        // Apply snap offset to all shapes
        const dx = bestDx || 0;
        const dy = bestDy || 0;

        tentative.forEach(t => {
          t.nx += dx;
          t.ny += dy;
          const moveDx = t.nx - t.shape.x;
          const moveDy = t.ny - t.shape.y;
          diagram.updateShape(t.shape.id, { x: t.nx, y: t.ny });
          Connectors.updateConnectorsForShape(diagram, t.shape.id);

          // Move container children along with the container
          const def = Shapes.get(t.shape.type);
          if (def && def.isContainer) {
            const children = diagram.getChildrenOfContainer(t.shape.id);
            children.forEach(child => {
              if (!selectedShapes.find(sel => sel.id === child.id)) {
                diagram.updateShape(child.id, { x: child.x + moveDx, y: child.y + moveDy });
                Connectors.updateConnectorsForShape(diagram, child.id);
              }
            });
          }
        });

        // Build guide lines
        if (bestSnapX !== null) {
          let minY = Infinity, maxY = -Infinity;
          tentative.forEach(t => { minY = Math.min(minY, t.ny); maxY = Math.max(maxY, t.ny + t.shape.height); });
          otherShapes.forEach(o => {
            const ox = [o.x, o.x + o.width / 2, o.x + o.width];
            if (ox.some(v => Math.abs(v - bestSnapX) < 0.5)) {
              minY = Math.min(minY, o.y);
              maxY = Math.max(maxY, o.y + o.height);
            }
          });
          guides.push({ x1: bestSnapX, y1: minY - 20, x2: bestSnapX, y2: maxY + 20 });
        }
        if (bestSnapY !== null) {
          let minX = Infinity, maxX = -Infinity;
          tentative.forEach(t => { minX = Math.min(minX, t.nx); maxX = Math.max(maxX, t.nx + t.shape.width); });
          otherShapes.forEach(o => {
            const oy = [o.y, o.y + o.height / 2, o.y + o.height];
            if (oy.some(v => Math.abs(v - bestSnapY) < 0.5)) {
              minX = Math.min(minX, o.x);
              maxX = Math.max(maxX, o.x + o.width);
            }
          });
          guides.push({ x1: minX - 20, y1: bestSnapY, x2: maxX + 20, y2: bestSnapY });
        }

        // === Distance indicators (#13) ===
        // Compute group bounding box after snap
        const fgx1 = gx1 + (dx || 0), fgy1 = gy1 + (dy || 0);
        const fgx2 = gx2 + (dx || 0), fgy2 = gy2 + (dy || 0);
        const distances = [];

        // For each "other" shape, compute gaps to the dragged group
        for (const other of otherShapes) {
          const yOverlap = !(fgy2 < other.y || other.y + other.height < fgy1);
          if (yOverlap) {
            const overlapTop = Math.max(fgy1, other.y);
            const overlapBot = Math.min(fgy2, other.y + other.height);
            const midY = (overlapTop + overlapBot) / 2;
            // Gap left of group
            const gapL = fgx1 - (other.x + other.width);
            if (gapL > 2 && gapL < 300) {
              distances.push({ x1: other.x + other.width, y1: midY, x2: fgx1, y2: midY, value: Math.round(gapL) });
            }
            // Gap right of group
            const gapR = other.x - fgx2;
            if (gapR > 2 && gapR < 300) {
              distances.push({ x1: fgx2, y1: midY, x2: other.x, y2: midY, value: Math.round(gapR) });
            }
          }
          const xOverlap = !(fgx2 < other.x || other.x + other.width < fgx1);
          if (xOverlap) {
            const overlapLeft = Math.max(fgx1, other.x);
            const overlapRight = Math.min(fgx2, other.x + other.width);
            const midX = (overlapLeft + overlapRight) / 2;
            // Gap above group
            const gapT = fgy1 - (other.y + other.height);
            if (gapT > 2 && gapT < 300) {
              distances.push({ x1: midX, y1: other.y + other.height, x2: midX, y2: fgy1, value: Math.round(gapT) });
            }
            // Gap below group
            const gapB = other.y - fgy2;
            if (gapB > 2 && gapB < 300) {
              distances.push({ x1: midX, y1: fgy2, x2: midX, y2: other.y, value: Math.round(gapB) });
            }
          }
        }

        // === Equal-spacing snap ===
        // Find nearest neighbor on each side and try to match spacing
        let nearestLeft = null, nearestRight = null, nearestTop = null, nearestBottom = null;
        for (const other of otherShapes) {
          const yOv = !(fgy2 < other.y || other.y + other.height < fgy1);
          if (yOv) {
            const gl = fgx1 - (other.x + other.width);
            if (gl > 0 && (!nearestLeft || gl < nearestLeft.gap)) nearestLeft = { shape: other, gap: gl };
            const gr = other.x - fgx2;
            if (gr > 0 && (!nearestRight || gr < nearestRight.gap)) nearestRight = { shape: other, gap: gr };
          }
          const xOv = !(fgx2 < other.x || other.x + other.width < fgx1);
          if (xOv) {
            const gt = fgy1 - (other.y + other.height);
            if (gt > 0 && (!nearestTop || gt < nearestTop.gap)) nearestTop = { shape: other, gap: gt };
            const gb = other.y - fgy2;
            if (gb > 0 && (!nearestBottom || gb < nearestBottom.gap)) nearestBottom = { shape: other, gap: gb };
          }
        }

        // If left and right gaps are close, mark equal-spacing
        if (nearestLeft && nearestRight && Math.abs(nearestLeft.gap - nearestRight.gap) < snapThreshold * 2) {
          const avg = (nearestLeft.gap + nearestRight.gap) / 2;
          distances.forEach(d => {
            if (d.value === Math.round(nearestLeft.gap) || d.value === Math.round(nearestRight.gap)) {
              d.equalSpacing = true;
            }
          });
        }
        if (nearestTop && nearestBottom && Math.abs(nearestTop.gap - nearestBottom.gap) < snapThreshold * 2) {
          distances.forEach(d => {
            if (d.value === Math.round(nearestTop.gap) || d.value === Math.round(nearestBottom.gap)) {
              d.equalSpacing = true;
            }
          });
        }

        Renderer.showSelectionHandles(selectedShapes);
        Renderer.showAlignmentGuides(guides, distances);
        return;
      }

      if (this._marquee) {
        const x = Math.min(pos.x, this._startPos.x);
        const y = Math.min(pos.y, this._startPos.y);
        const w = Math.abs(pos.x - this._startPos.x);
        const h = Math.abs(pos.y - this._startPos.y);
        Renderer.showMarquee({ x, y, width: w, height: h });
        return;
      }

      // Auto-suggest: show ports when hovering over a shape (Lucidchart-style)
      const hoverShape = Renderer.getShapeAt(pos.x, pos.y);
      if (hoverShape) {
        if (this._hoveredShape !== hoverShape.id) {
          this._hoveredShape = hoverShape.id;
          // Show ports as interactive (pointer-events enabled) so user can click-drag from them
          Renderer.showPorts(hoverShape, true);
        }
      } else {
        if (this._hoveredShape) {
          this._hoveredShape = null;
          Renderer.clearPorts();
        }
      }
    },

    onMouseUp(e) {
      const pos = getCanvasPos(e);

      // Waypoint drag completion
      if (this._waypointDrag && this._waypointConnId) {
        // Waypoint already moved in onMouseMove; just clean up
        this._waypointDrag = false;
        this._waypointConnId = null;
        this._waypointIdx = null;
        this._waypointStartPoints = null;
        return;
      }

      // Label drag completion
      if (this._labelDrag && this._labelConnId) {
        this._labelDrag = false;
        this._labelConnId = null;
        return;
      }

      // Auto-connect line completion
      if (this._autoConnect && this._autoConnectSource) {
        let targetShape = null, targetPort = null;
        const portInfo = Renderer.getPortAt(pos.x, pos.y);
        if (portInfo && portInfo.shape.id !== this._autoConnectSource.shape.id) {
          targetShape = portInfo.shape;
          targetPort = portInfo.port;
        } else {
          const shape = Renderer.getShapeAt(pos.x, pos.y);
          if (shape && shape.id !== this._autoConnectSource.shape.id) {
            targetShape = shape;
            targetPort = Connectors.findNearestPort(shape, pos.x, pos.y);
          }
        }

        if (targetShape && targetPort) {
          const conn = Model.createConnector(
            this._autoConnectSource.shape.id, this._autoConnectSource.port.id,
            targetShape.id, targetPort.id
          );
          conn.points = Connectors.routeConnector(diagram, conn);
          // Auto-label connectors from decision shapes
          autoLabelDecisionConnector(conn, this._autoConnectSource.shape);
          History.execute(new History.AddConnectorCommand(conn));
        }

        this._autoConnect = false;
        this._autoConnectSource = null;
        Renderer.clearConnectorPreview();
        Renderer.clearPorts();
        containerEl.style.cursor = 'default';
        return;
      }

      if (this._rotating && selectedShapes.length === 1) {
        const shape = selectedShapes[0];
        History.execute(new History.ResizeShapeCommand(
          shape.id,
          { ...this._startBounds },
          { x: shape.x, y: shape.y, width: shape.width, height: shape.height, rotation: shape.rotation }
        ));
        this._rotating = false;
        return;
      }

      if (this._resizing && selectedShapes.length === 1) {
        const shape = selectedShapes[0];
        History.execute(new History.ResizeShapeCommand(
          shape.id,
          this._startBounds,
          { x: shape.x, y: shape.y, width: shape.width, height: shape.height }
        ));
        this._resizing = false;
        return;
      }

      if (this._dragging) {
        stopAutoPan();
        // Record move commands
        History.beginBatch();
        selectedShapes.forEach((shape, i) => {
          const offset = this._dragOffsets[i];
          if (shape.x !== offset.startX || shape.y !== offset.startY) {
            History.execute(new History.MoveShapeCommand(
              shape.id, offset.startX, offset.startY, shape.x, shape.y
            ));
          }
        });

        // Container parenting: check if shapes were dropped into/out of containers
        selectedShapes.forEach(shape => {
          const shapeDef = Shapes.get(shape.type);
          if (shapeDef && shapeDef.isContainer) return; // Don't parent containers into containers

          const centerX = shape.x + shape.width / 2;
          const centerY = shape.y + shape.height / 2;
          const oldContainerId = shape.containerId || null;

          // Find container that shape center is inside (iterate in reverse z-order for topmost)
          let newContainerId = null;
          for (let i = diagram.shapes.length - 1; i >= 0; i--) {
            const candidate = diagram.shapes[i];
            if (candidate.id === shape.id) continue;
            const candidateDef = Shapes.get(candidate.type);
            if (!candidateDef || !candidateDef.isContainer) continue;
            if (centerX >= candidate.x && centerX <= candidate.x + candidate.width &&
                centerY >= candidate.y && centerY <= candidate.y + candidate.height) {
              newContainerId = candidate.id;
              break;
            }
          }

          if (newContainerId !== oldContainerId) {
            History.execute(new History.SetContainerCommand(shape.id, oldContainerId, newContainerId));
          }
        });

        History.endBatch('Move shapes');
        this._dragging = false;
        Renderer.clearAlignmentGuides();
        return;
      }

      if (this._marquee) {
        const x = Math.min(pos.x, this._startPos.x);
        const y = Math.min(pos.y, this._startPos.y);
        const w = Math.abs(pos.x - this._startPos.x);
        const h = Math.abs(pos.y - this._startPos.y);
        const rect = { x, y, width: w, height: h };

        const inMarquee = diagram.shapes.filter(s => {
          const layer = diagram.getLayer(s.layerId);
          if (layer && (!layer.visible || layer.locked)) return false;
          return Utils.rectsOverlap(s, rect);
        });
        setSelection(inMarquee, null);
        Renderer.clearMarquee();
        this._marquee = false;
      }
    },

    onDoubleClick(e) {
      const pos = getCanvasPos(e);
      const shape = Renderer.getShapeAt(pos.x, pos.y);
      if (shape) {
        // For swim-lane shapes with lanes, edit the specific lane
        const def = Shapes.get(shape.type);
        if (def.customText && def.getLaneAtY && shape.data && shape.data.lanes && shape.data.lanes.length > 0) {
          const localY = pos.y - shape.y;
          const laneIdx = def.getLaneAtY(shape, localY);
          if (laneIdx >= 0) {
            startLaneEdit(shape, laneIdx);
            return;
          }
        }
        startInlineEdit(shape);
        return;
      }
      // Double-click on connector to edit label
      const conn = Renderer.getConnectorAt(pos.x, pos.y);
      if (conn) {
        startConnectorLabelEdit(conn, pos);
      }
    },

    onKeyDown(e) {
      // Don't handle if editing text
      if (document.querySelector('.text-edit-overlay')) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
        e.preventDefault();
      }
      if (e.key === 'Escape') {
        if (this._autoConnect) {
          this._autoConnect = false;
          this._autoConnectSource = null;
          Renderer.clearConnectorPreview();
          Renderer.clearPorts();
          containerEl.style.cursor = 'default';
        } else {
          clearSelection();
        }
      }
      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setSelection([...diagram.shapes], null);
      }
    }
  };

  // ===== DRAW TOOL =====
  let drawShapeType = 'basic:rectangle';

  tools.draw = {
    _drawing: false,
    _startPos: null,
    _previewShape: null,

    activate() { containerEl.style.cursor = 'crosshair'; },
    deactivate() { containerEl.style.cursor = ''; },

    onMouseDown(e) {
      if (e.button !== 0) return;
      const pos = getCanvasPos(e);
      this._drawing = true;
      this._startPos = pos;

      const def = Shapes.get(drawShapeType);
      const shape = Model.createShape(drawShapeType, pos.x, pos.y, 1, 1);
      shape.ports = def.ports || Shapes.stdPorts();
      if (def.defaultData) shape.data = def.defaultData();
      this._previewShape = shape;
      diagram.addShape(shape);
    },

    onMouseMove(e) {
      if (!this._drawing || !this._previewShape) return;
      const pos = getCanvasPos(e);
      let x = Math.min(pos.x, this._startPos.x);
      let y = Math.min(pos.y, this._startPos.y);
      let w = Math.abs(pos.x - this._startPos.x);
      let h = Math.abs(pos.y - this._startPos.y);

      if (e.shiftKey) {
        const size = Math.max(w, h);
        w = h = size;
      }

      if (diagram.settings.snapToGrid) {
        const gs = diagram.settings.gridSize;
        x = Utils.snapToGrid(x, gs);
        y = Utils.snapToGrid(y, gs);
        w = Utils.snapToGrid(w, gs) || gs;
        h = Utils.snapToGrid(h, gs) || gs;
      }

      diagram.updateShape(this._previewShape.id, { x, y, width: w, height: h });
    },

    onMouseUp(e) {
      if (!this._drawing || !this._previewShape) return;
      this._drawing = false;

      const shape = this._previewShape;
      if (shape.width < 10 || shape.height < 10) {
        // Too small - use default size
        const def = Shapes.get(drawShapeType);
        let x = shape.x, y = shape.y;
        if (diagram.settings.snapToGrid) {
          const gs = diagram.settings.gridSize;
          x = Utils.snapToGrid(x, gs);
          y = Utils.snapToGrid(y, gs);
        }
        diagram.updateShape(shape.id, {
          x, y,
          width: def.defaultSize.width,
          height: def.defaultSize.height
        });
      }

      // Remove the directly-added shape and re-add via history
      const finalShape = Utils.deepClone(diagram.getShape(shape.id));
      diagram.removeShape(shape.id);
      History.execute(new History.AddShapeCommand(finalShape));

      this._previewShape = null;
      setTool('select');
      // Select the new shape
      const newShape = diagram.getShape(finalShape.id);
      if (newShape) setSelection([newShape], null);
    }
  };

  function setDrawShapeType(type) { drawShapeType = type; }
  function getDrawShapeType() { return drawShapeType; }

  // ===== CONNECTOR TOOL =====
  tools.connector = {
    _connecting: false,
    _sourceShape: null,
    _sourcePort: null,

    activate() { containerEl.style.cursor = 'crosshair'; },
    deactivate() {
      containerEl.style.cursor = '';
      Renderer.clearPorts();
      Renderer.clearConnectorPreview();
    },

    onMouseDown(e) {
      if (e.button !== 0) return;
      const pos = getCanvasPos(e);
      const portInfo = Renderer.getPortAt(pos.x, pos.y);

      if (!this._connecting) {
        // Start connection
        if (portInfo) {
          this._connecting = true;
          this._sourceShape = portInfo.shape;
          this._sourcePort = portInfo.port;
          Renderer.clearPorts();
        } else {
          // Check if clicking on a shape - auto-select nearest port
          const shape = Renderer.getShapeAt(pos.x, pos.y);
          if (shape) {
            const port = Connectors.findNearestPort(shape, pos.x, pos.y);
            if (port) {
              this._connecting = true;
              this._sourceShape = shape;
              this._sourcePort = port;
              Renderer.clearPorts();
            }
          }
        }
      }
    },

    onMouseMove(e) {
      const pos = getCanvasPos(e);

      if (this._connecting) {
        // Show preview line
        const srcPos = Shapes.getPortPosition(this._sourceShape, this._sourcePort);
        Renderer.showConnectorPreview([srcPos, pos]);

        // Highlight ports on hovered shape
        const shape = Renderer.getShapeAt(pos.x, pos.y);
        if (shape && shape.id !== this._sourceShape.id) {
          Renderer.showPorts(shape);
        } else {
          Renderer.clearPorts();
        }
        return;
      }

      // Not connecting - show ports on hover
      const shape = Renderer.getShapeAt(pos.x, pos.y);
      if (shape) {
        Renderer.showPorts(shape);
      } else {
        Renderer.clearPorts();
      }
    },

    onMouseUp(e) {
      if (!this._connecting) return;
      const pos = getCanvasPos(e);

      // Find target
      let targetShape = null, targetPort = null;
      const portInfo = Renderer.getPortAt(pos.x, pos.y);
      if (portInfo && portInfo.shape.id !== this._sourceShape.id) {
        targetShape = portInfo.shape;
        targetPort = portInfo.port;
      } else {
        const shape = Renderer.getShapeAt(pos.x, pos.y);
        if (shape && shape.id !== this._sourceShape.id) {
          targetShape = shape;
          targetPort = Connectors.findNearestPort(shape, pos.x, pos.y);
        }
      }

      if (targetShape && targetPort) {
        const conn = Model.createConnector(
          this._sourceShape.id, this._sourcePort.id,
          targetShape.id, targetPort.id
        );
        conn.points = Connectors.routeConnector(diagram, conn);
        // Auto-label connectors from decision shapes
        autoLabelDecisionConnector(conn, this._sourceShape);
        History.execute(new History.AddConnectorCommand(conn));
      }

      this._connecting = false;
      this._sourceShape = null;
      this._sourcePort = null;
      Renderer.clearConnectorPreview();
      Renderer.clearPorts();
    },

    onKeyDown(e) {
      if (e.key === 'Escape') {
        this._connecting = false;
        Renderer.clearConnectorPreview();
        Renderer.clearPorts();
      }
    }
  };

  // ===== TEXT TOOL =====
  tools.text = {
    activate() { containerEl.style.cursor = 'text'; },
    deactivate() { containerEl.style.cursor = ''; },

    onMouseDown(e) {
      if (e.button !== 0) return;
      const pos = getCanvasPos(e);

      // Check if clicking an existing shape to edit
      const shape = Renderer.getShapeAt(pos.x, pos.y);
      if (shape) {
        startInlineEdit(shape);
        setTool('select');
        return;
      }

      // Create standalone text (use rectangle with transparent fill)
      const textShape = Model.createShape('basic:rectangle', pos.x, pos.y, 140, 40, {
        text: 'Text',
        style: { fill: 'transparent', stroke: 'transparent', strokeWidth: 0, opacity: 1, shadow: false }
      });
      History.execute(new History.AddShapeCommand(textShape));
      const newShape = diagram.getShape(textShape.id);
      if (newShape) {
        setTool('select');
        setSelection([newShape], null);
        setTimeout(() => startInlineEdit(newShape), 100);
      }
    }
  };

  // ===== PAN TOOL =====
  tools.pan = {
    _panning: false,
    _lastX: 0,
    _lastY: 0,

    activate() { containerEl.style.cursor = 'grab'; },
    deactivate() { containerEl.style.cursor = ''; },

    onMouseDown(e) {
      this._panning = true;
      this._lastX = e.clientX;
      this._lastY = e.clientY;
      containerEl.style.cursor = 'grabbing';
    },

    onMouseMove(e) {
      if (!this._panning) return;
      const dx = e.clientX - this._lastX;
      const dy = e.clientY - this._lastY;
      this._lastX = e.clientX;
      this._lastY = e.clientY;
      const pan = Renderer.getPan();
      Renderer.setPan(pan.x + dx, pan.y + dy);
    },

    onMouseUp(e) {
      this._panning = false;
      containerEl.style.cursor = spaceHeld ? 'grab' : (currentToolName === 'pan' ? 'grab' : '');
    }
  };

  // ===== Inline Text Editing =====
  function startInlineEdit(shape) {
    const existing = document.querySelector('.text-edit-overlay');
    if (existing) existing.remove();

    const def = Shapes.get(shape.type);
    const zoom = Renderer.getZoom();

    // For shapes with custom text (e.g. swim lane), position edit over the header area
    let editX = shape.x, editY = shape.y, editW = shape.width, editH = shape.height;
    if (def.customText && def.getHeaderWidth) {
      editW = def.getHeaderWidth(shape);
    }

    const screenPos = Renderer.canvasToScreen(editX, editY);

    const textarea = document.createElement('textarea');
    textarea.className = 'text-edit-overlay';
    textarea.value = shape.text || '';
    textarea.style.left = (screenPos.x + containerEl.offsetLeft) + 'px';
    textarea.style.top = (screenPos.y + containerEl.offsetTop) + 'px';
    textarea.style.width = (editW * zoom) + 'px';
    textarea.style.height = (editH * zoom) + 'px';
    textarea.style.fontSize = (shape.textStyle.fontSize * zoom) + 'px';
    textarea.style.fontFamily = shape.textStyle.fontFamily;
    textarea.style.fontWeight = shape.textStyle.fontWeight;
    textarea.style.color = shape.textStyle.color;
    textarea.style.textAlign = def.customText ? 'center' : shape.textStyle.align;

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const finish = () => {
      const newText = textarea.value;
      if (newText !== (shape.text || '')) {
        History.execute(new History.ChangeTextCommand(shape.id, shape.text || '', newText));
      }
      textarea.remove();
    };

    textarea.addEventListener('blur', finish);
    textarea.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        textarea.value = shape.text || '';
        textarea.blur();
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        textarea.blur();
      }
      e.stopPropagation();
    });
  }

  // ===== Lane Inline Editing (swim-lane specific) =====
  function startLaneEdit(shape, laneIdx) {
    const existing = document.querySelector('.text-edit-overlay');
    if (existing) existing.remove();

    const def = Shapes.get(shape.type);
    const zoom = Renderer.getZoom();
    const lanes = shape.data.lanes;
    const lane = lanes[laneIdx];
    const laneH = shape.height / lanes.length;
    const numW = (shape.data.numberWidth) || 28;
    const nameW = (shape.data.nameWidth) || 85;

    const editX = shape.x + numW;
    const editY = shape.y + laneH * laneIdx;
    const screenPos = Renderer.canvasToScreen(editX, editY);

    const textarea = document.createElement('textarea');
    textarea.className = 'text-edit-overlay';
    textarea.value = lane.name || '';
    textarea.style.left = (screenPos.x + containerEl.offsetLeft) + 'px';
    textarea.style.top = (screenPos.y + containerEl.offsetTop) + 'px';
    textarea.style.width = (nameW * zoom) + 'px';
    textarea.style.height = (laneH * zoom) + 'px';
    textarea.style.fontSize = ((shape.textStyle.fontSize || 11) * zoom) + 'px';
    textarea.style.fontFamily = shape.textStyle.fontFamily || 'MaruBuri, Inter, system-ui, sans-serif';
    textarea.style.fontWeight = shape.textStyle.fontWeight || 'bold';
    textarea.style.color = lane.textColor || '#333333';
    textarea.style.textAlign = 'center';

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const finish = () => {
      const newName = textarea.value;
      if (newName !== (lane.name || '')) {
        lanes[laneIdx].name = newName;
        diagram.updateShapeDeep(shape.id, { data: { lanes: lanes } });
      }
      textarea.remove();
    };

    textarea.addEventListener('blur', finish);
    textarea.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        textarea.value = lane.name || '';
        textarea.blur();
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        textarea.blur();
      }
      e.stopPropagation();
    });
  }

  // ===== Connector label inline editing =====
  function startConnectorLabelEdit(conn, canvasPos) {
    const existing = document.querySelector('.text-edit-overlay');
    if (existing) existing.remove();

    const zoom = Renderer.getZoom();
    // Find the label position along the path
    const labelPos = (conn.label && conn.label.position) || 0.5;
    const pts = conn.points;
    let pt = canvasPos;
    if (pts && pts.length >= 2) {
      // Calculate point along path
      let totalLen = 0;
      const segs = [];
      for (let i = 1; i < pts.length; i++) {
        const len = Utils.distance(pts[i - 1], pts[i]);
        segs.push({ from: pts[i - 1], to: pts[i], len });
        totalLen += len;
      }
      let target = totalLen * labelPos;
      for (const seg of segs) {
        if (target <= seg.len) {
          const frac = seg.len === 0 ? 0 : target / seg.len;
          pt = {
            x: seg.from.x + (seg.to.x - seg.from.x) * frac,
            y: seg.from.y + (seg.to.y - seg.from.y) * frac
          };
          break;
        }
        target -= seg.len;
      }
    }

    const screenPos = Renderer.canvasToScreen(pt.x, pt.y);
    const container = Renderer.getContainer();

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'text-edit-overlay';
    input.value = (conn.label && conn.label.text) || '';
    input.style.left = (screenPos.x + container.offsetLeft - 50) + 'px';
    input.style.top = (screenPos.y + container.offsetTop - 12) + 'px';
    input.style.width = '100px';
    input.style.height = (24 * zoom) + 'px';
    input.style.fontSize = (12 * zoom) + 'px';
    input.style.textAlign = 'center';
    input.style.fontFamily = 'MaruBuri, Inter, system-ui, sans-serif';
    input.placeholder = 'Label';

    document.body.appendChild(input);
    input.focus();
    input.select();

    const finish = () => {
      const newText = input.value;
      diagram.updateConnector(conn.id, { label: { text: newText, position: labelPos } });
      input.remove();
    };

    input.addEventListener('blur', finish);
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        input.value = (conn.label && conn.label.text) || '';
        input.blur();
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        input.blur();
      }
      e.stopPropagation();
    });
  }

  // ===== Delete selected =====
  function deleteSelected() {
    if (selectedConnector) {
      History.execute(new History.RemoveConnectorCommand(selectedConnector));
      clearSelection();
      return;
    }
    if (selectedShapes.length === 0) return;
    History.beginBatch();
    selectedShapes.forEach(shape => {
      const conns = diagram.getConnectorsForShape(shape.id);
      History.execute(new History.RemoveShapeCommand(shape, conns));
    });
    History.endBatch('Delete shapes');
    clearSelection();
  }

  // ===== Copy/Paste =====
  function copySelected() {
    if (selectedShapes.length === 0) return;
    clipboard = selectedShapes.map(s => Utils.deepClone(s));
  }

  function paste() {
    if (clipboard.length === 0) return;
    const offset = 20;
    History.beginBatch();
    const newShapes = [];
    clipboard.forEach(s => {
      const newShape = Utils.deepClone(s);
      newShape.id = Utils.uid('shp');
      newShape.x += offset;
      newShape.y += offset;
      History.execute(new History.AddShapeCommand(newShape));
      newShapes.push(diagram.getShape(newShape.id));
    });
    History.endBatch('Paste shapes');
    setSelection(newShapes.filter(Boolean), null);
    clipboard = clipboard.map(s => {
      s.x += offset;
      s.y += offset;
      return s;
    });
  }

  function duplicateSelected() {
    copySelected();
    paste();
  }

  // ===== Alignment =====
  function alignShapes(direction) {
    if (selectedShapes.length < 2) return;
    const bounds = Utils.getBoundingRect(selectedShapes);
    History.beginBatch();
    selectedShapes.forEach(shape => {
      let nx = shape.x, ny = shape.y;
      switch (direction) {
        case 'left': nx = bounds.x; break;
        case 'right': nx = bounds.x + bounds.width - shape.width; break;
        case 'center-h': nx = bounds.x + (bounds.width - shape.width) / 2; break;
        case 'top': ny = bounds.y; break;
        case 'bottom': ny = bounds.y + bounds.height - shape.height; break;
        case 'center-v': ny = bounds.y + (bounds.height - shape.height) / 2; break;
      }
      if (nx !== shape.x || ny !== shape.y) {
        History.execute(new History.MoveShapeCommand(shape.id, shape.x, shape.y, nx, ny));
      }
    });
    History.endBatch('Align shapes');
    Renderer.showSelectionHandles(selectedShapes);
  }

  function distributeShapes(direction) {
    if (selectedShapes.length < 3) return;
    const sorted = [...selectedShapes].sort((a, b) =>
      direction === 'horizontal' ? a.x - b.x : a.y - b.y
    );
    const first = sorted[0], last = sorted[sorted.length - 1];
    History.beginBatch();
    if (direction === 'horizontal') {
      const totalSpace = (last.x + last.width) - first.x;
      const totalShapeWidth = sorted.reduce((sum, s) => sum + s.width, 0);
      const gap = (totalSpace - totalShapeWidth) / (sorted.length - 1);
      let cx = first.x;
      sorted.forEach(shape => {
        if (shape.x !== cx) {
          History.execute(new History.MoveShapeCommand(shape.id, shape.x, shape.y, cx, shape.y));
        }
        cx += shape.width + gap;
      });
    } else {
      const totalSpace = (last.y + last.height) - first.y;
      const totalShapeHeight = sorted.reduce((sum, s) => sum + s.height, 0);
      const gap = (totalSpace - totalShapeHeight) / (sorted.length - 1);
      let cy = first.y;
      sorted.forEach(shape => {
        if (shape.y !== cy) {
          History.execute(new History.MoveShapeCommand(shape.id, shape.x, shape.y, shape.x, cy));
        }
        cy += shape.height + gap;
      });
    }
    History.endBatch('Distribute shapes');
    Renderer.showSelectionHandles(selectedShapes);
  }

  // ===== Group/Ungroup =====
  function groupSelected() {
    if (selectedShapes.length < 2) return;
    const ids = selectedShapes.map(s => s.id);
    const group = diagram.addGroup(ids);
    // Don't use history command here since addGroup already modifies model
  }

  function ungroupSelected() {
    if (selectedShapes.length === 0) return;
    const shape = selectedShapes[0];
    const group = diagram.getGroupForShape(shape.id);
    if (group) {
      diagram.removeGroup(group.id);
    }
  }

  // ===== Context Menu =====
  function showContextMenu(e) {
    closeContextMenu();
    const pos = getCanvasPos(e);
    const shape = Renderer.getShapeAt(pos.x, pos.y);
    const conn = Renderer.getConnectorAt(pos.x, pos.y);

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';

    const items = [];

    if (shape) {
      if (!selectedShapes.find(s => s.id === shape.id)) {
        setSelection([shape], null);
      }
      items.push({ label: 'Cut', shortcut: 'Ctrl+X', action: () => { copySelected(); deleteSelected(); } });
      items.push({ label: 'Copy', shortcut: 'Ctrl+C', action: () => copySelected() });
      items.push({ label: 'Duplicate', shortcut: 'Ctrl+D', action: () => duplicateSelected() });
      items.push({ separator: true });
      items.push({ label: 'Bring to Front', action: () => { diagram.bringToFront(shape.id); } });
      items.push({ label: 'Send to Back', action: () => { diagram.sendToBack(shape.id); } });
      items.push({ separator: true });
      if (selectedShapes.length >= 2) {
        items.push({ label: 'Group', shortcut: 'Ctrl+G', action: () => groupSelected() });
      }
      if (diagram.getGroupForShape(shape.id)) {
        items.push({ label: 'Ungroup', shortcut: 'Ctrl+Shift+G', action: () => ungroupSelected() });
      }
      items.push({ separator: true });
      items.push({ label: 'Delete', shortcut: 'Del', action: () => deleteSelected(), danger: true });
    } else if (conn) {
      setSelection([], conn);
      items.push({ label: 'Delete Connector', shortcut: 'Del', action: () => deleteSelected(), danger: true });
    } else {
      items.push({ label: 'Paste', shortcut: 'Ctrl+V', action: () => paste() });
      items.push({ separator: true });
      items.push({ label: 'Select All', shortcut: 'Ctrl+A', action: () => setSelection([...diagram.shapes], null) });
    }

    items.forEach(item => {
      if (item.separator) {
        const sep = document.createElement('div');
        sep.className = 'context-menu-separator';
        menu.appendChild(sep);
        return;
      }
      const el = document.createElement('div');
      el.className = 'context-menu-item' + (item.danger ? ' danger' : '');
      el.innerHTML = `<span>${item.label}</span>${item.shortcut ? `<span class="shortcut">${item.shortcut}</span>` : ''}`;
      el.addEventListener('click', () => {
        item.action();
        closeContextMenu();
      });
      menu.appendChild(el);
    });

    document.body.appendChild(menu);

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', closeContextMenu, { once: true });
    }, 10);
  }

  function closeContextMenu() {
    document.querySelectorAll('.context-menu').forEach(m => m.remove());
  }

  // ===== Global keyboard shortcuts =====
  function handleGlobalKeys(e) {
    if (document.querySelector('.text-edit-overlay')) return;

    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) History.redo(); else History.undo();
    }
    if (ctrl && e.key === 'y') {
      e.preventDefault();
      History.redo();
    }
    if (ctrl && e.key === 'c') {
      e.preventDefault();
      copySelected();
    }
    if (ctrl && e.key === 'v') {
      e.preventDefault();
      paste();
    }
    if (ctrl && e.key === 'x') {
      e.preventDefault();
      copySelected();
      deleteSelected();
    }
    if (ctrl && e.key === 'd') {
      e.preventDefault();
      duplicateSelected();
    }
    if (ctrl && e.key === 'g') {
      e.preventDefault();
      if (e.shiftKey) ungroupSelected(); else groupSelected();
    }
    // Tool shortcuts
    if (!ctrl && !e.altKey) {
      if (e.key === 'v' || e.key === '1') setTool('select');
      if (e.key === 'r' || e.key === '2') { setDrawShapeType('basic:rectangle'); setTool('draw'); }
      if (e.key === 'c' && !ctrl) { /* handled by copy above if ctrl */ }
      if (e.key === 'l' || e.key === '3') setTool('connector');
      if (e.key === 't' || e.key === '4') setTool('text');
      if (e.key === 'h' || e.key === '5') setTool('pan');
    }
  }

  // ===== Auto-label decision connectors =====
  function autoLabelDecisionConnector(conn, sourceShape) {
    if (sourceShape.type !== 'flowchart:decision') return;
    // Count existing connectors from this decision shape
    const existing = diagram.getConnectorsForShape(sourceShape.id)
      .filter(c => c.sourceShapeId === sourceShape.id);
    if (existing.length === 0) {
      conn.label = { text: 'Yes', position: 0.5 };
    } else if (existing.length === 1) {
      conn.label = { text: 'No', position: 0.5 };
    }
    // 3+ connectors: no auto-label
  }

  // Drag from palette handler
  function handlePaletteDrop(shapeType, x, y) {
    const def = Shapes.get(shapeType);
    const gs = diagram.settings.gridSize;
    let sx = x - def.defaultSize.width / 2;
    let sy = y - def.defaultSize.height / 2;
    if (diagram.settings.snapToGrid) {
      sx = Utils.snapToGrid(sx, gs);
      sy = Utils.snapToGrid(sy, gs);
    }
    const shape = Model.createShape(shapeType, sx, sy, def.defaultSize.width, def.defaultSize.height);
    shape.ports = def.ports || Shapes.stdPorts();
    // Initialize container data
    if (def.defaultData) {
      shape.data = def.defaultData();
    }
    History.execute(new History.AddShapeCommand(shape));
    const newShape = diagram.getShape(shape.id);
    if (newShape) {
      setTool('select');
      setSelection([newShape], null);
    }
    return newShape;
  }

  return {
    init, setTool, getTool, tools,
    getSelectedShapes, getSelectedConnector,
    setSelection, clearSelection,
    setOnSelectionChanged, setOnToolChanged,
    setDrawShapeType, getDrawShapeType,
    deleteSelected, copySelected, paste, duplicateSelected,
    alignShapes, distributeShapes,
    groupSelected, ungroupSelected,
    handlePaletteDrop, startInlineEdit, closeContextMenu
  };
})();
