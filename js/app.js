// FlowCraft - Bootstrap & Wire Everything
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

(function () {
  'use strict';

  // Create diagram model
  const diagram = new Model.Diagram();

  // Initialize renderer
  const canvasContainer = document.getElementById('canvas-container');
  Renderer.init(canvasContainer, diagram);

  // Initialize history
  History.init(diagram);

  // Initialize tools
  Tools.init(diagram, canvasContainer);

  // Initialize export/import
  ExportImport.init(diagram);

  // Initialize UI
  UI.init(diagram);

  // Try to load auto-saved diagram
  const loaded = ExportImport.autoLoad();
  if (!loaded) {
    // Center the canvas initially
    const rect = canvasContainer.getBoundingClientRect();
    Renderer.setPan(rect.width / 2, rect.height / 2);
  }

  // Auto-update timeline interval dates when shapes are moved/resized
  function msToISO(ms) {
    const dt = new Date(ms);
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  }
  function isoToShort(iso) {
    const [,m,d] = iso.split('-').map(Number);
    return `${m}/${d}`;
  }

  diagram.on('shape:changed', (shape) => {
    if (!shape || !shape.data || !shape.data.timelineInterval || !shape.data.timelineId) return;

    const tl = diagram.getShape(shape.data.timelineId);
    if (!tl || !tl.data || !tl.data.startDate || !tl.data.endDate) return;

    const parseD = ds => { const [y,m,d] = ds.split('-').map(Number); return new Date(y,m-1,d).getTime(); };
    const startMs = parseD(tl.data.startDate);
    const endMs = parseD(tl.data.endDate);
    const totalMs = endMs - startMs;

    if (totalMs <= 0 || tl.width <= 0) return;

    const barStartMs = startMs + ((shape.x - tl.x) / tl.width) * totalMs;
    const barEndMs = startMs + ((shape.x + shape.width - tl.x) / tl.width) * totalMs;

    const newStart = msToISO(barStartMs);
    const newEnd = msToISO(barEndMs);

    if (newStart !== shape.data.startDate || newEnd !== shape.data.endDate) {
      const taskName = shape.data.taskName || shape.text.split('\n')[0];
      diagram.updateShapeDeep(shape.id, {
        text: taskName + '\n' + isoToShort(newStart) + ' - ' + isoToShort(newEnd),
        data: { startDate: newStart, endDate: newEnd }
      });
    }
  });

  // Palette collapse toggle
  const paletteWrapper = document.getElementById('palette-wrapper');
  const paletteToggle = document.getElementById('palette-toggle');
  if (paletteToggle && paletteWrapper) {
    paletteToggle.addEventListener('click', () => {
      paletteWrapper.classList.toggle('collapsed');
      paletteToggle.innerHTML = paletteWrapper.classList.contains('collapsed') ? '&#9654;' : '&#9664;';
    });
  }

  // Prevent browser default behaviors that interfere
  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', e => e.preventDefault());

  // Warn before closing with unsaved changes
  window.addEventListener('beforeunload', e => {
    ExportImport.autoSave();
  });

  console.log('FlowCraft initialized successfully.');
})();
