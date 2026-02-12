// FlowCraft - Shape Registry & Definitions
// Each shape type defines: category, type, label, icon, defaultSize, ports, render()
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

const Shapes = (() => {
  const registry = new Map();

  function register(def) {
    registry.set(def.type, def);
  }

  function get(type) {
    return registry.get(type) || registry.get('basic:rectangle');
  }

  function getAll() {
    return Array.from(registry.values());
  }

  function getByCategory(category) {
    return getAll().filter(d => d.category === category);
  }

  function getCategories() {
    const cats = [];
    const seen = new Set();
    for (const d of registry.values()) {
      if (!seen.has(d.category)) {
        seen.add(d.category);
        cats.push(d.category);
      }
    }
    return cats;
  }

  // Standard 4-port definition
  function stdPorts() {
    return [
      { id: 'top', side: 'top', offset: 0.5 },
      { id: 'right', side: 'right', offset: 0.5 },
      { id: 'bottom', side: 'bottom', offset: 0.5 },
      { id: 'left', side: 'left', offset: 0.5 }
    ];
  }

  // Get port world position for a shape
  function getPortPosition(shape, port) {
    const cx = shape.x + shape.width / 2;
    const cy = shape.y + shape.height / 2;
    switch (port.side) {
      case 'top': return { x: shape.x + shape.width * port.offset, y: shape.y };
      case 'bottom': return { x: shape.x + shape.width * port.offset, y: shape.y + shape.height };
      case 'left': return { x: shape.x, y: shape.y + shape.height * port.offset };
      case 'right': return { x: shape.x + shape.width, y: shape.y + shape.height * port.offset };
      default: return { x: cx, y: cy };
    }
  }

  function getPortDirection(port) {
    switch (port.side) {
      case 'top': return { x: 0, y: -1 };
      case 'bottom': return { x: 0, y: 1 };
      case 'left': return { x: -1, y: 0 };
      case 'right': return { x: 1, y: 0 };
      default: return { x: 0, y: 0 };
    }
  }

  // ---- Palette icon SVG (small preview) ----
  function paletteIcon(pathD, viewBox = '0 0 36 36') {
    return `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
      <path d="${pathD}" fill="#ffffff" stroke="#1a7a4c" stroke-width="1.5"/>
    </svg>`;
  }

  function paletteIconMulti(elements, viewBox = '0 0 36 36') {
    return `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">${elements}</svg>`;
  }

  // ============================================================
  // BASIC SHAPES
  // ============================================================
  register({
    category: 'Basic', type: 'basic:rectangle', label: 'Rectangle',
    defaultSize: { width: 140, height: 80 },
    ports: stdPorts(),
    icon: paletteIcon('M4 6h28v24H4z'),
    render(s) {
      return `<rect x="0" y="0" width="${s.width}" height="${s.height}" rx="2"/>`;
    }
  });

  register({
    category: 'Basic', type: 'basic:rounded-rect', label: 'Rounded Rect',
    defaultSize: { width: 140, height: 80 },
    ports: stdPorts(),
    icon: paletteIcon('M10 6h16a6 6 0 016 6v12a6 6 0 01-6 6H10a6 6 0 01-6-6V12a6 6 0 016-6z'),
    render(s) {
      const r = Math.min(12, s.width / 4, s.height / 4);
      return `<rect x="0" y="0" width="${s.width}" height="${s.height}" rx="${r}"/>`;
    }
  });

  register({
    category: 'Basic', type: 'basic:circle', label: 'Circle',
    defaultSize: { width: 100, height: 100 },
    ports: stdPorts(),
    icon: paletteIcon('M18 6a12 12 0 100 24 12 12 0 000-24z'),
    render(s) {
      const rx = s.width / 2, ry = s.height / 2;
      return `<ellipse cx="${rx}" cy="${ry}" rx="${rx}" ry="${ry}"/>`;
    }
  });

  register({
    category: 'Basic', type: 'basic:ellipse', label: 'Ellipse',
    defaultSize: { width: 140, height: 90 },
    ports: stdPorts(),
    icon: paletteIcon('M18 8c7.7 0 14 4.5 14 10s-6.3 10-14 10S4 23.5 4 18 10.3 8 18 8z'),
    render(s) {
      const rx = s.width / 2, ry = s.height / 2;
      return `<ellipse cx="${rx}" cy="${ry}" rx="${rx}" ry="${ry}"/>`;
    }
  });

  register({
    category: 'Basic', type: 'basic:triangle', label: 'Triangle',
    defaultSize: { width: 120, height: 100 },
    ports: stdPorts(),
    icon: paletteIcon('M18 6L4 30h28z'),
    render(s) {
      return `<polygon points="${s.width/2},0 ${s.width},${s.height} 0,${s.height}"/>`;
    }
  });

  register({
    category: 'Basic', type: 'basic:diamond', label: 'Diamond',
    defaultSize: { width: 120, height: 100 },
    ports: stdPorts(),
    icon: paletteIcon('M18 4L34 18 18 32 2 18z'),
    render(s) {
      return `<polygon points="${s.width/2},0 ${s.width},${s.height/2} ${s.width/2},${s.height} 0,${s.height/2}"/>`;
    }
  });

  register({
    category: 'Basic', type: 'basic:parallelogram', label: 'Parallelogram',
    defaultSize: { width: 140, height: 80 },
    ports: stdPorts(),
    icon: paletteIcon('M10 6h22l-6 24H4z'),
    render(s) {
      const offset = s.width * 0.15;
      return `<polygon points="${offset},0 ${s.width},0 ${s.width - offset},${s.height} 0,${s.height}"/>`;
    }
  });

  register({
    category: 'Basic', type: 'basic:star', label: 'Star',
    defaultSize: { width: 110, height: 110 },
    ports: stdPorts(),
    icon: (() => {
      const pts = [];
      for (let i = 0; i < 5; i++) {
        const ao = -Math.PI / 2 + i * 2 * Math.PI / 5;
        const ai = ao + Math.PI / 5;
        pts.push(`${18 + 14 * Math.cos(ao)},${18 + 14 * Math.sin(ao)}`);
        pts.push(`${18 + 6 * Math.cos(ai)},${18 + 6 * Math.sin(ai)}`);
      }
      return paletteIcon(`M${pts.join('L')}Z`);
    })(),
    render(s) {
      const cx = s.width / 2, cy = s.height / 2;
      const ro = Math.min(cx, cy), ri = ro * 0.4;
      const pts = [];
      for (let i = 0; i < 5; i++) {
        const ao = -Math.PI / 2 + i * 2 * Math.PI / 5;
        const ai = ao + Math.PI / 5;
        pts.push(`${cx + ro * Math.cos(ao)},${cy + ro * Math.sin(ao)}`);
        pts.push(`${cx + ri * Math.cos(ai)},${cy + ri * Math.sin(ai)}`);
      }
      return `<polygon points="${pts.join(' ')}"/>`;
    }
  });

  register({
    category: 'Basic', type: 'basic:hexagon', label: 'Hexagon',
    defaultSize: { width: 130, height: 110 },
    ports: stdPorts(),
    icon: (() => {
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3 - Math.PI / 6;
        pts.push(`${18 + 13 * Math.cos(a)},${18 + 13 * Math.sin(a)}`);
      }
      return paletteIcon(`M${pts.join('L')}Z`);
    })(),
    render(s) {
      const cx = s.width / 2, cy = s.height / 2;
      const rx = s.width / 2, ry = s.height / 2;
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3 - Math.PI / 6;
        pts.push(`${cx + rx * Math.cos(a)},${cy + ry * Math.sin(a)}`);
      }
      return `<polygon points="${pts.join(' ')}"/>`;
    }
  });

  register({
    category: 'Basic', type: 'basic:arrow-shape', label: 'Arrow',
    defaultSize: { width: 140, height: 70 },
    ports: stdPorts(),
    icon: paletteIcon('M4 12h18v-6l10 12-10 12v-6H4z'),
    render(s) {
      const w = s.width, h = s.height;
      const notch = w * 0.3;
      const arm = h * 0.25;
      return `<polygon points="0,${arm} ${w - notch},${arm} ${w - notch},0 ${w},${h/2} ${w - notch},${h} ${w - notch},${h - arm} 0,${h - arm}"/>`;
    }
  });

  // ============================================================
  // FLOWCHART SHAPES
  // ============================================================
  register({
    category: 'Flowchart', type: 'flowchart:process', label: 'Process',
    defaultSize: { width: 140, height: 70 },
    ports: stdPorts(),
    icon: paletteIcon('M4 8h28v20H4z'),
    render(s) {
      return `<rect x="0" y="0" width="${s.width}" height="${s.height}"/>`;
    }
  });

  register({
    category: 'Flowchart', type: 'flowchart:decision', label: 'Decision',
    defaultSize: { width: 130, height: 100 },
    ports: stdPorts(),
    icon: paletteIcon('M18 4L34 18 18 32 2 18z'),
    render(s) {
      return `<polygon points="${s.width/2},0 ${s.width},${s.height/2} ${s.width/2},${s.height} 0,${s.height/2}"/>`;
    }
  });

  register({
    category: 'Flowchart', type: 'flowchart:terminal', label: 'Start/End',
    defaultSize: { width: 140, height: 60 },
    ports: stdPorts(),
    icon: paletteIcon('M12 8h12a10 10 0 010 20H12a10 10 0 010-20z'),
    render(s) {
      const r = s.height / 2;
      return `<rect x="0" y="0" width="${s.width}" height="${s.height}" rx="${r}"/>`;
    }
  });

  register({
    category: 'Flowchart', type: 'flowchart:io', label: 'Input/Output',
    defaultSize: { width: 140, height: 70 },
    ports: stdPorts(),
    icon: paletteIcon('M10 8h24l-8 20H2z'),
    render(s) {
      const off = s.width * 0.15;
      return `<polygon points="${off},0 ${s.width},0 ${s.width - off},${s.height} 0,${s.height}"/>`;
    }
  });

  register({
    category: 'Flowchart', type: 'flowchart:document', label: 'Document',
    defaultSize: { width: 140, height: 80 },
    ports: stdPorts(),
    icon: paletteIcon('M4 8h28v16c-4.7 4-9.3 4-14 0s-9.3-4-14 0z'),
    render(s) {
      const w = s.width, h = s.height;
      const wave = h * 0.15;
      return `<path d="M0,0 L${w},0 L${w},${h - wave} C${w*0.75},${h - wave*3} ${w*0.5},${h + wave} ${w*0.25},${h - wave} C${w*0.125},${h - wave*2} 0,${h - wave*0.5} 0,${h - wave} Z"/>`;
    }
  });

  register({
    category: 'Flowchart', type: 'flowchart:predefined', label: 'Predefined Process',
    defaultSize: { width: 140, height: 70 },
    ports: stdPorts(),
    icon: paletteIconMulti(`<rect x="4" y="8" width="28" height="20" fill="#ffffff" stroke="#1a7a4c" stroke-width="1.5"/>
      <line x1="8" y1="8" x2="8" y2="28" stroke="#1a7a4c" stroke-width="1"/>
      <line x1="28" y1="8" x2="28" y2="28" stroke="#1a7a4c" stroke-width="1"/>`),
    render(s) {
      const w = s.width, h = s.height, band = w * 0.1;
      return `<rect x="0" y="0" width="${w}" height="${h}"/>
        <line x1="${band}" y1="0" x2="${band}" y2="${h}" stroke="inherit" stroke-width="1"/>
        <line x1="${w - band}" y1="0" x2="${w - band}" y2="${h}" stroke="inherit" stroke-width="1"/>`;
    }
  });

  register({
    category: 'Flowchart', type: 'flowchart:manual-op', label: 'Manual Operation',
    defaultSize: { width: 140, height: 70 },
    ports: stdPorts(),
    icon: paletteIcon('M4 8h28l-4 20H8z'),
    render(s) {
      const inset = s.width * 0.12;
      return `<polygon points="0,0 ${s.width},0 ${s.width - inset},${s.height} ${inset},${s.height}"/>`;
    }
  });

  register({
    category: 'Flowchart', type: 'flowchart:database', label: 'Database',
    defaultSize: { width: 100, height: 110 },
    ports: stdPorts(),
    icon: paletteIconMulti(`<ellipse cx="18" cy="11" rx="13" ry="5" fill="#ffffff" stroke="#1a7a4c" stroke-width="1.5"/>
      <path d="M5 11v14c0 2.8 5.8 5 13 5s13-2.2 13-5V11" fill="#ffffff" stroke="#1a7a4c" stroke-width="1.5"/>`),
    render(s) {
      const w = s.width, h = s.height;
      const ry = Math.min(h * 0.12, 18);
      return `<path d="M0,${ry}
        A${w/2},${ry} 0 0,1 ${w},${ry}
        L${w},${h - ry}
        A${w/2},${ry} 0 0,1 0,${h - ry} Z"/>
        <ellipse cx="${w/2}" cy="${ry}" rx="${w/2}" ry="${ry}"/>`;
    }
  });

  register({
    category: 'Flowchart', type: 'flowchart:delay', label: 'Delay',
    defaultSize: { width: 140, height: 70 },
    ports: stdPorts(),
    icon: paletteIcon('M4 8h18a10 10 0 010 20H4z'),
    render(s) {
      const w = s.width, h = s.height;
      const r = h / 2;
      return `<path d="M0,0 L${w - r},0 A${r},${r} 0 0,1 ${w - r},${h} L0,${h} Z"/>`;
    }
  });

  register({
    category: 'Flowchart', type: 'flowchart:manual-input', label: 'Manual Input',
    defaultSize: { width: 140, height: 70 },
    ports: stdPorts(),
    icon: paletteIcon('M4 14h28v16H4z'),
    render(s) {
      const top = s.height * 0.2;
      return `<polygon points="0,${top} ${s.width},0 ${s.width},${s.height} 0,${s.height}"/>`;
    }
  });

  register({
    category: 'Flowchart', type: 'flowchart:merge', label: 'Merge',
    defaultSize: { width: 100, height: 80 },
    ports: stdPorts(),
    icon: paletteIcon('M4 6h28L18 30z'),
    render(s) {
      return `<polygon points="0,0 ${s.width},0 ${s.width/2},${s.height}"/>`;
    }
  });

  register({
    category: 'Flowchart', type: 'flowchart:swim-lane', label: 'Swim Lane',
    defaultSize: { width: 800, height: 180 },
    customText: true,
    ports: stdPorts(),
    icon: paletteIconMulti(`<rect x="2" y="6" width="32" height="24" fill="#ffffff" stroke="#1a7a4c" stroke-width="1.2" rx="1"/>
      <line x1="10" y1="6" x2="10" y2="30" stroke="#1a7a4c" stroke-width="0.8"/>
      <line x1="2" y1="18" x2="32" y2="18" stroke="#1a7a4c" stroke-width="0.6"/>`),
    getLaneAtY(s, localY) {
      const lanes = (s.data && s.data.lanes) || [];
      if (lanes.length === 0) return -1;
      const laneH = s.height / lanes.length;
      return Math.min(Math.floor(localY / laneH), lanes.length - 1);
    },
    getLaneY(s, idx) {
      const lanes = (s.data && s.data.lanes) || [];
      if (lanes.length === 0) return 0;
      return (s.height / lanes.length) * idx;
    },
    getHeaderWidth(s) {
      const numW = (s.data && s.data.numberWidth) || 28;
      const nameW = (s.data && s.data.nameWidth) || 85;
      return numW + nameW;
    },
    render(s) {
      const lanes = (s.data && s.data.lanes) || [];
      const numW = (s.data && s.data.numberWidth) || 28;
      const nameW = (s.data && s.data.nameWidth) || 85;
      const headerW = numW + nameW;
      const w = s.width, h = s.height;
      const fs = s.textStyle ? s.textStyle.fontSize : 11;
      const fw = s.textStyle ? s.textStyle.fontWeight : 'bold';
      const ff = s.textStyle ? s.textStyle.fontFamily : 'MaruBuri, Inter, system-ui, sans-serif';
      const fst = s.textStyle ? (s.textStyle.fontStyle || 'normal') : 'normal';
      const td = s.textStyle ? (s.textStyle.textDecoration || 'none') : 'none';

      if (lanes.length === 0) {
        // Single empty lane fallback
        return `<rect x="0" y="0" width="${w}" height="${h}" rx="2"/>
          <line x1="${headerW}" y1="0" x2="${headerW}" y2="${h}" stroke="inherit" stroke-width="1"/>`;
      }

      const laneH = h / lanes.length;
      let svg = '';

      lanes.forEach((lane, i) => {
        const y = laneH * i;
        const color = lane.color || '#ffffff';
        const textColor = lane.textColor || '#333333';
        const num = lane.number || '';
        const name = lane.name || '';

        // Lane background
        svg += `<rect x="${headerW}" y="${y}" width="${w - headerW}" height="${laneH}" fill="#ffffff" stroke="none"/>`;
        // Number cell
        svg += `<rect x="0" y="${y}" width="${numW}" height="${laneH}" fill="#f5f5f8" stroke="none"/>`;
        // Name cell with lane color
        svg += `<rect x="${numW}" y="${y}" width="${nameW}" height="${laneH}" fill="${color}" stroke="none"/>`;

        // Number text
        if (num) {
          svg += `<text x="${numW/2}" y="${y + laneH/2}" text-anchor="middle" dominant-baseline="central" fill="#333333" stroke="none" font-size="${fs}" font-weight="${fw}" font-family="${ff}" font-style="${fst}" text-decoration="${td}">${num}</text>`;
        }
        // Name text (multi-line)
        if (name) {
          const lines = name.split('\n');
          const lh = fs * 1.3;
          const startY = y + laneH / 2 - (lines.length - 1) * lh / 2;
          lines.forEach((line, li) => {
            svg += `<text x="${numW + nameW/2}" y="${startY + li * lh}" text-anchor="middle" dominant-baseline="central" fill="${textColor}" stroke="none" font-size="${fs}" font-weight="${fw}" font-family="${ff}" font-style="${fst}" text-decoration="${td}">${line}</text>`;
          });
        }

        // Row border
        svg += `<rect x="0" y="${y}" width="${w}" height="${laneH}" fill="none"/>`;
      });

      // Overall border
      svg += `<rect x="0" y="0" width="${w}" height="${h}" fill="none" rx="1"/>`;
      // Vertical dividers
      svg += `<line x1="${numW}" y1="0" x2="${numW}" y2="${h}" stroke="inherit" stroke-width="0.5"/>`;
      svg += `<line x1="${headerW}" y1="0" x2="${headerW}" y2="${h}" stroke="inherit" stroke-width="0.5"/>`;

      return svg;
    }
  });

  register({
    category: 'Flowchart', type: 'flowchart:timeline', label: 'Timeline',
    defaultSize: { width: 800, height: 40 },
    ports: [],
    defaultData() {
      const y = new Date().getFullYear();
      return { timelineType: 'line', startDate: `${y}-01-01`, endDate: `${y}-12-31` };
    },
    icon: paletteIconMulti(`<circle cx="2" cy="17" r="2" fill="#999" stroke="none"/>
      <line x1="2" y1="17" x2="33" y2="17" stroke="#555555" stroke-width="1.2"/>
      <polygon points="35,17 32,14.5 32,19.5" fill="#555555" stroke="none"/>
      <line x1="9" y1="13" x2="9" y2="21" stroke="#555555" stroke-width="0.7" opacity="0.6"/>
      <line x1="16" y1="13" x2="16" y2="21" stroke="#555555" stroke-width="0.7" opacity="0.6"/>
      <line x1="23" y1="13" x2="23" y2="21" stroke="#555555" stroke-width="0.7" opacity="0.6"/>
      <line x1="30" y1="13" x2="30" y2="21" stroke="#555555" stroke-width="0.7" opacity="0.6"/>`),
    defaultStyle: { stroke: '#555555' },
    defaultTextStyle: { fontSize: 9 },
    render(s) {
      const w = s.width, h = s.height;
      const guideH = (s.data && s.data.guideHeight) || 0;
      const tlType = (s.data && s.data.timelineType) || 'block';
      const markers = (s.data && s.data.markers) || 'months';
      const labelFormat = (s.data && s.data.labelFormat) || 'M/D';
      const showLabels = tlType === 'block' ? (s.data && s.data.showLabels !== false) : !!(s.data && s.data.showLabels);
      const fontSize = (s.textStyle && s.textStyle.fontSize) || 9;

      const parseD = ds => { const [y,m,d] = ds.split('-').map(Number); return new Date(y,m-1,d); };

      function formatDate(dt) {
        const m = dt.getMonth() + 1, d = dt.getDate(), y = dt.getFullYear();
        switch (labelFormat) {
          case 'YYYY/M/D': return `${y}/${m}/${d}`;
          case 'M/D/YYYY': return `${m}/${d}/${y}`;
          case 'D/M': return `${d}/${m}`;
          case 'D/M/YYYY': return `${d}/${m}/${y}`;
          case 'M/D':
          default: return `${m}/${d}`;
        }
      }

      function generateTicks(startDt, endDt) {
        const ticks = [];
        let d;
        switch (markers) {
          case 'days':
            d = new Date(startDt); d.setDate(d.getDate() + 1);
            while (d.getTime() < endDt.getTime()) { ticks.push(new Date(d)); d.setDate(d.getDate() + 1); }
            break;
          case 'weeks':
            d = new Date(startDt);
            d.setDate(d.getDate() + (7 - d.getDay()) % 7 || 7);
            while (d.getTime() < endDt.getTime()) { ticks.push(new Date(d)); d.setDate(d.getDate() + 7); }
            break;
          case 'years':
            d = new Date(startDt.getFullYear() + 1, 0, 1);
            while (d.getTime() < endDt.getTime()) { ticks.push(new Date(d)); d.setFullYear(d.getFullYear() + 1); }
            break;
          case 'months':
          default:
            d = new Date(startDt.getFullYear(), startDt.getMonth() + 1, 1);
            while (d.getTime() < endDt.getTime()) { ticks.push(new Date(d)); d.setMonth(d.getMonth() + 1); }
            break;
        }
        return ticks;
      }

      if (tlType === 'line') {
        const midY = h / 2;
        const tickH = h * 0.4;
        const arrowSize = 8;
        const strokeColor = s.style.stroke !== 'none' ? s.style.stroke : '#555555';
        let svg = `<rect x="0" y="0" width="${w}" height="${h}" fill="none" stroke="none"/>`;
        svg += `<line x1="0" y1="${midY}" x2="${w - arrowSize}" y2="${midY}" stroke="${strokeColor}" stroke-width="${Math.max(s.style.strokeWidth || 1.5, 1)}" fill="none"/>`;
        svg += `<polygon points="${w},${midY} ${w - arrowSize},${midY - arrowSize/2} ${w - arrowSize},${midY + arrowSize/2}" fill="${strokeColor}" stroke="none"/>`;
        svg += `<circle cx="0" cy="${midY}" r="3.5" fill="#b0b0b0" stroke="none"/>`;

        if (s.data && s.data.startDate && s.data.endDate) {
          const sd = parseD(s.data.startDate), ed = parseD(s.data.endDate);
          const startMs = sd.getTime(), endMs = ed.getTime(), totalMs = endMs - startMs;
          if (totalMs > 0) {
            const lineW = w - arrowSize;
            if (showLabels) svg += `<text x="6" y="${midY - tickH - 4}" fill="#555555" stroke="none" font-size="${fontSize}" font-family="MaruBuri,Inter,sans-serif">${formatDate(sd)}</text>`;
            const ticks = generateTicks(sd, ed);
            ticks.forEach(tick => {
              const x = ((tick.getTime() - startMs) / totalMs) * lineW;
              svg += `<line x1="${x}" y1="${midY - tickH}" x2="${x}" y2="${midY + tickH}" fill="none" stroke="${strokeColor}" stroke-width="0.5" opacity="0.5"/>`;
              if (guideH > 0) svg += `<line x1="${x}" y1="${midY + tickH}" x2="${x}" y2="${h + guideH}" fill="none" stroke="#d0d0d8" stroke-width="0.8" opacity="0.4"/>`;
              if (showLabels) svg += `<text x="${x+3}" y="${midY - tickH - 4}" fill="#555555" stroke="none" font-size="${fontSize}" font-family="MaruBuri,Inter,sans-serif">${formatDate(tick)}</text>`;
            });
            if (showLabels) svg += `<text x="${lineW - 3}" y="${midY - tickH - 4}" fill="#555555" stroke="none" font-size="${fontSize}" font-family="MaruBuri,Inter,sans-serif" text-anchor="end">${formatDate(ed)}</text>`;
          }
        }
        return svg;
      }

      // Block timeline (default): filled rectangle bar with ticks
      let svg = `<rect x="0" y="0" width="${w}" height="${h}" rx="2"/>`;
      if (s.data && s.data.startDate && s.data.endDate) {
        const sd = parseD(s.data.startDate), ed = parseD(s.data.endDate);
        const startMs = sd.getTime(), endMs = ed.getTime(), totalMs = endMs - startMs;
        if (totalMs > 0) {
          if (showLabels) svg += `<text x="3" y="${h-4}" fill="#555555" stroke="none" font-size="${fontSize}" font-family="MaruBuri,Inter,sans-serif">${formatDate(sd)}</text>`;
          const ticks = generateTicks(sd, ed);
          ticks.forEach(tick => {
            const x = ((tick.getTime() - startMs) / totalMs) * w;
            svg += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" fill="none" stroke-width="0.5" opacity="0.5"/>`;
            if (guideH > 0) svg += `<line x1="${x}" y1="${h}" x2="${x}" y2="${h + guideH}" fill="none" stroke="#d0d0d8" stroke-width="0.8" opacity="0.4"/>`;
            if (showLabels) svg += `<text x="${x+3}" y="${h-4}" fill="#555555" stroke="none" font-size="${fontSize}" font-family="MaruBuri,Inter,sans-serif">${formatDate(tick)}</text>`;
          });
          if (showLabels) svg += `<text x="${w-3}" y="${h-4}" fill="#555555" stroke="none" font-size="${fontSize}" font-family="MaruBuri,Inter,sans-serif" text-anchor="end">${formatDate(ed)}</text>`;
        }
      }
      return svg;
    }
  });

  // ============================================================
  // UML SHAPES
  // ============================================================
  register({
    category: 'UML', type: 'uml:class', label: 'Class',
    defaultSize: { width: 160, height: 120 },
    ports: stdPorts(),
    icon: paletteIconMulti(`<rect x="4" y="6" width="28" height="24" fill="#ffffff" stroke="#1a7a4c" stroke-width="1.5"/>
      <line x1="4" y1="14" x2="32" y2="14" stroke="#1a7a4c" stroke-width="1"/>
      <line x1="4" y1="22" x2="32" y2="22" stroke="#1a7a4c" stroke-width="1"/>`),
    render(s) {
      const w = s.width, h = s.height;
      const h1 = h / 3, h2 = h * 2 / 3;
      return `<rect x="0" y="0" width="${w}" height="${h}"/>
        <line x1="0" y1="${h1}" x2="${w}" y2="${h1}" stroke="inherit" stroke-width="1"/>
        <line x1="0" y1="${h2}" x2="${w}" y2="${h2}" stroke="inherit" stroke-width="1"/>`;
    }
  });

  register({
    category: 'UML', type: 'uml:interface', label: 'Interface',
    defaultSize: { width: 160, height: 100 },
    ports: stdPorts(),
    icon: paletteIconMulti(`<rect x="4" y="6" width="28" height="24" fill="#ffffff" stroke="#1a7a4c" stroke-width="1.5" stroke-dasharray="4 2"/>
      <line x1="4" y1="14" x2="32" y2="14" stroke="#1a7a4c" stroke-width="1"/>`),
    render(s) {
      const w = s.width, h = s.height;
      const h1 = Math.min(36, h / 3);
      return `<rect x="0" y="0" width="${w}" height="${h}" stroke-dasharray="6 3"/>
        <line x1="0" y1="${h1}" x2="${w}" y2="${h1}" stroke="inherit" stroke-width="1"/>`;
    }
  });

  register({
    category: 'UML', type: 'uml:package', label: 'Package',
    defaultSize: { width: 160, height: 110 },
    ports: stdPorts(),
    icon: paletteIconMulti(`<rect x="4" y="6" width="12" height="6" fill="#ffffff" stroke="#1a7a4c" stroke-width="1.5"/>
      <rect x="4" y="12" width="28" height="18" fill="#ffffff" stroke="#1a7a4c" stroke-width="1.5"/>`),
    render(s) {
      const w = s.width, h = s.height;
      const tabW = w * 0.4, tabH = h * 0.12;
      return `<rect x="0" y="${tabH}" width="${w}" height="${h - tabH}"/>
        <rect x="0" y="0" width="${tabW}" height="${tabH}"/>`;
    }
  });

  register({
    category: 'UML', type: 'uml:note', label: 'Note',
    defaultSize: { width: 140, height: 100 },
    ports: stdPorts(),
    icon: paletteIcon('M4 6h20l8 8v16H4z M24 6v8h8'),
    render(s) {
      const w = s.width, h = s.height, fold = Math.min(20, w * 0.15, h * 0.15);
      return `<path d="M0,0 L${w - fold},0 L${w},${fold} L${w},${h} L0,${h} Z"/>
        <path d="M${w - fold},0 L${w - fold},${fold} L${w},${fold}" fill="none"/>`;
    }
  });

  register({
    category: 'UML', type: 'uml:actor', label: 'Actor',
    defaultSize: { width: 60, height: 100 },
    ports: stdPorts(),
    icon: paletteIconMulti(`<circle cx="18" cy="10" r="4" fill="none" stroke="#1a7a4c" stroke-width="1.5"/>
      <line x1="18" y1="14" x2="18" y2="24" stroke="#1a7a4c" stroke-width="1.5"/>
      <line x1="10" y1="18" x2="26" y2="18" stroke="#1a7a4c" stroke-width="1.5"/>
      <line x1="18" y1="24" x2="12" y2="32" stroke="#1a7a4c" stroke-width="1.5"/>
      <line x1="18" y1="24" x2="24" y2="32" stroke="#1a7a4c" stroke-width="1.5"/>`),
    render(s) {
      const w = s.width, h = s.height;
      const cx = w / 2;
      const headR = Math.min(w * 0.25, h * 0.12);
      const headY = headR + 2;
      const bodyY = headY + headR;
      const hipY = h * 0.6;
      const armY = (bodyY + hipY) * 0.45;
      return `<circle cx="${cx}" cy="${headY}" r="${headR}" fill="none"/>
        <line x1="${cx}" y1="${bodyY}" x2="${cx}" y2="${hipY}"/>
        <line x1="${w * 0.1}" y1="${armY}" x2="${w * 0.9}" y2="${armY}"/>
        <line x1="${cx}" y1="${hipY}" x2="${w * 0.15}" y2="${h}"/>
        <line x1="${cx}" y1="${hipY}" x2="${w * 0.85}" y2="${h}"/>`;
    }
  });

  register({
    category: 'UML', type: 'uml:usecase', label: 'Use Case',
    defaultSize: { width: 150, height: 80 },
    ports: stdPorts(),
    icon: paletteIcon('M18 8c7.7 0 14 4.5 14 10s-6.3 10-14 10S4 23.5 4 18 10.3 8 18 8z'),
    render(s) {
      return `<ellipse cx="${s.width/2}" cy="${s.height/2}" rx="${s.width/2}" ry="${s.height/2}"/>`;
    }
  });

  register({
    category: 'UML', type: 'uml:component', label: 'Component',
    defaultSize: { width: 160, height: 100 },
    ports: stdPorts(),
    icon: paletteIconMulti(`<rect x="8" y="6" width="24" height="24" fill="#ffffff" stroke="#1a7a4c" stroke-width="1.5"/>
      <rect x="4" y="12" width="8" height="4" fill="#ffffff" stroke="#1a7a4c" stroke-width="1"/>
      <rect x="4" y="20" width="8" height="4" fill="#ffffff" stroke="#1a7a4c" stroke-width="1"/>`),
    render(s) {
      const w = s.width, h = s.height;
      const tabW = 14, tabH = 10;
      const tab1Y = h * 0.25, tab2Y = h * 0.55;
      return `<rect x="${tabW/2}" y="0" width="${w - tabW/2}" height="${h}"/>
        <rect x="0" y="${tab1Y}" width="${tabW}" height="${tabH}"/>
        <rect x="0" y="${tab2Y}" width="${tabW}" height="${tabH}"/>`;
    }
  });

  register({
    category: 'UML', type: 'uml:lifeline', label: 'Lifeline',
    defaultSize: { width: 120, height: 160 },
    ports: stdPorts(),
    icon: paletteIconMulti(`<rect x="6" y="6" width="24" height="10" fill="#ffffff" stroke="#1a7a4c" stroke-width="1.5"/>
      <line x1="18" y1="16" x2="18" y2="32" stroke="#1a7a4c" stroke-width="1.5" stroke-dasharray="4 2"/>`),
    render(s) {
      const w = s.width, h = s.height;
      const boxH = Math.min(36, h * 0.2);
      return `<rect x="0" y="0" width="${w}" height="${boxH}"/>
        <line x1="${w/2}" y1="${boxH}" x2="${w/2}" y2="${h}" stroke-dasharray="8 4"/>`;
    }
  });

  // ============================================================
  // NETWORK SHAPES
  // ============================================================
  register({
    category: 'Network', type: 'network:server', label: 'Server',
    defaultSize: { width: 70, height: 100 },
    ports: stdPorts(),
    icon: paletteIconMulti(`<rect x="8" y="6" width="20" height="24" rx="2" fill="#ffffff" stroke="#1a7a4c" stroke-width="1.5"/>
      <line x1="10" y1="12" x2="26" y2="12" stroke="#1a7a4c" stroke-width="1"/>
      <line x1="10" y1="18" x2="26" y2="18" stroke="#1a7a4c" stroke-width="1"/>
      <circle cx="22" cy="9" r="1" fill="#1a7a4c"/><circle cx="22" cy="15" r="1" fill="#1a7a4c"/>`),
    render(s) {
      const w = s.width, h = s.height;
      const rowH = h / 4;
      return `<rect x="0" y="0" width="${w}" height="${h}" rx="3"/>
        <line x1="2" y1="${rowH}" x2="${w-2}" y2="${rowH}"/>
        <line x1="2" y1="${rowH*2}" x2="${w-2}" y2="${rowH*2}"/>
        <line x1="2" y1="${rowH*3}" x2="${w-2}" y2="${rowH*3}"/>
        <circle cx="${w - 8}" cy="${rowH/2}" r="2" fill="currentColor"/>
        <circle cx="${w - 8}" cy="${rowH*1.5}" r="2" fill="currentColor"/>`;
    }
  });

  register({
    category: 'Network', type: 'network:desktop', label: 'Desktop',
    defaultSize: { width: 100, height: 90 },
    ports: stdPorts(),
    icon: paletteIconMulti(`<rect x="6" y="6" width="24" height="16" rx="1" fill="#ffffff" stroke="#1a7a4c" stroke-width="1.5"/>
      <line x1="14" y1="22" x2="22" y2="22" stroke="#1a7a4c" stroke-width="1.5"/>
      <line x1="18" y1="22" x2="18" y2="26" stroke="#1a7a4c" stroke-width="1.5"/>
      <line x1="12" y1="26" x2="24" y2="26" stroke="#1a7a4c" stroke-width="1.5"/>`),
    render(s) {
      const w = s.width, h = s.height;
      const monH = h * 0.65, standH = h * 0.15;
      return `<rect x="0" y="0" width="${w}" height="${monH}" rx="3"/>
        <line x1="${w*0.4}" y1="${monH}" x2="${w*0.6}" y2="${monH}"/>
        <line x1="${w/2}" y1="${monH}" x2="${w/2}" y2="${monH + standH}"/>
        <line x1="${w*0.3}" y1="${h}" x2="${w*0.7}" y2="${h}"/>`;
    }
  });

  register({
    category: 'Network', type: 'network:laptop', label: 'Laptop',
    defaultSize: { width: 110, height: 80 },
    ports: stdPorts(),
    icon: paletteIconMulti(`<rect x="8" y="8" width="20" height="14" rx="1" fill="#ffffff" stroke="#1a7a4c" stroke-width="1.5"/>
      <path d="M4 22h28l-2 6H6z" fill="#ffffff" stroke="#1a7a4c" stroke-width="1.5"/>`),
    render(s) {
      const w = s.width, h = s.height;
      const screenH = h * 0.65;
      const baseH = h * 0.2;
      return `<rect x="${w*0.08}" y="0" width="${w*0.84}" height="${screenH}" rx="3"/>
        <path d="M0,${screenH} L${w},${screenH} L${w*0.9},${h} L${w*0.1},${h} Z"/>`;
    }
  });

  register({
    category: 'Network', type: 'network:cloud', label: 'Cloud',
    defaultSize: { width: 150, height: 100 },
    ports: stdPorts(),
    icon: paletteIcon('M8 26a6 6 0 01-.5-12A8 8 0 0122 10a6 6 0 014 10H8z'),
    render(s) {
      const w = s.width, h = s.height;
      return `<path d="M${w*0.25},${h*0.8}
        a${w*0.15},${h*0.2} 0 0,1 ${-w*0.05},${-h*0.4}
        a${w*0.2},${h*0.2} 0 0,1 ${w*0.2},${-h*0.25}
        a${w*0.15},${h*0.15} 0 0,1 ${w*0.2},${-h*0.05}
        a${w*0.18},${h*0.18} 0 0,1 ${w*0.25},${h*0.1}
        a${w*0.15},${h*0.15} 0 0,1 ${w*0.05},${h*0.3}
        a${w*0.12},${h*0.15} 0 0,1 ${-w*0.15},${h*0.2}
        Z"/>`;
    }
  });

  register({
    category: 'Network', type: 'network:router', label: 'Router',
    defaultSize: { width: 100, height: 60 },
    ports: stdPorts(),
    icon: paletteIconMulti(`<rect x="6" y="12" width="24" height="12" rx="3" fill="#ffffff" stroke="#1a7a4c" stroke-width="1.5"/>
      <circle cx="12" cy="18" r="2" fill="#1a7a4c"/>
      <circle cx="18" cy="18" r="2" fill="#1a7a4c"/>
      <circle cx="24" cy="18" r="2" fill="#1a7a4c"/>`),
    render(s) {
      const w = s.width, h = s.height;
      return `<rect x="0" y="0" width="${w}" height="${h}" rx="${h*0.15}"/>
        <circle cx="${w*0.25}" cy="${h/2}" r="${Math.min(4, h*0.1)}" fill="currentColor"/>
        <circle cx="${w*0.5}" cy="${h/2}" r="${Math.min(4, h*0.1)}" fill="currentColor"/>
        <circle cx="${w*0.75}" cy="${h/2}" r="${Math.min(4, h*0.1)}" fill="currentColor"/>`;
    }
  });

  register({
    category: 'Network', type: 'network:switch', label: 'Switch',
    defaultSize: { width: 120, height: 50 },
    ports: stdPorts(),
    icon: paletteIconMulti(`<rect x="4" y="13" width="28" height="10" rx="2" fill="#ffffff" stroke="#1a7a4c" stroke-width="1.5"/>
      <line x1="8" y1="18" x2="12" y2="18" stroke="#1a7a4c" stroke-width="2"/>
      <line x1="16" y1="18" x2="20" y2="18" stroke="#1a7a4c" stroke-width="2"/>
      <line x1="24" y1="18" x2="28" y2="18" stroke="#1a7a4c" stroke-width="2"/>`),
    render(s) {
      const w = s.width, h = s.height;
      const gap = w / 6;
      let lines = '';
      for (let i = 1; i <= 5; i++) {
        lines += `<line x1="${gap*i - 4}" y1="${h/2}" x2="${gap*i + 4}" y2="${h/2}" stroke-width="2"/>`;
      }
      return `<rect x="0" y="0" width="${w}" height="${h}" rx="4"/>${lines}`;
    }
  });

  register({
    category: 'Network', type: 'network:firewall', label: 'Firewall',
    defaultSize: { width: 90, height: 80 },
    ports: stdPorts(),
    icon: paletteIconMulti(`<rect x="6" y="6" width="24" height="24" fill="#ffffff" stroke="#1a7a4c" stroke-width="1.5"/>
      <line x1="6" y1="14" x2="30" y2="14" stroke="#f07c7c" stroke-width="1.5"/>
      <line x1="6" y1="22" x2="30" y2="22" stroke="#f07c7c" stroke-width="1.5"/>
      <line x1="14" y1="6" x2="14" y2="30" stroke="#f07c7c" stroke-width="1.5"/>
      <line x1="22" y1="6" x2="22" y2="30" stroke="#f07c7c" stroke-width="1.5"/>`),
    render(s) {
      const w = s.width, h = s.height;
      return `<rect x="0" y="0" width="${w}" height="${h}" rx="2"/>
        <line x1="0" y1="${h*0.33}" x2="${w}" y2="${h*0.33}" stroke="#f07c7c" stroke-width="1"/>
        <line x1="0" y1="${h*0.66}" x2="${w}" y2="${h*0.66}" stroke="#f07c7c" stroke-width="1"/>
        <line x1="${w*0.33}" y1="0" x2="${w*0.33}" y2="${h}" stroke="#f07c7c" stroke-width="1"/>
        <line x1="${w*0.66}" y1="0" x2="${w*0.66}" y2="${h}" stroke="#f07c7c" stroke-width="1"/>`;
    }
  });

  register({
    category: 'Network', type: 'network:database', label: 'Database',
    defaultSize: { width: 80, height: 100 },
    ports: stdPorts(),
    icon: paletteIconMulti(`<ellipse cx="18" cy="11" rx="12" ry="5" fill="#ffffff" stroke="#1a7a4c" stroke-width="1.5"/>
      <path d="M6 11v14c0 2.8 5.4 5 12 5s12-2.2 12-5V11" fill="#ffffff" stroke="#1a7a4c" stroke-width="1.5"/>`),
    render(s) {
      const w = s.width, h = s.height;
      const ry = Math.min(h * 0.12, 18);
      return `<path d="M0,${ry} A${w/2},${ry} 0 0,1 ${w},${ry} L${w},${h - ry} A${w/2},${ry} 0 0,1 0,${h - ry} Z"/>
        <ellipse cx="${w/2}" cy="${ry}" rx="${w/2}" ry="${ry}"/>`;
    }
  });

  register({
    category: 'Network', type: 'network:mobile', label: 'Mobile',
    defaultSize: { width: 60, height: 100 },
    ports: stdPorts(),
    icon: paletteIconMulti(`<rect x="10" y="4" width="16" height="28" rx="3" fill="#ffffff" stroke="#1a7a4c" stroke-width="1.5"/>
      <line x1="10" y1="9" x2="26" y2="9" stroke="#1a7a4c" stroke-width="1"/>
      <line x1="10" y1="27" x2="26" y2="27" stroke="#1a7a4c" stroke-width="1"/>`),
    render(s) {
      const w = s.width, h = s.height;
      const r = Math.min(8, w * 0.12);
      return `<rect x="0" y="0" width="${w}" height="${h}" rx="${r}"/>
        <line x1="0" y1="${h*0.1}" x2="${w}" y2="${h*0.1}"/>
        <line x1="0" y1="${h*0.88}" x2="${w}" y2="${h*0.88}"/>`;
    }
  });

  // ============================================================
  // ORG CHART
  // ============================================================
  register({
    category: 'Org Chart', type: 'org:person', label: 'Person Card',
    defaultSize: { width: 180, height: 70 },
    ports: stdPorts(),
    icon: paletteIconMulti(`<rect x="4" y="8" width="28" height="20" rx="3" fill="#ffffff" stroke="#1a7a4c" stroke-width="1.5"/>
      <circle cx="13" cy="16" r="3" fill="none" stroke="#1a7a4c" stroke-width="1"/>
      <line x1="19" y1="14" x2="28" y2="14" stroke="#1a7a4c" stroke-width="1"/>
      <line x1="19" y1="18" x2="26" y2="18" stroke="#1a7a4c" stroke-width="0.8"/>`),
    render(s) {
      const w = s.width, h = s.height;
      const r = Math.min(8, w * 0.04);
      const photoR = Math.min(h * 0.3, 16);
      const photoX = photoR + 12;
      const photoY = h / 2;
      return `<rect x="0" y="0" width="${w}" height="${h}" rx="${r}"/>
        <circle cx="${photoX}" cy="${photoY}" r="${photoR}" fill="none" stroke-width="1"/>
        <line x1="${photoX*2 + 4}" y1="${h*0.35}" x2="${w - 10}" y2="${h*0.35}"/>
        <line x1="${photoX*2 + 4}" y1="${h*0.6}" x2="${w - 20}" y2="${h*0.6}" opacity="0.5"/>`;
    }
  });

  // ============================================================
  // ER DIAGRAM
  // ============================================================
  register({
    category: 'ER Diagram', type: 'er:entity', label: 'Entity',
    defaultSize: { width: 140, height: 70 },
    ports: stdPorts(),
    icon: paletteIcon('M4 8h28v20H4z'),
    render(s) {
      return `<rect x="0" y="0" width="${s.width}" height="${s.height}"/>`;
    }
  });

  register({
    category: 'ER Diagram', type: 'er:relationship', label: 'Relationship',
    defaultSize: { width: 120, height: 80 },
    ports: stdPorts(),
    icon: paletteIcon('M18 6L34 18 18 30 2 18z'),
    render(s) {
      return `<polygon points="${s.width/2},0 ${s.width},${s.height/2} ${s.width/2},${s.height} 0,${s.height/2}"/>`;
    }
  });

  register({
    category: 'ER Diagram', type: 'er:attribute', label: 'Attribute',
    defaultSize: { width: 120, height: 70 },
    ports: stdPorts(),
    icon: paletteIcon('M18 8c7.7 0 14 4.5 14 10s-6.3 10-14 10S4 23.5 4 18 10.3 8 18 8z'),
    render(s) {
      return `<ellipse cx="${s.width/2}" cy="${s.height/2}" rx="${s.width/2}" ry="${s.height/2}"/>`;
    }
  });

  // ============================================================
  // MIND MAP
  // ============================================================
  register({
    category: 'Mind Map', type: 'mindmap:central', label: 'Central Topic',
    defaultSize: { width: 180, height: 80 },
    ports: stdPorts(),
    icon: paletteIcon('M10 8h16a6 6 0 016 6v8a6 6 0 01-6 6H10a6 6 0 01-6-6v-8a6 6 0 016-6z'),
    render(s) {
      const r = Math.min(20, s.height / 3);
      return `<rect x="0" y="0" width="${s.width}" height="${s.height}" rx="${r}"/>`;
    }
  });

  register({
    category: 'Mind Map', type: 'mindmap:subtopic', label: 'Sub-topic',
    defaultSize: { width: 140, height: 50 },
    ports: stdPorts(),
    icon: paletteIcon('M8 10h20a4 4 0 014 4v8a4 4 0 01-4 4H8a4 4 0 01-4-4v-8a4 4 0 014-4z'),
    render(s) {
      const r = Math.min(10, s.height / 4);
      return `<rect x="0" y="0" width="${s.width}" height="${s.height}" rx="${r}"/>`;
    }
  });

  register({
    category: 'Mind Map', type: 'mindmap:idea', label: 'Idea',
    defaultSize: { width: 120, height: 40 },
    ports: stdPorts(),
    icon: paletteIconMulti(`<line x1="8" y1="22" x2="28" y2="22" stroke="#1a7a4c" stroke-width="2"/>
      <text x="18" y="18" text-anchor="middle" font-size="9" fill="#1a7a4c">idea</text>`),
    render(s) {
      return `<rect x="0" y="0" width="${s.width}" height="${s.height}" fill="transparent" stroke="none"/>
        <line x1="0" y1="${s.height}" x2="${s.width}" y2="${s.height}" stroke="inherit"/>`;
    }
  });

  // ============================================================
  // CONTAINERS
  // ============================================================
  const SWIMLANE_COLORS = [
    '#b391b5', '#d1bcd2', '#f9d2de', '#ffbbb1', '#ffdba9', '#ffeca9',
    '#c3f7c8', '#99d5ca', '#c7e8ac', '#b8f5ed', '#c1e4f7', '#85c2ed'
  ];

  register({
    category: 'Containers', type: 'container:container', label: 'Container',
    defaultSize: { width: 300, height: 250 },
    isContainer: true,
    customText: true,
    ports: stdPorts(),
    icon: paletteIconMulti(`<rect x="3" y="3" width="30" height="30" fill="#ffffff" stroke="#1a7a4c" stroke-width="1.2" rx="2"/>
      <rect x="3" y="3" width="30" height="8" fill="#1a7a4c" stroke="#1a7a4c" stroke-width="1.2" rx="2"/>
      <rect x="3" y="8" width="30" height="2" fill="#1a7a4c" stroke="none"/>
      <text x="18" y="9" text-anchor="middle" font-size="6" fill="#fff" stroke="none">Title</text>`),
    defaultData() {
      return { headerHeight: 32, backgroundColor: '#f0f7ff' };
    },
    render(s) {
      const w = s.width, h = s.height;
      const hh = (s.data && s.data.headerHeight) || 32;
      const bg = (s.data && s.data.backgroundColor) || '#f0f7ff';
      const title = s.text || 'Container';
      const fs = s.textStyle ? s.textStyle.fontSize : 13;
      const fw = s.textStyle ? s.textStyle.fontWeight : 'bold';
      const ff = s.textStyle ? s.textStyle.fontFamily : 'MaruBuri, Inter, system-ui, sans-serif';
      const tc = s.textStyle ? s.textStyle.color : '#ffffff';
      const fst = s.textStyle ? (s.textStyle.fontStyle || 'normal') : 'normal';
      const td = s.textStyle ? (s.textStyle.textDecoration || 'none') : 'none';
      let svg = '';
      // Body background
      svg += `<rect x="0" y="0" width="${w}" height="${h}" rx="4" fill="${bg}" stroke="none"/>`;
      // Header bar
      svg += `<rect x="0" y="0" width="${w}" height="${hh}" rx="4" fill="${s.style.stroke || '#1a7a4c'}" stroke="none"/>`;
      // Square off bottom corners of header
      svg += `<rect x="0" y="${hh - 4}" width="${w}" height="4" fill="${s.style.stroke || '#1a7a4c'}" stroke="none"/>`;
      // Title text
      svg += `<text x="${w/2}" y="${hh/2}" text-anchor="middle" dominant-baseline="central" fill="${tc}" stroke="none" font-size="${fs}" font-weight="${fw}" font-family="${ff}" font-style="${fst}" text-decoration="${td}">${title}</text>`;
      // Border
      svg += `<rect x="0" y="0" width="${w}" height="${h}" rx="4" fill="none"/>`;
      return svg;
    }
  });

  register({
    category: 'Containers', type: 'container:swimlane-h', label: 'Swimlane (H)',
    defaultSize: { width: 600, height: 400 },
    isContainer: true,
    customText: true,
    ports: stdPorts(),
    icon: paletteIconMulti(`<rect x="2" y="2" width="32" height="32" fill="#ffffff" stroke="#1a7a4c" stroke-width="1.2" rx="1"/>
      <rect x="2" y="2" width="32" height="8" fill="#1a7a4c" stroke="none" rx="1"/>
      <rect x="2" y="8" width="32" height="2" fill="#1a7a4c" stroke="none"/>
      <line x1="10" y1="10" x2="10" y2="34" stroke="#1a7a4c" stroke-width="0.6"/>
      <line x1="2" y1="22" x2="34" y2="22" stroke="#1a7a4c" stroke-width="0.6"/>`),
    defaultData() {
      return {
        headerHeight: 32,
        laneHeaderWidth: 100,
        lanes: [
          { id: Utils.uid('lane'), name: 'Lane 1', color: SWIMLANE_COLORS[0] },
          { id: Utils.uid('lane'), name: 'Lane 2', color: SWIMLANE_COLORS[1] },
          { id: Utils.uid('lane'), name: 'Lane 3', color: SWIMLANE_COLORS[2] }
        ]
      };
    },
    render(s) {
      const w = s.width, h = s.height;
      const hh = (s.data && s.data.headerHeight) || 32;
      const lhw = (s.data && s.data.laneHeaderWidth) || 100;
      const lanes = (s.data && s.data.lanes) || [];
      const title = s.text || 'Swimlane';
      const fs = s.textStyle ? s.textStyle.fontSize : 13;
      const fw = s.textStyle ? s.textStyle.fontWeight : 'bold';
      const ff = s.textStyle ? s.textStyle.fontFamily : 'MaruBuri, Inter, system-ui, sans-serif';
      const tc = s.textStyle ? s.textStyle.color : '#ffffff';
      const fst = s.textStyle ? (s.textStyle.fontStyle || 'normal') : 'normal';
      const td = s.textStyle ? (s.textStyle.textDecoration || 'none') : 'none';
      let svg = '';

      // Background
      svg += `<rect x="0" y="0" width="${w}" height="${h}" rx="3" fill="#ffffff" stroke="none"/>`;

      // Lane backgrounds and labels
      const bodyH = h - hh;
      if (lanes.length > 0) {
        const laneH = bodyH / lanes.length;
        lanes.forEach((lane, i) => {
          const ly = hh + laneH * i;
          // Lane header background
          svg += `<rect x="0" y="${ly}" width="${lhw}" height="${laneH}" fill="${lane.color || '#eeeeee'}" stroke="none"/>`;
          // Lane body background
          svg += `<rect x="${lhw}" y="${ly}" width="${w - lhw}" height="${laneH}" fill="#ffffff" stroke="none"/>`;
          // Lane label
          svg += `<text x="${lhw/2}" y="${ly + laneH/2}" text-anchor="middle" dominant-baseline="central" fill="#333" stroke="none" font-size="${Math.min(fs, 12)}" font-weight="${fw}" font-family="${ff}" font-style="${fst}" text-decoration="${td}">${lane.name || ''}</text>`;
          // Lane divider
          if (i > 0) {
            svg += `<line x1="0" y1="${ly}" x2="${w}" y2="${ly}" stroke="#ccc" stroke-width="0.8"/>`;
          }
        });
      }

      // Header bar
      svg += `<rect x="0" y="0" width="${w}" height="${hh}" rx="3" fill="${s.style.stroke || '#1a7a4c'}" stroke="none"/>`;
      svg += `<rect x="0" y="${hh - 3}" width="${w}" height="3" fill="${s.style.stroke || '#1a7a4c'}" stroke="none"/>`;
      // Title
      svg += `<text x="${w/2}" y="${hh/2}" text-anchor="middle" dominant-baseline="central" fill="${tc}" stroke="none" font-size="${fs}" font-weight="${fw}" font-family="${ff}" font-style="${fst}" text-decoration="${td}">${title}</text>`;

      // Vertical lane header divider
      svg += `<line x1="${lhw}" y1="${hh}" x2="${lhw}" y2="${h}" stroke="#ccc" stroke-width="0.8"/>`;

      // Border
      svg += `<rect x="0" y="0" width="${w}" height="${h}" rx="3" fill="none"/>`;
      return svg;
    }
  });

  register({
    category: 'Containers', type: 'container:swimlane-v', label: 'Swimlane (V)',
    defaultSize: { width: 600, height: 400 },
    isContainer: true,
    customText: true,
    ports: stdPorts(),
    icon: paletteIconMulti(`<rect x="2" y="2" width="32" height="32" fill="#ffffff" stroke="#1a7a4c" stroke-width="1.2" rx="1"/>
      <rect x="2" y="2" width="32" height="8" fill="#1a7a4c" stroke="none" rx="1"/>
      <rect x="2" y="8" width="32" height="2" fill="#1a7a4c" stroke="none"/>
      <line x1="13" y1="10" x2="13" y2="34" stroke="#1a7a4c" stroke-width="0.6"/>
      <line x1="23" y1="10" x2="23" y2="34" stroke="#1a7a4c" stroke-width="0.6"/>`),
    defaultData() {
      return {
        headerHeight: 32,
        laneHeaderHeight: 30,
        lanes: [
          { id: Utils.uid('lane'), name: 'Lane 1', color: SWIMLANE_COLORS[0] },
          { id: Utils.uid('lane'), name: 'Lane 2', color: SWIMLANE_COLORS[1] },
          { id: Utils.uid('lane'), name: 'Lane 3', color: SWIMLANE_COLORS[2] }
        ]
      };
    },
    render(s) {
      const w = s.width, h = s.height;
      const hh = (s.data && s.data.headerHeight) || 32;
      const lhh = (s.data && s.data.laneHeaderHeight) || 30;
      const lanes = (s.data && s.data.lanes) || [];
      const title = s.text || 'Swimlane';
      const fs = s.textStyle ? s.textStyle.fontSize : 13;
      const fw = s.textStyle ? s.textStyle.fontWeight : 'bold';
      const ff = s.textStyle ? s.textStyle.fontFamily : 'MaruBuri, Inter, system-ui, sans-serif';
      const tc = s.textStyle ? s.textStyle.color : '#ffffff';
      const fst = s.textStyle ? (s.textStyle.fontStyle || 'normal') : 'normal';
      const td = s.textStyle ? (s.textStyle.textDecoration || 'none') : 'none';
      let svg = '';

      // Background
      svg += `<rect x="0" y="0" width="${w}" height="${h}" rx="3" fill="#ffffff" stroke="none"/>`;

      // Lane backgrounds and labels
      if (lanes.length > 0) {
        const laneW = w / lanes.length;
        lanes.forEach((lane, i) => {
          const lx = laneW * i;
          // Lane column header background
          svg += `<rect x="${lx}" y="${hh}" width="${laneW}" height="${lhh}" fill="${lane.color || '#eeeeee'}" stroke="none"/>`;
          // Lane body background
          svg += `<rect x="${lx}" y="${hh + lhh}" width="${laneW}" height="${h - hh - lhh}" fill="#ffffff" stroke="none"/>`;
          // Lane label
          svg += `<text x="${lx + laneW/2}" y="${hh + lhh/2}" text-anchor="middle" dominant-baseline="central" fill="#333" stroke="none" font-size="${Math.min(fs, 12)}" font-weight="${fw}" font-family="${ff}" font-style="${fst}" text-decoration="${td}">${lane.name || ''}</text>`;
          // Lane divider
          if (i > 0) {
            svg += `<line x1="${lx}" y1="${hh}" x2="${lx}" y2="${h}" stroke="#ccc" stroke-width="0.8"/>`;
          }
        });
      }

      // Header bar
      svg += `<rect x="0" y="0" width="${w}" height="${hh}" rx="3" fill="${s.style.stroke || '#1a7a4c'}" stroke="none"/>`;
      svg += `<rect x="0" y="${hh - 3}" width="${w}" height="3" fill="${s.style.stroke || '#1a7a4c'}" stroke="none"/>`;
      // Title
      svg += `<text x="${w/2}" y="${hh/2}" text-anchor="middle" dominant-baseline="central" fill="${tc}" stroke="none" font-size="${fs}" font-weight="${fw}" font-family="${ff}" font-style="${fst}" text-decoration="${td}">${title}</text>`;

      // Horizontal line below lane headers
      if (lanes.length > 0) {
        svg += `<line x1="0" y1="${hh + lhh}" x2="${w}" y2="${hh + lhh}" stroke="#ccc" stroke-width="0.8"/>`;
      }

      // Border
      svg += `<rect x="0" y="0" width="${w}" height="${h}" rx="3" fill="none"/>`;
      return svg;
    }
  });

  return { registry, register, get, getAll, getByCategory, getCategories, stdPorts, getPortPosition, getPortDirection, SWIMLANE_COLORS };
})();
