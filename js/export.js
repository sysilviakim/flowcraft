// FlowCraft - Save/Load/Export
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

const ExportImport = (() => {
  let diagram;
  const AUTOSAVE_KEY = 'flowcraft-autosave';

  // Font data cache: { 'fonts/MaruBuri-Regular.ttf': 'base64...' }
  const _fontCache = {};

  function init(diag) {
    diagram = diag;
    // Auto-save on changes
    diagram.on('changed', Utils.debounce(() => autoSave(), 1000));
    // File keyboard shortcuts
    document.addEventListener('keydown', e => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 's') {
        e.preventDefault();
        saveToFile();
      }
      if (ctrl && e.key === 'o') {
        e.preventDefault();
        loadFromFile();
      }
      if (ctrl && e.key === 'n') {
        e.preventDefault();
        // New diagram handled by UI
      }
    });
  }

  // --- Auto-save ---
  function autoSave() {
    try {
      const data = JSON.stringify(diagram.toJSON());
      localStorage.setItem(AUTOSAVE_KEY, data);
    } catch (e) {
      console.warn('Auto-save failed:', e);
    }
  }

  function autoLoad() {
    try {
      const data = localStorage.getItem(AUTOSAVE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        diagram.fromJSON(parsed);
        return true;
      }
    } catch (e) {
      console.warn('Auto-load failed:', e);
    }
    return false;
  }

  // --- Save to file ---
  function saveToFile() {
    const data = JSON.stringify(diagram.toJSON(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (diagram.name || 'diagram') + '.flowcraft.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- Load from file ---
  function loadFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.flowcraft.json';
    input.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          diagram.fromJSON(data);
          History.clear();
        } catch (err) {
          alert('Failed to load file: ' + err.message);
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  // --- Font embedding for exports ---
  // Font weight → file path mapping
  const FONT_MAP = {
    200: 'fonts/MaruBuri-ExtraLight.ttf',
    300: 'fonts/MaruBuri-Light.ttf',
    400: 'fonts/MaruBuri-Regular.ttf',
    'normal': 'fonts/MaruBuri-Regular.ttf',
    600: 'fonts/MaruBuri-SemiBold.ttf',
    700: 'fonts/MaruBuri-Bold.ttf',
    'bold': 'fonts/MaruBuri-Bold.ttf'
  };

  function getUsedFontWeights() {
    const weights = new Set();
    weights.add(400); // always include regular
    for (const shape of diagram.shapes) {
      const fw = shape.textStyle && shape.textStyle.fontWeight;
      if (fw === 'bold' || fw === 700) weights.add(700);
      else if (fw === 600) weights.add(600);
      else if (fw === 300) weights.add(300);
      else if (fw === 200) weights.add(200);
    }
    return weights;
  }

  async function fetchFontAsBase64(path) {
    if (_fontCache[path]) return _fontCache[path];
    try {
      const resp = await fetch(path);
      if (!resp.ok) return null;
      const buf = await resp.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const b64 = btoa(binary);
      _fontCache[path] = b64;
      return b64;
    } catch (e) {
      console.warn('Failed to fetch font:', path, e);
      return null;
    }
  }

  async function embedFontsInSvg(clonedSvg) {
    const weights = getUsedFontWeights();
    let css = '';
    for (const w of weights) {
      const path = FONT_MAP[w];
      if (!path) continue;
      const b64 = await fetchFontAsBase64(path);
      if (!b64) continue;
      css += `@font-face { font-family: 'MaruBuri'; src: url('data:font/ttf;base64,${b64}') format('truetype'); font-weight: ${w}; font-style: normal; }\n`;
    }
    if (!css) return;
    const defs = clonedSvg.querySelector('defs') || document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    if (!defs.parentNode) clonedSvg.insertBefore(defs, clonedSvg.firstChild);
    const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleEl.textContent = css;
    defs.insertBefore(styleEl, defs.firstChild);
  }

  // --- Common SVG preparation for export ---
  function prepareExportSvg(svgEl, bounds, padding) {
    const width = bounds.width + padding * 2;
    const height = bounds.height + padding * 2;

    const clonedSvg = svgEl.cloneNode(true);
    clonedSvg.setAttribute('width', width);
    clonedSvg.setAttribute('height', height);
    clonedSvg.setAttribute('viewBox', `${bounds.x - padding} ${bounds.y - padding} ${width} ${height}`);

    ['#selection-handles', '#alignment-guides', '#selection-marquee', '#port-indicators', '#connector-preview', '#waypoint-handles'].forEach(sel => {
      const el = clonedSvg.querySelector(sel);
      if (el) el.remove();
    });

    const cl = clonedSvg.querySelector('#canvas-layer');
    if (cl) cl.setAttribute('transform', 'translate(0,0) scale(1)');

    const grid = clonedSvg.querySelector('rect[fill="url(#grid-pattern)"]');
    if (grid) grid.style.display = 'none';

    return { clonedSvg, cl, width, height };
  }

  function addBackground(cl, bounds, padding, width, height, color) {
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', bounds.x - padding);
    bg.setAttribute('y', bounds.y - padding);
    bg.setAttribute('width', width);
    bg.setAttribute('height', height);
    bg.setAttribute('fill', color || '#ffffff');
    if (cl) cl.insertBefore(bg, cl.firstChild);
  }

  function svgToImageUrl(clonedSvg) {
    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    return URL.createObjectURL(svgBlob);
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // --- Export PNG ---
  async function exportPNG() {
    const svgEl = Renderer.getSvg();
    if (diagram.shapes.length === 0) { alert('Nothing to export'); return; }

    const bounds = Utils.getBoundingRect(diagram.shapes);
    const padding = 40;
    const { clonedSvg, cl, width, height } = prepareExportSvg(svgEl, bounds, padding);
    addBackground(cl, bounds, padding, width, height, diagram.settings.canvasColor);

    await embedFontsInSvg(clonedSvg);
    const url = svgToImageUrl(clonedSvg);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      canvas.toBlob(blob => {
        downloadBlob(blob, (diagram.name || 'diagram') + '.png');
      }, 'image/png');
    };
    img.onerror = () => {
      console.error('PNG export failed');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  // --- Export JPG ---
  async function exportJPG() {
    const svgEl = Renderer.getSvg();
    if (diagram.shapes.length === 0) { alert('Nothing to export'); return; }

    const bounds = Utils.getBoundingRect(diagram.shapes);
    const padding = 40;
    const { clonedSvg, cl, width, height } = prepareExportSvg(svgEl, bounds, padding);
    addBackground(cl, bounds, padding, width, height, diagram.settings.canvasColor || '#ffffff');

    await embedFontsInSvg(clonedSvg);
    const url = svgToImageUrl(clonedSvg);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.fillStyle = diagram.settings.canvasColor || '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      canvas.toBlob(blob => {
        downloadBlob(blob, (diagram.name || 'diagram') + '.jpg');
      }, 'image/jpeg', 0.95);
    };
    img.onerror = () => {
      console.error('JPG export failed');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  // --- Export PDF ---
  async function exportPDF() {
    const svgEl = Renderer.getSvg();
    if (diagram.shapes.length === 0) { alert('Nothing to export'); return; }

    const bounds = Utils.getBoundingRect(diagram.shapes);
    const padding = 40;
    const { clonedSvg, cl, width, height } = prepareExportSvg(svgEl, bounds, padding);
    addBackground(cl, bounds, padding, width, height, diagram.settings.canvasColor || '#ffffff');

    await embedFontsInSvg(clonedSvg);
    const url = svgToImageUrl(clonedSvg);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 4; // high DPI for crisp PDF output
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.fillStyle = diagram.settings.canvasColor || '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      // Use PNG for PDF image to avoid JPEG compression artifacts
      const pngDataUrl = canvas.toDataURL('image/png');
      const pngBase64 = pngDataUrl.split(',')[1];
      const pngBytes = atob(pngBase64);
      const pngLength = pngBytes.length;

      // PDF page size matches image aspect ratio, using points (72 dpi)
      const maxPageW = 595.28; // A4 width in points
      const maxPageH = 841.89; // A4 height in points
      const imgAspect = width / height;
      let pageW, pageH;
      if (imgAspect > maxPageW / maxPageH) {
        pageW = maxPageW;
        pageH = maxPageW / imgAspect;
      } else {
        pageH = maxPageH;
        pageW = maxPageH * imgAspect;
      }

      const offsets = [];
      let pdf = '';
      function addObj(content) {
        offsets.push(pdf.length);
        pdf += content;
      }

      pdf = '%PDF-1.4\n';

      // Object 1: Catalog
      addObj('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

      // Object 2: Pages
      addObj('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

      // Object 3: Page
      addObj(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW.toFixed(2)} ${pageH.toFixed(2)}] /Contents 4 0 R /Resources << /XObject << /Img0 5 0 R >> >> >>\nendobj\n`);

      // Object 4: Page content stream (draw image full page)
      const contentStream = `q\n${pageW.toFixed(2)} 0 0 ${pageH.toFixed(2)} 0 0 cm\n/Img0 Do\nQ\n`;
      addObj(`4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`);

      // Object 5: Image XObject (PNG via FlateDecode)
      const imgObjHeader = `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${pngLength} >>\nstream\n`;
      const imgObjFooter = '\nendstream\nendobj\n';

      // Build the full PDF as binary
      const headerBytes = new TextEncoder().encode(pdf);
      const imgHeaderBytes = new TextEncoder().encode(imgObjHeader);
      const imgFooterBytes = new TextEncoder().encode(imgObjFooter);

      // Convert PNG string to Uint8Array
      const pngArray = new Uint8Array(pngLength);
      for (let i = 0; i < pngLength; i++) {
        pngArray[i] = pngBytes.charCodeAt(i);
      }

      const imgObjOffset = headerBytes.length;

      // Build xref and trailer
      const xrefStartOffset = imgObjOffset + imgHeaderBytes.length + pngArray.length + imgFooterBytes.length;
      const allOffsets = [...offsets, imgObjOffset];

      let xref = 'xref\n';
      xref += `0 ${allOffsets.length + 1}\n`;
      xref += '0000000000 65535 f \n';
      allOffsets.forEach(off => {
        xref += off.toString().padStart(10, '0') + ' 00000 n \n';
      });

      let trailer = 'trailer\n';
      trailer += `<< /Size ${allOffsets.length + 1} /Root 1 0 R >>\n`;
      trailer += 'startxref\n';
      trailer += xrefStartOffset + '\n';
      trailer += '%%EOF\n';

      const xrefBytes = new TextEncoder().encode(xref + trailer);

      // Combine all parts
      const totalLength = headerBytes.length + imgHeaderBytes.length + pngArray.length + imgFooterBytes.length + xrefBytes.length;
      const pdfArray = new Uint8Array(totalLength);
      let offset = 0;
      pdfArray.set(headerBytes, offset); offset += headerBytes.length;
      pdfArray.set(imgHeaderBytes, offset); offset += imgHeaderBytes.length;
      pdfArray.set(pngArray, offset); offset += pngArray.length;
      pdfArray.set(imgFooterBytes, offset); offset += imgFooterBytes.length;
      pdfArray.set(xrefBytes, offset);

      const pdfBlob = new Blob([pdfArray], { type: 'application/pdf' });
      downloadBlob(pdfBlob, (diagram.name || 'diagram') + '.pdf');
    };
    img.onerror = () => {
      console.error('PDF export failed');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  // --- Export SVG ---
  async function exportSVG() {
    const svgEl = Renderer.getSvg();
    if (diagram.shapes.length === 0) { alert('Nothing to export'); return; }

    const bounds = Utils.getBoundingRect(diagram.shapes);
    const padding = 40;
    const { clonedSvg, cl, width, height } = prepareExportSvg(svgEl, bounds, padding);

    await embedFontsInSvg(clonedSvg);

    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (diagram.name || 'diagram') + '.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return { init, autoSave, autoLoad, saveToFile, loadFromFile, exportPNG, exportJPG, exportPDF, exportSVG };
})();
