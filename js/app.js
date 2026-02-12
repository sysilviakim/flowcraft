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

  // Track recently used shapes
  diagram.on('shape:added', shape => {
    if (shape && shape.type) UI.addRecentShape(shape.type);
    // Auto-attach interval/milestone to timeline on creation
    if (shape && (shape.type === 'timeline:interval' || shape.type === 'timeline:milestone')) {
      const tl = findOverlappingTimeline(shape);
      if (tl && tl.data && tl.data.startDate && tl.data.endDate) {
        attachToTimeline(shape, tl);
      }
    }
  });

  // Auto-update timeline interval dates when shapes are moved/resized
  function msToISO(ms) {
    const dt = new Date(ms);
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  }
  function isoToShort(iso) {
    const [,m,d] = iso.split('-').map(Number);
    return `${m}/${d}`;
  }

  function findOverlappingTimeline(shape) {
    const cx = shape.x + shape.width / 2;
    return diagram.shapes.find(s =>
      s.type === 'timeline:timeline' && s.id !== shape.id &&
      cx >= s.x && cx <= s.x + s.width
    ) || null;
  }

  function attachToTimeline(shape, tl) {
    const parseD = ds => { const [y,m,d] = ds.split('-').map(Number); return new Date(y,m-1,d).getTime(); };
    const startMs = parseD(tl.data.startDate);
    const endMs = parseD(tl.data.endDate);
    const totalMs = endMs - startMs;
    if (totalMs <= 0 || tl.width <= 0) return;

    const taskName = shape.data.taskName || shape.text.split('\n')[0] || '';

    if (shape.type === 'timeline:milestone') {
      // Milestone = single date at center X
      const cx = shape.x + shape.width / 2;
      const dateMs = startMs + ((cx - tl.x) / tl.width) * totalMs;
      const dateStr = msToISO(dateMs);
      const newText = taskName ? taskName + '\n' + isoToShort(dateStr) : isoToShort(dateStr);
      diagram.updateShapeDeep(shape.id, {
        text: newText,
        data: { timelineInterval: true, timelineId: tl.id, startDate: dateStr, endDate: dateStr, taskName: taskName }
      });
    } else {
      // Interval = date range
      const barStartMs = startMs + ((shape.x - tl.x) / tl.width) * totalMs;
      const barEndMs = startMs + ((shape.x + shape.width - tl.x) / tl.width) * totalMs;
      const newStart = msToISO(barStartMs);
      const newEnd = msToISO(barEndMs);
      const dateLbl = isoToShort(newStart) + ' - ' + isoToShort(newEnd);
      const newText = taskName ? taskName + '\n' + dateLbl : dateLbl;
      diagram.updateShapeDeep(shape.id, {
        text: newText,
        data: { timelineInterval: true, timelineId: tl.id, startDate: newStart, endDate: newEnd, taskName: taskName }
      });
    }
  }

  function detachFromTimeline(shape) {
    const taskName = shape.data.taskName || shape.text.split('\n')[0] || '';
    diagram.updateShapeDeep(shape.id, {
      text: taskName,
      data: { timelineInterval: false, timelineId: null, startDate: null, endDate: null }
    });
  }

  diagram.on('shape:changed', (shape) => {
    if (!shape || !shape.data) return;

    // Handle interval or milestone shapes - auto-attach/detach from timelines
    if (shape.type === 'timeline:interval' || shape.type === 'timeline:milestone') {
      const currentTlId = shape.data.timelineId || null;
      const overlapping = findOverlappingTimeline(shape);

      if (overlapping && overlapping.data && overlapping.data.startDate && overlapping.data.endDate) {
        if (!shape.data.timelineInterval || overlapping.id !== currentTlId) {
          // First attachment or switched to different timeline
          attachToTimeline(shape, overlapping);
          return;
        }
        // Already attached to this timeline — fall through to legacy handler for date recalc
      } else if (currentTlId) {
        // Moved off timeline
        detachFromTimeline(shape);
        return;
      } else {
        return; // Not on any timeline, nothing to do
      }
    }

    // Recalculate dates for any shape attached to a timeline
    if (!shape.data.timelineInterval || !shape.data.timelineId) return;
    const tl = diagram.getShape(shape.data.timelineId);
    if (!tl || !tl.data || !tl.data.startDate || !tl.data.endDate) return;

    const parseD = ds => { const [y,m,d] = ds.split('-').map(Number); return new Date(y,m-1,d).getTime(); };
    const startMs = parseD(tl.data.startDate);
    const endMs = parseD(tl.data.endDate);
    const totalMs = endMs - startMs;

    if (totalMs <= 0 || tl.width <= 0) return;

    const taskName = shape.data.taskName || shape.text.split('\n')[0];

    if (shape.type === 'timeline:milestone') {
      const cx = shape.x + shape.width / 2;
      const dateMs = startMs + ((cx - tl.x) / tl.width) * totalMs;
      const dateStr = msToISO(dateMs);
      if (dateStr !== shape.data.startDate) {
        diagram.updateShapeDeep(shape.id, {
          text: taskName + '\n' + isoToShort(dateStr),
          data: { startDate: dateStr, endDate: dateStr }
        });
      }
    } else {
      const barStartMs = startMs + ((shape.x - tl.x) / tl.width) * totalMs;
      const barEndMs = startMs + ((shape.x + shape.width - tl.x) / tl.width) * totalMs;
      const newStart = msToISO(barStartMs);
      const newEnd = msToISO(barEndMs);

      if (newStart !== shape.data.startDate || newEnd !== shape.data.endDate) {
        diagram.updateShapeDeep(shape.id, {
          text: taskName + '\n' + isoToShort(newStart) + ' - ' + isoToShort(newEnd),
          data: { startDate: newStart, endDate: newEnd }
        });
      }
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

  // Properties panel collapse toggle
  const propsWrapper = document.getElementById('properties-wrapper');
  const propsToggle = document.getElementById('props-toggle');
  if (propsToggle && propsWrapper) {
    propsToggle.addEventListener('click', () => {
      propsWrapper.classList.toggle('collapsed');
      propsToggle.innerHTML = propsWrapper.classList.contains('collapsed') ? '&#9664;' : '&#9654;';
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
