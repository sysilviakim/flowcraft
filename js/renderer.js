// FlowCraft - SVG Rendering & Canvas Workspace
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

const Renderer = (() => {
  let svg, canvasLayer, gridPattern, gridGroup;
  let diagram;
  let panX = 0, panY = 0, zoom = 1;
  let containerEl;

  function init(container, diag) {
    containerEl = container;
    diagram = diag;

    svg = Utils.svgEl('svg', { id: 'main-svg' });
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    // Defs for patterns, markers, filters
    const defs = Utils.svgEl('defs');

    // Grid pattern
    gridPattern = Utils.svgEl('pattern', {
      id: 'grid-pattern',
      width: diagram.settings.gridSize,
      height: diagram.settings.gridSize,
      patternUnits: 'userSpaceOnUse'
    });
    const gridDot = Utils.svgEl('circle', {
      cx: diagram.settings.gridSize / 2,
      cy: diagram.settings.gridSize / 2,
      r: 0.8,
      fill: '#c0c0d0'
    });
    gridPattern.appendChild(gridDot);
    defs.appendChild(gridPattern);

    // Arrow markers
    const arrowTypes = [
      { id: 'arrow-end', path: 'M0,0 L10,5 L0,10 L3,5 Z', refX: 10 },
      { id: 'arrow-start', path: 'M10,0 L0,5 L10,10 L7,5 Z', refX: 0 },
      { id: 'diamond-end', path: 'M0,5 L5,0 L10,5 L5,10 Z', refX: 10 },
      { id: 'diamond-start', path: 'M0,5 L5,0 L10,5 L5,10 Z', refX: 0 },
      { id: 'circle-end', path: 'M5,0 A5,5 0 1,1 5,10 A5,5 0 1,1 5,0', refX: 10 },
      { id: 'circle-start', path: 'M5,0 A5,5 0 1,1 5,10 A5,5 0 1,1 5,0', refX: 0 }
    ];
    arrowTypes.forEach(a => {
      const marker = Utils.svgEl('marker', {
        id: a.id,
        viewBox: '0 0 10 10',
        refX: a.refX,
        refY: 5,
        markerWidth: 8,
        markerHeight: 8,
        orient: 'auto-start-reverse',
        markerUnits: 'userSpaceOnUse'
      });
      const p = Utils.svgEl('path', { d: a.path, fill: '#1a7a4c' });
      marker.appendChild(p);
      defs.appendChild(marker);
    });

    // Drop shadow filter
    const shadow = Utils.svgEl('filter', { id: 'drop-shadow', x: '-10%', y: '-10%', width: '130%', height: '130%' });
    const feGauss = Utils.svgEl('feGaussianBlur', { in: 'SourceAlpha', stdDeviation: '3' });
    const feOffset = Utils.svgEl('feOffset', { dx: '2', dy: '2', result: 'offsetblur' });
    const feFlood = Utils.svgEl('feFlood', { 'flood-color': 'rgba(0,0,0,0.3)' });
    const feComp = Utils.svgEl('feComposite', { in2: 'offsetblur', operator: 'in' });
    const feMerge = Utils.svgEl('feMerge');
    feMerge.appendChild(Utils.svgEl('feMergeNode'));
    const feMergeNode2 = Utils.svgEl('feMergeNode', { in: 'SourceGraphic' });
    feMerge.appendChild(feMergeNode2);
    shadow.append(feGauss, feOffset, feFlood, feComp, feMerge);
    defs.appendChild(shadow);

    svg.appendChild(defs);

    // Grid background
    gridGroup = Utils.svgEl('rect', {
      width: '10000',
      height: '10000',
      x: '-5000',
      y: '-5000',
      fill: 'url(#grid-pattern)'
    });

    // Canvas layer (panned/zoomed)
    canvasLayer = Utils.svgEl('g', { id: 'canvas-layer' });
    canvasLayer.appendChild(gridGroup);
    svg.appendChild(canvasLayer);

    container.appendChild(svg);
    updateTransform();
    updateGrid();

    // Listen to model changes
    diagram.on('shape:added', s => renderShape(s));
    diagram.on('shape:changed', s => renderShape(s));
    diagram.on('shape:removed', s => removeShapeEl(s.id));
    diagram.on('shape:reordered', () => reorderShapes());
    diagram.on('connector:added', c => renderConnector(c));
    diagram.on('connector:changed', c => renderConnector(c));
    diagram.on('connector:removed', c => removeConnectorEl(c.id));
    diagram.on('diagram:loaded', () => renderAll());
    diagram.on('diagram:cleared', () => renderAll());
    diagram.on('layer:changed', () => renderAll());
  }

  function getSvg() { return svg; }
  function getCanvasLayer() { return canvasLayer; }
  function getContainer() { return containerEl; }

  // --- Transform ---
  function updateTransform() {
    canvasLayer.setAttribute('transform', `translate(${panX},${panY}) scale(${zoom})`);
  }

  function setPan(x, y) {
    panX = x; panY = y;
    updateTransform();
  }

  function setZoom(z, cx, cy) {
    const oldZoom = zoom;
    zoom = Utils.clamp(z, 0.1, 5);
    // Adjust pan to zoom centered on cx,cy (screen coords)
    if (cx !== undefined && cy !== undefined) {
      panX = cx - (cx - panX) * zoom / oldZoom;
      panY = cy - (cy - panY) * zoom / oldZoom;
    }
    updateTransform();
    updateGrid();
  }

  function getPan() { return { x: panX, y: panY }; }
  function getZoom() { return zoom; }

  function screenToCanvas(sx, sy) {
    return {
      x: (sx - panX) / zoom,
      y: (sy - panY) / zoom
    };
  }

  function canvasToScreen(cx, cy) {
    return {
      x: cx * zoom + panX,
      y: cy * zoom + panY
    };
  }

  // --- Grid ---
  function updateGrid() {
    const gs = diagram.settings.gridSize;
    gridPattern.setAttribute('width', gs);
    gridPattern.setAttribute('height', gs);
    gridPattern.querySelector('circle').setAttribute('cx', gs / 2);
    gridPattern.querySelector('circle').setAttribute('cy', gs / 2);
    gridGroup.style.display = diagram.settings.showGrid ? '' : 'none';
  }

  // --- Shape Rendering ---
  function renderShape(shape) {
    const layer = diagram.getLayer(shape.layerId);
    if (layer && !layer.visible) {
      removeShapeEl(shape.id);
      return;
    }

    let g = canvasLayer.querySelector(`#shape-${CSS.escape(shape.id)}`);
    const isNew = !g;
    if (isNew) {
      g = Utils.svgEl('g', { id: `shape-${shape.id}` });
      g.setAttribute('data-shape-id', shape.id);
      canvasLayer.appendChild(g);
    }

    // Clear content
    Utils.removeChildren(g);

    const def = Shapes.get(shape.type);
    const svgContent = def.render(shape);

    // Create a temporary container to parse SVG
    const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    tempSvg.innerHTML = svgContent;

    // Apply styles to each child element
    while (tempSvg.firstChild) {
      const child = tempSvg.firstChild;
      if (child.nodeType === 1) {
        // Apply default styles if not already set
        if (!child.getAttribute('fill') || child.getAttribute('fill') === 'inherit') {
          child.setAttribute('fill', shape.style.fill);
        }
        if (child.getAttribute('fill') === 'none') {
          // Keep none
        } else if (child.getAttribute('fill') === 'transparent') {
          child.setAttribute('fill', 'transparent');
        } else if (child.getAttribute('fill') === 'currentColor') {
          child.setAttribute('fill', shape.style.stroke);
        }

        if (!child.getAttribute('stroke') || child.getAttribute('stroke') === 'inherit') {
          child.setAttribute('stroke', shape.style.stroke);
        }
        if (!child.getAttribute('stroke-width')) {
          child.setAttribute('stroke-width', shape.style.strokeWidth);
        }
        if (shape.style.strokeDash && !child.getAttribute('stroke-dasharray')) {
          child.setAttribute('stroke-dasharray', shape.style.strokeDash);
        }
      }
      g.appendChild(child);
    }

    // Text label (skip for shapes with customText that handle their own text rendering)
    if (shape.text && !def.customText) {
      const align = shape.textStyle.align || 'center';
      const vAlign = shape.textStyle.vAlign || 'middle';
      const pad = 6;
      let textX, anchor;
      if (align === 'left') { textX = pad; anchor = 'start'; }
      else if (align === 'right') { textX = shape.width - pad; anchor = 'end'; }
      else { textX = shape.width / 2; anchor = 'middle'; }

      const textEl = Utils.svgEl('text', {
        x: textX,
        'text-anchor': anchor,
        'dominant-baseline': 'central',
        fill: shape.textStyle.color,
        'font-family': shape.textStyle.fontFamily,
        'font-size': shape.textStyle.fontSize,
        'font-weight': shape.textStyle.fontWeight,
        'pointer-events': 'none'
      });
      // Simple multi-line support
      const lines = shape.text.split('\n');
      const lineHeight = shape.textStyle.fontSize * 1.3;
      let startY;
      if (vAlign === 'top') { startY = pad + shape.textStyle.fontSize; }
      else if (vAlign === 'bottom') { startY = shape.height - pad - (lines.length - 1) * lineHeight; }
      else { startY = shape.height / 2 - (lines.length - 1) * lineHeight / 2; }
      lines.forEach((line, i) => {
        const tspan = Utils.svgEl('tspan', {
          x: textX,
          dy: i === 0 ? '0' : lineHeight
        });
        tspan.textContent = line;
        if (i === 0) tspan.setAttribute('y', startY);
        textEl.appendChild(tspan);
      });
      g.appendChild(textEl);
    }

    // Transform
    let transform = `translate(${shape.x}, ${shape.y})`;
    if (shape.rotation) {
      transform += ` rotate(${shape.rotation}, ${shape.width / 2}, ${shape.height / 2})`;
    }
    g.setAttribute('transform', transform);

    // Opacity
    if (shape.style.opacity !== undefined && shape.style.opacity < 1) {
      g.setAttribute('opacity', shape.style.opacity);
    }

    // Shadow
    if (shape.style.shadow) {
      g.setAttribute('filter', 'url(#drop-shadow)');
    }

    // Locked indicator
    if (layer && layer.locked) {
      g.style.pointerEvents = 'none';
    } else {
      g.style.pointerEvents = '';
    }

    return g;
  }

  function removeShapeEl(id) {
    const el = canvasLayer.querySelector(`#shape-${CSS.escape(id)}`);
    if (el) el.remove();
  }

  // --- Connector Rendering ---
  function renderConnector(conn) {
    const layer = diagram.getLayer(conn.layerId);
    if (layer && !layer.visible) {
      removeConnectorEl(conn.id);
      return;
    }

    let g = canvasLayer.querySelector(`#conn-${CSS.escape(conn.id)}`);
    if (!g) {
      g = Utils.svgEl('g', { id: `conn-${conn.id}` });
      g.setAttribute('data-connector-id', conn.id);
      // Insert connectors before shapes so shapes render on top
      const firstShape = canvasLayer.querySelector('[data-shape-id]');
      if (firstShape) {
        canvasLayer.insertBefore(g, firstShape);
      } else {
        canvasLayer.appendChild(g);
      }
    }
    Utils.removeChildren(g);

    // Build path from points
    const points = conn.points;
    if (!points || points.length < 2) return g;

    let pathD;
    if (conn.routingType === 'curved' && points.length >= 2) {
      pathD = `M${points[0].x},${points[0].y}`;
      if (points.length === 2) {
        pathD += ` L${points[1].x},${points[1].y}`;
      } else {
        for (let i = 1; i < points.length - 1; i++) {
          const cp = points[i];
          const next = points[i + 1];
          const mx = (cp.x + next.x) / 2;
          const my = (cp.y + next.y) / 2;
          pathD += ` Q${cp.x},${cp.y} ${mx},${my}`;
        }
        const last = points[points.length - 1];
        const prev = points[points.length - 2];
        pathD += ` Q${prev.x},${prev.y} ${last.x},${last.y}`;
      }
    } else {
      pathD = `M${points[0].x},${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        pathD += ` L${points[i].x},${points[i].y}`;
      }
    }

    const path = Utils.svgEl('path', {
      d: pathD,
      fill: 'none',
      stroke: conn.style.stroke,
      'stroke-width': conn.style.strokeWidth
    });
    if (conn.style.strokeDash) path.setAttribute('stroke-dasharray', conn.style.strokeDash);

    // Arrow markers
    if (conn.endArrow && conn.endArrow !== 'none') {
      path.setAttribute('marker-end', `url(#${conn.endArrow}-end)`);
    }
    if (conn.startArrow && conn.startArrow !== 'none') {
      path.setAttribute('marker-start', `url(#${conn.startArrow}-start)`);
    }

    g.appendChild(path);

    // Hit area (wider invisible path for easier selection)
    const hitPath = Utils.svgEl('path', {
      d: pathD,
      fill: 'none',
      stroke: 'transparent',
      'stroke-width': Math.max(12, conn.style.strokeWidth + 8),
      'pointer-events': 'stroke'
    });
    hitPath.setAttribute('data-connector-id', conn.id);
    g.appendChild(hitPath);

    // Label
    if (conn.label && conn.label.text) {
      const pos = conn.label.position || 0.5;
      const pt = getPointAlongPath(points, pos);
      if (pt) {
        const labelBg = Utils.svgEl('rect', {
          x: pt.x - 30, y: pt.y - 10,
          width: 60, height: 20, rx: 3,
          fill: '#ffffff', stroke: 'none', opacity: 0.9
        });
        const labelText = Utils.svgEl('text', {
          x: pt.x, y: pt.y,
          'text-anchor': 'middle',
          'dominant-baseline': 'central',
          fill: '#1a1a2e',
          'font-size': 12,
          'pointer-events': 'none'
        });
        labelText.textContent = conn.label.text;
        g.appendChild(labelBg);
        g.appendChild(labelText);
      }
    }

    return g;
  }

  function getPointAlongPath(points, t) {
    if (!points || points.length < 2) return null;
    let totalLen = 0;
    const segs = [];
    for (let i = 1; i < points.length; i++) {
      const len = Utils.distance(points[i - 1], points[i]);
      segs.push({ from: points[i - 1], to: points[i], len });
      totalLen += len;
    }
    let target = totalLen * t;
    for (const seg of segs) {
      if (target <= seg.len) {
        const frac = seg.len === 0 ? 0 : target / seg.len;
        return {
          x: seg.from.x + (seg.to.x - seg.from.x) * frac,
          y: seg.from.y + (seg.to.y - seg.from.y) * frac
        };
      }
      target -= seg.len;
    }
    return points[points.length - 1];
  }

  function removeConnectorEl(id) {
    const el = canvasLayer.querySelector(`#conn-${CSS.escape(id)}`);
    if (el) el.remove();
  }

  // --- Render all ---
  function renderAll() {
    // Remove all shape and connector elements
    canvasLayer.querySelectorAll('[data-shape-id]').forEach(el => el.remove());
    canvasLayer.querySelectorAll('[data-connector-id]').forEach(el => el.remove());

    // Re-render connectors first (below shapes)
    diagram.connectors.forEach(c => renderConnector(c));
    // Then shapes
    diagram.shapes.forEach(s => renderShape(s));

    updateGrid();
  }

  function reorderShapes() {
    // Reorder SVG elements to match model order
    diagram.shapes.forEach(s => {
      const el = canvasLayer.querySelector(`#shape-${CSS.escape(s.id)}`);
      if (el) canvasLayer.appendChild(el);
    });
  }

  // --- Selection visuals ---
  function showSelectionHandles(shapes) {
    clearSelectionHandles();
    if (!shapes || shapes.length === 0) return;

    const group = Utils.svgEl('g', { id: 'selection-handles', 'pointer-events': 'none' });

    shapes.forEach(shape => {
      // Bounding box outline
      const outline = Utils.svgEl('rect', {
        x: shape.x - 1,
        y: shape.y - 1,
        width: shape.width + 2,
        height: shape.height + 2,
        fill: 'none',
        stroke: '#1a7a4c',
        'stroke-width': 1.5,
        'stroke-dasharray': '4 2'
      });
      group.appendChild(outline);
    });

    if (shapes.length === 1) {
      const s = shapes[0];
      // Resize handles
      const handles = [
        { cx: s.x, cy: s.y, cursor: 'nw-resize', pos: 'tl' },
        { cx: s.x + s.width / 2, cy: s.y, cursor: 'n-resize', pos: 'tc' },
        { cx: s.x + s.width, cy: s.y, cursor: 'ne-resize', pos: 'tr' },
        { cx: s.x + s.width, cy: s.y + s.height / 2, cursor: 'e-resize', pos: 'mr' },
        { cx: s.x + s.width, cy: s.y + s.height, cursor: 'se-resize', pos: 'br' },
        { cx: s.x + s.width / 2, cy: s.y + s.height, cursor: 's-resize', pos: 'bc' },
        { cx: s.x, cy: s.y + s.height, cursor: 'sw-resize', pos: 'bl' },
        { cx: s.x, cy: s.y + s.height / 2, cursor: 'w-resize', pos: 'ml' }
      ];
      handles.forEach(h => {
        const rect = Utils.svgEl('rect', {
          x: h.cx - 4,
          y: h.cy - 4,
          width: 8,
          height: 8,
          fill: '#ffffff',
          stroke: '#1a7a4c',
          'stroke-width': 1.5,
          cursor: h.cursor,
          'pointer-events': 'all'
        });
        rect.setAttribute('data-handle', h.pos);
        rect.setAttribute('data-shape-id', s.id);
        group.appendChild(rect);
      });

      // Rotation handle
      const rotHandle = Utils.svgEl('circle', {
        cx: s.x + s.width / 2,
        cy: s.y - 25,
        r: 5,
        fill: '#1a7a4c',
        stroke: '#ffffff',
        'stroke-width': 1.5,
        cursor: 'grab',
        'pointer-events': 'all'
      });
      rotHandle.setAttribute('data-handle', 'rotate');
      rotHandle.setAttribute('data-shape-id', s.id);
      group.appendChild(rotHandle);

      // Line from top center to rotation handle
      const rotLine = Utils.svgEl('line', {
        x1: s.x + s.width / 2,
        y1: s.y,
        x2: s.x + s.width / 2,
        y2: s.y - 25,
        stroke: '#1a7a4c',
        'stroke-width': 1,
        'stroke-dasharray': '3 2'
      });
      group.appendChild(rotLine);
    }

    canvasLayer.appendChild(group);
  }

  function clearSelectionHandles() {
    const existing = canvasLayer.querySelector('#selection-handles');
    if (existing) existing.remove();
  }

  // --- Alignment guides ---
  function showAlignmentGuides(guides) {
    clearAlignmentGuides();
    if (!guides || guides.length === 0) return;

    const group = Utils.svgEl('g', { id: 'alignment-guides', 'pointer-events': 'none' });
    guides.forEach(g => {
      const line = Utils.svgEl('line', {
        x1: g.x1, y1: g.y1, x2: g.x2, y2: g.y2,
        stroke: '#1a7a4c',
        'stroke-width': 1,
        'stroke-dasharray': '4 3'
      });
      group.appendChild(line);
    });
    canvasLayer.appendChild(group);
  }

  function clearAlignmentGuides() {
    const existing = canvasLayer.querySelector('#alignment-guides');
    if (existing) existing.remove();
  }

  // --- Port indicators ---
  function showPorts(shape, interactive = false) {
    clearPorts();
    if (!shape) return;
    const def = Shapes.get(shape.type);
    const ports = def.ports || Shapes.stdPorts();
    const group = Utils.svgEl('g', { id: 'port-indicators' });
    // When interactive, ports respond to pointer events for auto-connect
    if (!interactive) group.setAttribute('pointer-events', 'none');
    ports.forEach(port => {
      const pos = Shapes.getPortPosition(shape, port);
      const circle = Utils.svgEl('circle', {
        cx: pos.x, cy: pos.y, r: 6,
        fill: '#1a7a4c',
        stroke: '#ffffff',
        'stroke-width': 2,
        opacity: 0.9,
        cursor: 'crosshair'
      });
      if (interactive) circle.setAttribute('pointer-events', 'all');
      circle.setAttribute('data-port-id', port.id);
      circle.setAttribute('data-shape-id', shape.id);
      group.appendChild(circle);
    });
    canvasLayer.appendChild(group);
  }

  function clearPorts() {
    const existing = canvasLayer.querySelector('#port-indicators');
    if (existing) existing.remove();
  }

  // --- Marquee selection rect ---
  function showMarquee(rect) {
    clearMarquee();
    const marquee = Utils.svgEl('rect', {
      id: 'selection-marquee',
      x: rect.x, y: rect.y,
      width: rect.width, height: rect.height,
      fill: 'rgba(74,108,247,0.08)',
      stroke: '#1a7a4c',
      'stroke-width': 1,
      'stroke-dasharray': '5 3',
      'pointer-events': 'none'
    });
    canvasLayer.appendChild(marquee);
  }

  function clearMarquee() {
    const existing = canvasLayer.querySelector('#selection-marquee');
    if (existing) existing.remove();
  }

  // --- Connector preview line ---
  function showConnectorPreview(points) {
    clearConnectorPreview();
    if (!points || points.length < 2) return;
    let d = `M${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L${points[i].x},${points[i].y}`;
    }
    const path = Utils.svgEl('path', {
      id: 'connector-preview',
      d: d,
      fill: 'none',
      stroke: '#1a7a4c',
      'stroke-width': 2,
      'stroke-dasharray': '6 3',
      'pointer-events': 'none'
    });
    canvasLayer.appendChild(path);
  }

  function clearConnectorPreview() {
    const existing = canvasLayer.querySelector('#connector-preview');
    if (existing) existing.remove();
  }

  // --- Hit testing ---
  function getShapeAt(canvasX, canvasY) {
    for (let i = diagram.shapes.length - 1; i >= 0; i--) {
      const s = diagram.shapes[i];
      const layer = diagram.getLayer(s.layerId);
      if (layer && (!layer.visible || layer.locked)) continue;
      if (Utils.pointInRect(canvasX, canvasY, s)) {
        return s;
      }
    }
    return null;
  }

  function getConnectorAt(canvasX, canvasY, threshold = 8) {
    for (let i = diagram.connectors.length - 1; i >= 0; i--) {
      const c = diagram.connectors[i];
      const pts = c.points;
      if (!pts || pts.length < 2) continue;
      for (let j = 1; j < pts.length; j++) {
        const dist = distToSegment({ x: canvasX, y: canvasY }, pts[j - 1], pts[j]);
        if (dist < threshold) return c;
      }
    }
    return null;
  }

  function distToSegment(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Utils.distance(p, a);
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
    t = Utils.clamp(t, 0, 1);
    return Utils.distance(p, { x: a.x + t * dx, y: a.y + t * dy });
  }

  function getPortAt(canvasX, canvasY, threshold = 12) {
    for (let i = diagram.shapes.length - 1; i >= 0; i--) {
      const s = diagram.shapes[i];
      const layer = diagram.getLayer(s.layerId);
      if (layer && (!layer.visible || layer.locked)) continue;
      const def = Shapes.get(s.type);
      const ports = def.ports || Shapes.stdPorts();
      for (const port of ports) {
        const pos = Shapes.getPortPosition(s, port);
        if (Utils.distance({ x: canvasX, y: canvasY }, pos) < threshold) {
          return { shape: s, port };
        }
      }
    }
    return null;
  }

  // Update arrow marker colors when connector style changes
  function updateMarkerColors(color) {
    const defs = svg.querySelector('defs');
    if (!defs) return;
    defs.querySelectorAll('marker path').forEach(p => {
      p.setAttribute('fill', color);
    });
  }

  return {
    init, getSvg, getCanvasLayer, getContainer,
    setPan, setZoom, getPan, getZoom,
    screenToCanvas, canvasToScreen,
    updateGrid,
    renderShape, removeShapeEl,
    renderConnector, removeConnectorEl,
    renderAll, reorderShapes,
    showSelectionHandles, clearSelectionHandles,
    showAlignmentGuides, clearAlignmentGuides,
    showPorts, clearPorts,
    showMarquee, clearMarquee,
    showConnectorPreview, clearConnectorPreview,
    getShapeAt, getConnectorAt, getPortAt,
    updateMarkerColors
  };
})();
