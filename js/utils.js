// FlowCraft - Utility Functions
// Geometry, color, DOM helpers (no dependencies)
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

const Utils = (() => {
  // --- Unique ID generator ---
  let _idCounter = 0;
  function uid(prefix = 'fc') {
    return `${prefix}_${Date.now().toString(36)}_${(++_idCounter).toString(36)}`;
  }

  // --- Geometry ---
  function distance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function midpoint(p1, p2) {
    return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function snapToGrid(value, gridSize) {
    return Math.round(value / gridSize) * gridSize;
  }

  function pointInRect(px, py, rect) {
    return px >= rect.x && px <= rect.x + rect.width &&
           py >= rect.y && py <= rect.y + rect.height;
  }

  function rectsOverlap(a, b) {
    return !(a.x + a.width < b.x || b.x + b.width < a.x ||
             a.y + a.height < b.y || b.y + b.height < a.y);
  }

  function rectContains(outer, inner) {
    return inner.x >= outer.x && inner.y >= outer.y &&
           inner.x + inner.width <= outer.x + outer.width &&
           inner.y + inner.height <= outer.y + outer.height;
  }

  function expandRect(rect, padding) {
    return {
      x: rect.x - padding,
      y: rect.y - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2
    };
  }

  function getBoundingRect(shapes) {
    if (!shapes.length) return { x: 0, y: 0, width: 0, height: 0 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const s of shapes) {
      minX = Math.min(minX, s.x);
      minY = Math.min(minY, s.y);
      maxX = Math.max(maxX, s.x + s.width);
      maxY = Math.max(maxY, s.y + s.height);
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  function lineIntersectsRect(p1, p2, rect) {
    const lines = [
      [{ x: rect.x, y: rect.y }, { x: rect.x + rect.width, y: rect.y }],
      [{ x: rect.x + rect.width, y: rect.y }, { x: rect.x + rect.width, y: rect.y + rect.height }],
      [{ x: rect.x + rect.width, y: rect.y + rect.height }, { x: rect.x, y: rect.y + rect.height }],
      [{ x: rect.x, y: rect.y + rect.height }, { x: rect.x, y: rect.y }]
    ];
    for (const [a, b] of lines) {
      if (lineSegmentIntersection(p1, p2, a, b)) return true;
    }
    return false;
  }

  function lineSegmentIntersection(p1, p2, p3, p4) {
    const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
    const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
    const cross = d1x * d2y - d1y * d2x;
    if (Math.abs(cross) < 1e-10) return null;
    const dx = p3.x - p1.x, dy = p3.y - p1.y;
    const t = (dx * d2y - dy * d2x) / cross;
    const u = (dx * d1y - dy * d1x) / cross;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return { x: p1.x + t * d1x, y: p1.y + t * d1y };
    }
    return null;
  }

  function rotatePoint(px, py, cx, cy, angleDeg) {
    const rad = angleDeg * Math.PI / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const dx = px - cx, dy = py - cy;
    return {
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos
    };
  }

  // --- Manhattan distance for A* ---
  function manhattan(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  // --- Color helpers ---
  function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  // --- DOM helpers ---
  function svgEl(tag, attrs = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v !== undefined && v !== null) el.setAttribute(k, v);
    }
    return el;
  }

  function htmlEl(tag, attrs = {}, text = '') {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'className') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else el.setAttribute(k, v);
    }
    if (text) el.textContent = text;
    return el;
  }

  function removeChildren(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  // --- Simple Event Emitter ---
  class EventEmitter {
    constructor() {
      this._listeners = {};
    }
    on(event, fn) {
      (this._listeners[event] || (this._listeners[event] = [])).push(fn);
      return this;
    }
    off(event, fn) {
      const list = this._listeners[event];
      if (list) this._listeners[event] = list.filter(f => f !== fn);
      return this;
    }
    emit(event, ...args) {
      const list = this._listeners[event];
      if (list) list.forEach(fn => fn(...args));
      return this;
    }
  }

  // --- Debounce ---
  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // --- Deep clone ---
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // --- Rich Text utilities ---
  const RichText = (() => {
    const ALLOWED_TAGS = new Set(['B', 'I', 'U', 'SPAN', 'BR']);
    const HTML_TAG_RE = /<\/?(?:b|i|u|strong|em|span|br)\b[^>]*>/i;

    function isRichText(text) {
      return typeof text === 'string' && HTML_TAG_RE.test(text);
    }

    function plainTextToHtml(text) {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
    }

    function htmlToPlainText(html) {
      const div = document.createElement('div');
      div.innerHTML = html;
      // Convert <br> to newlines before extracting text
      div.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
      return div.textContent || '';
    }

    function sanitizeHtml(html) {
      const div = document.createElement('div');
      div.innerHTML = html;

      // Normalize <strong> → <b>, <em> → <i>
      div.querySelectorAll('strong').forEach(el => {
        const b = document.createElement('b');
        b.innerHTML = el.innerHTML;
        el.replaceWith(b);
      });
      div.querySelectorAll('em').forEach(el => {
        const i = document.createElement('i');
        i.innerHTML = el.innerHTML;
        el.replaceWith(i);
      });

      // Normalize CSS font-weight/style spans to tags
      div.querySelectorAll('span').forEach(el => {
        let inner = el.innerHTML;
        const style = el.style;
        if (style.fontWeight === 'bold' || parseInt(style.fontWeight) >= 700) {
          inner = '<b>' + inner + '</b>';
          el.style.fontWeight = '';
        }
        if (style.fontStyle === 'italic') {
          inner = '<i>' + inner + '</i>';
          el.style.fontStyle = '';
        }
        if (style.textDecoration && style.textDecoration.includes('underline')) {
          inner = '<u>' + inner + '</u>';
          el.style.textDecoration = '';
        }
        el.innerHTML = inner;
      });

      // Convert block elements (div, p) to <br> before stripping
      div.querySelectorAll('div, p').forEach(el => {
        // Insert a <br> before the block element (unless it's the first child)
        if (el.previousSibling) {
          el.parentNode.insertBefore(document.createElement('br'), el);
        }
        // Unwrap the element
        while (el.firstChild) {
          el.parentNode.insertBefore(el.firstChild, el);
        }
        el.remove();
      });

      // Walk the tree and strip disallowed tags (keep their children)
      function cleanNode(node) {
        const children = Array.from(node.childNodes);
        for (const child of children) {
          if (child.nodeType === Node.ELEMENT_NODE) {
            if (!ALLOWED_TAGS.has(child.tagName)) {
              // Unwrap: replace element with its children
              while (child.firstChild) {
                node.insertBefore(child.firstChild, child);
              }
              node.removeChild(child);
            } else {
              // For SPAN, only keep color style attribute
              if (child.tagName === 'SPAN') {
                const color = child.style.color;
                // Remove all attributes
                while (child.attributes.length > 0) {
                  child.removeAttribute(child.attributes[0].name);
                }
                if (color) {
                  child.style.color = color;
                } else {
                  // Span with no color — unwrap it
                  while (child.firstChild) {
                    node.insertBefore(child.firstChild, child);
                  }
                  node.removeChild(child);
                  continue;
                }
              }
              cleanNode(child);
            }
          }
        }
      }
      cleanNode(div);
      return div.innerHTML;
    }

    /**
     * Parse HTML into flat array of styled runs, split by line.
     * Returns array of lines, each line is array of {text, bold, italic, underline, color}.
     */
    function parseHtmlToRuns(html) {
      const div = document.createElement('div');
      div.innerHTML = html;
      const lines = [[]];

      function walk(node, style) {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent;
          if (text) {
            lines[lines.length - 1].push({ text, ...style });
          }
          return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        if (node.tagName === 'BR') {
          lines.push([]);
          return;
        }

        const newStyle = { ...style };
        if (node.tagName === 'B' || node.tagName === 'STRONG') newStyle.bold = true;
        if (node.tagName === 'I' || node.tagName === 'EM') newStyle.italic = true;
        if (node.tagName === 'U') newStyle.underline = true;
        if (node.tagName === 'SPAN' && node.style.color) newStyle.color = node.style.color;

        for (const child of node.childNodes) {
          walk(child, newStyle);
        }
      }

      walk(div, { bold: false, italic: false, underline: false, color: null });
      return lines;
    }

    /**
     * Create SVG <tspan> elements for rich text runs.
     * @param {SVGTextElement} textEl - parent <text> element
     * @param {Array} lines - from parseHtmlToRuns
     * @param {number} textX - x position for tspans
     * @param {number} startY - y position for first line
     * @param {number} lineHeight - line height in px
     * @param {object} baseStyle - shape.textStyle defaults
     */
    function appendTspansToTextEl(textEl, lines, textX, startY, lineHeight, baseStyle) {
      lines.forEach((runs, lineIdx) => {
        if (runs.length === 0) {
          // Empty line — add a blank tspan to preserve spacing
          const tspan = svgEl('tspan', { x: textX });
          tspan.textContent = '\u00A0';
          if (lineIdx === 0) tspan.setAttribute('y', startY);
          else tspan.setAttribute('dy', lineHeight);
          textEl.appendChild(tspan);
          return;
        }
        runs.forEach((run, runIdx) => {
          const attrs = { };
          // Set x and y/dy only on the first run of each line
          if (runIdx === 0) {
            attrs.x = textX;
            if (lineIdx === 0) {
              // will be set as y attribute
            } else {
              attrs.dy = lineHeight;
            }
          }
          if (run.bold) attrs['font-weight'] = 'bold';
          else if (baseStyle.fontWeight !== 'bold') attrs['font-weight'] = baseStyle.fontWeight || 'normal';
          if (run.italic) attrs['font-style'] = 'italic';
          else if (baseStyle.fontStyle !== 'italic') attrs['font-style'] = baseStyle.fontStyle || 'normal';
          if (run.underline) attrs['text-decoration'] = 'underline';
          if (run.color) attrs.fill = run.color;

          const tspan = svgEl('tspan', attrs);
          if (lineIdx === 0 && runIdx === 0) tspan.setAttribute('y', startY);
          tspan.textContent = run.text;
          textEl.appendChild(tspan);
        });
      });
    }

    /**
     * Check if HTML content is equivalent to plain text (no real formatting).
     */
    function isPlainEquivalent(html) {
      // Strip <br> and check if any other tags remain
      const stripped = html.replace(/<br\s*\/?>/gi, '\n');
      return !/<[^>]+>/.test(stripped);
    }

    /**
     * Normalize a color string to a comparable form.
     * Converts rgb(r,g,b) and hex to lowercase 6-digit hex.
     */
    function normalizeColor(c) {
      if (!c) return '';
      c = c.trim().toLowerCase();
      // rgb(r, g, b) → hex
      const m = c.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
      if (m) {
        return '#' + [m[1], m[2], m[3]].map(v => parseInt(v).toString(16).padStart(2, '0')).join('');
      }
      // 3-digit hex → 6-digit
      if (/^#[0-9a-f]{3}$/.test(c)) {
        return '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
      }
      return c;
    }

    /**
     * Strip spans whose only formatting is the default text color.
     */
    function stripDefaultColorSpans(html, defaultColor) {
      if (!defaultColor) return html;
      const div = document.createElement('div');
      div.innerHTML = html;
      const normDefault = normalizeColor(defaultColor);
      div.querySelectorAll('span').forEach(span => {
        const spanColor = span.style.color;
        if (spanColor && normalizeColor(spanColor) === normDefault) {
          // This span only has the default color — unwrap it
          while (span.firstChild) {
            span.parentNode.insertBefore(span.firstChild, span);
          }
          span.remove();
        }
      });
      return div.innerHTML;
    }

    /**
     * Convert HTML back to plain text if it has no formatting.
     * Returns plain text if no formatting, or original HTML if it has formatting.
     * @param {string} html - the raw HTML from contenteditable
     * @param {string} [defaultColor] - the shape's default text color to strip
     */
    function normalizeText(html, defaultColor) {
      if (!isRichText(html)) {
        // Decode HTML entities (e.g. &amp; → &) from contenteditable
        return htmlToPlainText(html);
      }
      let sanitized = sanitizeHtml(html);
      // Strip spans that only carry the default text color
      if (defaultColor) {
        sanitized = stripDefaultColorSpans(sanitized, defaultColor);
      }
      if (isPlainEquivalent(sanitized)) {
        return htmlToPlainText(sanitized);
      }
      return sanitized;
    }

    return {
      isRichText, plainTextToHtml, htmlToPlainText,
      sanitizeHtml, parseHtmlToRuns, appendTspansToTextEl,
      isPlainEquivalent, normalizeText
    };
  })();

  // ===== Text Wrapping =====
  const _measureCanvas = document.createElement('canvas');
  const _measureCtx = _measureCanvas.getContext('2d');

  function measureTextWidth(text, fontSize, fontFamily, fontWeight) {
    _measureCtx.font = `${fontWeight || 'normal'} ${fontSize}px ${fontFamily || 'sans-serif'}`;
    return _measureCtx.measureText(text).width;
  }

  function wrapText(text, maxWidth, fontSize, fontFamily, fontWeight) {
    if (!text || maxWidth <= 0) return [text || ''];
    const lines = text.split('\n');
    const wrapped = [];
    for (const line of lines) {
      if (line === '') { wrapped.push(''); continue; }
      const words = line.split(/(\s+)/);
      let current = '';
      for (const word of words) {
        const test = current + word;
        if (current && measureTextWidth(test, fontSize, fontFamily, fontWeight) > maxWidth) {
          wrapped.push(current);
          current = word.replace(/^\s+/, '');
        } else {
          current = test;
        }
      }
      if (current) wrapped.push(current);
    }
    return wrapped.length ? wrapped : [''];
  }

  return {
    uid, distance, midpoint, clamp, snapToGrid,
    pointInRect, rectsOverlap, rectContains, expandRect, getBoundingRect,
    lineIntersectsRect, lineSegmentIntersection, rotatePoint, manhattan,
    hexToRgb, rgbToHex, svgEl, htmlEl, removeChildren,
    EventEmitter, debounce, deepClone, RichText,
    measureTextWidth, wrapText
  };
})();
