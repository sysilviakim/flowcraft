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

  // --- Export PNG ---
  function exportPNG() {
    const svgEl = Renderer.getSvg();
    const canvasLayer = Renderer.getCanvasLayer();

    // Get bounds of all shapes
    if (diagram.shapes.length === 0) {
      alert('Nothing to export');
      return;
    }

    const bounds = Utils.getBoundingRect(diagram.shapes);
    const padding = 40;
    const width = bounds.width + padding * 2;
    const height = bounds.height + padding * 2;

    // Clone SVG
    const clonedSvg = svgEl.cloneNode(true);
    clonedSvg.setAttribute('width', width);
    clonedSvg.setAttribute('height', height);
    clonedSvg.setAttribute('viewBox', `${bounds.x - padding} ${bounds.y - padding} ${width} ${height}`);

    // Remove UI artifacts
    const selectHandles = clonedSvg.querySelector('#selection-handles');
    if (selectHandles) selectHandles.remove();
    const alignGuides = clonedSvg.querySelector('#alignment-guides');
    if (alignGuides) alignGuides.remove();
    const marquee = clonedSvg.querySelector('#selection-marquee');
    if (marquee) marquee.remove();
    const portInd = clonedSvg.querySelector('#port-indicators');
    if (portInd) portInd.remove();
    const connPreview = clonedSvg.querySelector('#connector-preview');
    if (connPreview) connPreview.remove();

    // Set the canvas layer transform to identity
    const cl = clonedSvg.querySelector('#canvas-layer');
    if (cl) cl.setAttribute('transform', 'translate(0,0) scale(1)');

    // Add background
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', bounds.x - padding);
    bg.setAttribute('y', bounds.y - padding);
    bg.setAttribute('width', width);
    bg.setAttribute('height', height);
    bg.setAttribute('fill', diagram.settings.canvasColor);
    if (cl) cl.insertBefore(bg, cl.firstChild);

    // Hide grid
    const grid = clonedSvg.querySelector('rect[fill="url(#grid-pattern)"]');
    if (grid) grid.style.display = 'none';

    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2; // retina
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      canvas.toBlob(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (diagram.name || 'diagram') + '.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, 'image/png');
    };
    img.onerror = () => {
      console.error('PNG export failed');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  // --- Export JPG ---
  function exportJPG() {
    const svgEl = Renderer.getSvg();

    if (diagram.shapes.length === 0) {
      alert('Nothing to export');
      return;
    }

    const bounds = Utils.getBoundingRect(diagram.shapes);
    const padding = 40;
    const width = bounds.width + padding * 2;
    const height = bounds.height + padding * 2;

    const clonedSvg = svgEl.cloneNode(true);
    clonedSvg.setAttribute('width', width);
    clonedSvg.setAttribute('height', height);
    clonedSvg.setAttribute('viewBox', `${bounds.x - padding} ${bounds.y - padding} ${width} ${height}`);

    ['#selection-handles', '#alignment-guides', '#selection-marquee', '#port-indicators', '#connector-preview'].forEach(sel => {
      const el = clonedSvg.querySelector(sel);
      if (el) el.remove();
    });

    const cl = clonedSvg.querySelector('#canvas-layer');
    if (cl) cl.setAttribute('transform', 'translate(0,0) scale(1)');

    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', bounds.x - padding);
    bg.setAttribute('y', bounds.y - padding);
    bg.setAttribute('width', width);
    bg.setAttribute('height', height);
    bg.setAttribute('fill', diagram.settings.canvasColor || '#ffffff');
    if (cl) cl.insertBefore(bg, cl.firstChild);

    const grid = clonedSvg.querySelector('rect[fill="url(#grid-pattern)"]');
    if (grid) grid.style.display = 'none';

    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      // Fill white background for JPG (no transparency)
      ctx.fillStyle = diagram.settings.canvasColor || '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      canvas.toBlob(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (diagram.name || 'diagram') + '.jpg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, 'image/jpeg', 0.95);
    };
    img.onerror = () => {
      console.error('JPG export failed');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  // --- Export PDF ---
  function exportPDF() {
    const svgEl = Renderer.getSvg();

    if (diagram.shapes.length === 0) {
      alert('Nothing to export');
      return;
    }

    const bounds = Utils.getBoundingRect(diagram.shapes);
    const padding = 40;
    const width = bounds.width + padding * 2;
    const height = bounds.height + padding * 2;

    const clonedSvg = svgEl.cloneNode(true);
    clonedSvg.setAttribute('width', width);
    clonedSvg.setAttribute('height', height);
    clonedSvg.setAttribute('viewBox', `${bounds.x - padding} ${bounds.y - padding} ${width} ${height}`);

    ['#selection-handles', '#alignment-guides', '#selection-marquee', '#port-indicators', '#connector-preview'].forEach(sel => {
      const el = clonedSvg.querySelector(sel);
      if (el) el.remove();
    });

    const cl = clonedSvg.querySelector('#canvas-layer');
    if (cl) cl.setAttribute('transform', 'translate(0,0) scale(1)');

    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', bounds.x - padding);
    bg.setAttribute('y', bounds.y - padding);
    bg.setAttribute('width', width);
    bg.setAttribute('height', height);
    bg.setAttribute('fill', diagram.settings.canvasColor || '#ffffff');
    if (cl) cl.insertBefore(bg, cl.firstChild);

    const grid = clonedSvg.querySelector('rect[fill="url(#grid-pattern)"]');
    if (grid) grid.style.display = 'none';

    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

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

      // Get JPEG data from canvas
      const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const jpegBase64 = jpegDataUrl.split(',')[1];
      const jpegBytes = atob(jpegBase64);
      const jpegLength = jpegBytes.length;

      // Build a minimal PDF with embedded JPEG image
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

      // Object 5: Image XObject - we need binary here, so we build a Uint8Array later
      // For now, mark the position and build binary PDF
      const imgObjHeader = `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegLength} >>\nstream\n`;
      const imgObjFooter = '\nendstream\nendobj\n';

      // Build the full PDF as binary
      const headerBytes = new TextEncoder().encode(pdf);
      const imgHeaderBytes = new TextEncoder().encode(imgObjHeader);
      const imgFooterBytes = new TextEncoder().encode(imgObjFooter);

      // Convert JPEG string to Uint8Array
      const jpegArray = new Uint8Array(jpegLength);
      for (let i = 0; i < jpegLength; i++) {
        jpegArray[i] = jpegBytes.charCodeAt(i);
      }

      const imgObjOffset = headerBytes.length;

      // Build xref and trailer
      const xrefStartOffset = imgObjOffset + imgHeaderBytes.length + jpegArray.length + imgFooterBytes.length;

      // Fix offsets: offsets[0..3] are in the text portion, offset for obj 5 is imgObjOffset
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
      const totalLength = headerBytes.length + imgHeaderBytes.length + jpegArray.length + imgFooterBytes.length + xrefBytes.length;
      const pdfArray = new Uint8Array(totalLength);
      let offset = 0;
      pdfArray.set(headerBytes, offset); offset += headerBytes.length;
      pdfArray.set(imgHeaderBytes, offset); offset += imgHeaderBytes.length;
      pdfArray.set(jpegArray, offset); offset += jpegArray.length;
      pdfArray.set(imgFooterBytes, offset); offset += imgFooterBytes.length;
      pdfArray.set(xrefBytes, offset);

      const pdfBlob = new Blob([pdfArray], { type: 'application/pdf' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(pdfBlob);
      a.download = (diagram.name || 'diagram') + '.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    img.onerror = () => {
      console.error('PDF export failed');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  // --- Export SVG ---
  function exportSVG() {
    const svgEl = Renderer.getSvg();

    if (diagram.shapes.length === 0) {
      alert('Nothing to export');
      return;
    }

    const bounds = Utils.getBoundingRect(diagram.shapes);
    const padding = 40;
    const width = bounds.width + padding * 2;
    const height = bounds.height + padding * 2;

    const clonedSvg = svgEl.cloneNode(true);
    clonedSvg.setAttribute('width', width);
    clonedSvg.setAttribute('height', height);
    clonedSvg.setAttribute('viewBox', `${bounds.x - padding} ${bounds.y - padding} ${width} ${height}`);

    // Clean up UI artifacts
    ['#selection-handles', '#alignment-guides', '#selection-marquee', '#port-indicators', '#connector-preview'].forEach(sel => {
      const el = clonedSvg.querySelector(sel);
      if (el) el.remove();
    });

    const cl = clonedSvg.querySelector('#canvas-layer');
    if (cl) cl.setAttribute('transform', 'translate(0,0) scale(1)');

    const grid = clonedSvg.querySelector('rect[fill="url(#grid-pattern)"]');
    if (grid) grid.style.display = 'none';

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
