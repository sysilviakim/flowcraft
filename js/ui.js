// FlowCraft - UI Panels & Menus
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

const UI = (() => {
  let diagram;

  function init(diag) {
    diagram = diag;
    buildPalette();
    buildToolbar();
    buildPropertiesPanel();
    buildLayersPanel();
    buildStatusBar();

    // Listen for selection changes
    Tools.setOnSelectionChanged(updatePropertiesPanel);
    Tools.setOnToolChanged(updateToolbar);
    History.setOnChange(updateHistoryButtons);
    diagram.on('changed', updateStatusBar);
  }

  // ===== SHAPE PALETTE =====
  function buildPalette() {
    const palette = document.getElementById('palette');
    Utils.removeChildren(palette);

    const categories = Shapes.getCategories();
    categories.forEach(cat => {
      const section = document.createElement('div');
      const collapsedByDefault = ['UML', 'Network', 'Org Chart'];
      section.className = 'palette-section' + (collapsedByDefault.includes(cat) ? ' collapsed' : '');

      const header = document.createElement('div');
      header.className = 'palette-header';
      header.innerHTML = `<span>${cat}</span><span class="arrow">&#9662;</span>`;
      header.addEventListener('click', () => {
        section.classList.toggle('collapsed');
      });
      section.appendChild(header);

      const grid = document.createElement('div');
      grid.className = 'palette-grid';

      const shapes = Shapes.getByCategory(cat);
      shapes.forEach(def => {
        const item = document.createElement('div');
        item.className = 'palette-item';
        item.setAttribute('draggable', 'true');
        item.setAttribute('data-shape-type', def.type);
        item.innerHTML = `${def.icon}<span class="palette-item-label">${def.label}</span>`;

        // Drag start
        item.addEventListener('dragstart', e => {
          e.dataTransfer.setData('text/plain', def.type);
          e.dataTransfer.effectAllowed = 'copy';
        });

        // Click to select draw tool
        item.addEventListener('click', () => {
          Tools.setDrawShapeType(def.type);
          Tools.setTool('draw');
        });

        grid.appendChild(item);
      });

      section.appendChild(grid);
      palette.appendChild(section);
    });

    // Drop on canvas
    const canvasContainer = document.getElementById('canvas-container');
    canvasContainer.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });
    canvasContainer.addEventListener('drop', e => {
      e.preventDefault();
      const shapeType = e.dataTransfer.getData('text/plain');
      if (!shapeType) return;
      const rect = canvasContainer.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const canvasPos = Renderer.screenToCanvas(sx, sy);
      Tools.handlePaletteDrop(shapeType, canvasPos.x, canvasPos.y);
    });
  }

  // ===== TOOLBAR =====
  function buildToolbar() {
    const toolbar = document.getElementById('toolbar');
    Utils.removeChildren(toolbar);

    // Logo / App name
    const logo = document.createElement('div');
    logo.className = 'toolbar-group';
    logo.innerHTML = '<span style="font-weight:700;font-size:15px;color:#4a6cf7;letter-spacing:-0.5px;margin-right:8px">FlowCraft</span>';
    toolbar.appendChild(logo);

    // File operations
    const fileGroup = makeToolbarGroup([
      { id: 'btn-new', icon: iconNew, title: 'New (Ctrl+N)', action: () => confirmNew() },
      { id: 'btn-open', icon: iconOpen, title: 'Open (Ctrl+O)', action: () => ExportImport.loadFromFile() },
      { id: 'btn-save', icon: iconSave, title: 'Save (Ctrl+S)', action: () => ExportImport.saveToFile() },
    ]);
    toolbar.appendChild(fileGroup);

    // Export (single button with dropdown)
    const exportGroup = makeToolbarGroup([
      { id: 'btn-export', icon: iconExport, title: 'Export', action: (e) => showExportDropdown(e.currentTarget) },
    ]);
    toolbar.appendChild(exportGroup);

    // Undo/Redo
    const historyGroup = makeToolbarGroup([
      { id: 'btn-undo', icon: iconUndo, title: 'Undo (Ctrl+Z)', action: () => History.undo() },
      { id: 'btn-redo', icon: iconRedo, title: 'Redo (Ctrl+Y)', action: () => History.redo() },
    ]);
    toolbar.appendChild(historyGroup);

    // Tool selectors
    const toolGroup = makeToolbarGroup([
      { id: 'btn-tool-select', icon: iconCursor, title: 'Select (V)', action: () => Tools.setTool('select'), toolName: 'select' },
      { id: 'btn-tool-draw', icon: iconSquare, title: 'Draw (R)', action: () => { Tools.setDrawShapeType('basic:rectangle'); Tools.setTool('draw'); }, toolName: 'draw' },
      { id: 'btn-tool-connector', icon: iconConnect, title: 'Connector (L)', action: () => Tools.setTool('connector'), toolName: 'connector' },
      { id: 'btn-tool-text', icon: iconText, title: 'Text (T)', action: () => Tools.setTool('text'), toolName: 'text' },
      { id: 'btn-tool-pan', icon: iconHand, title: 'Pan (H)', action: () => Tools.setTool('pan'), toolName: 'pan' },
    ]);
    toolbar.appendChild(toolGroup);

    // Alignment
    const alignGroup = makeToolbarGroup([
      { id: 'btn-align-left', icon: iconAlignLeft, title: 'Align Left', action: () => Tools.alignShapes('left') },
      { id: 'btn-align-center', icon: iconAlignCenterH, title: 'Align Center', action: () => Tools.alignShapes('center-h') },
      { id: 'btn-align-right', icon: iconAlignRight, title: 'Align Right', action: () => Tools.alignShapes('right') },
      { id: 'btn-align-top', icon: iconAlignTop, title: 'Align Top', action: () => Tools.alignShapes('top') },
      { id: 'btn-align-middle', icon: iconAlignCenterV, title: 'Align Middle', action: () => Tools.alignShapes('center-v') },
      { id: 'btn-align-bottom', icon: iconAlignBottom, title: 'Align Bottom', action: () => Tools.alignShapes('bottom') },
    ]);
    toolbar.appendChild(alignGroup);

    // Zoom
    const zoomGroup = makeToolbarGroup([
      { id: 'btn-zoom-in', icon: iconZoomIn, title: 'Zoom In', action: () => Renderer.setZoom(Renderer.getZoom() * 1.2) },
      { id: 'btn-zoom-out', icon: iconZoomOut, title: 'Zoom Out', action: () => Renderer.setZoom(Renderer.getZoom() / 1.2) },
      { id: 'btn-zoom-fit', icon: iconZoomFit, title: 'Fit to Screen', action: () => zoomToFit() },
    ]);
    toolbar.appendChild(zoomGroup);

    // Grid toggle
    const gridGroup = makeToolbarGroup([
      { id: 'btn-grid', icon: iconGrid, title: 'Toggle Grid', action: () => {
        diagram.settings.showGrid = !diagram.settings.showGrid;
        Renderer.updateGrid();
      }},
      { id: 'btn-snap', icon: iconMagnet, title: 'Toggle Snap to Grid', action: () => {
        diagram.settings.snapToGrid = !diagram.settings.snapToGrid;
      }},
    ]);
    toolbar.appendChild(gridGroup);

    // Keyboard help
    const helpGroup = makeToolbarGroup([
      { id: 'btn-help', icon: iconHelp, title: 'Keyboard Shortcuts', action: () => showShortcutsDialog() },
    ]);
    toolbar.appendChild(helpGroup);

    updateHistoryButtons();
  }

  function makeToolbarGroup(buttons) {
    const group = document.createElement('div');
    group.className = 'toolbar-group';
    buttons.forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'toolbar-btn';
      btn.id = b.id;
      btn.title = b.title || '';
      btn.innerHTML = b.icon;
      if (b.toolName) btn.setAttribute('data-tool', b.toolName);
      btn.addEventListener('click', b.action);
      group.appendChild(btn);
    });
    return group;
  }

  function updateToolbar(toolName) {
    document.querySelectorAll('.toolbar-btn[data-tool]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tool') === toolName);
    });
    updateStatusBar();
  }

  function updateHistoryButtons() {
    const undoBtn = document.getElementById('btn-undo');
    const redoBtn = document.getElementById('btn-redo');
    if (undoBtn) undoBtn.style.opacity = History.canUndo() ? 1 : 0.3;
    if (redoBtn) redoBtn.style.opacity = History.canRedo() ? 1 : 0.3;
  }

  // ===== PROPERTIES PANEL =====
  function buildPropertiesPanel() {
    const props = document.getElementById('properties');
    Utils.removeChildren(props);

    const scrollArea = document.createElement('div');
    scrollArea.className = 'props-scroll';
    scrollArea.id = 'props-content';
    props.appendChild(scrollArea);

    updatePropertiesPanel([], null);
  }

  function updatePropertiesPanel(shapes, connector) {
    const content = document.getElementById('props-content');
    if (!content) return;
    Utils.removeChildren(content);

    if (shapes && shapes.length === 1) {
      buildShapeProperties(content, shapes[0]);
    } else if (connector) {
      buildConnectorProperties(content, connector);
    } else {
      buildCanvasProperties(content);
    }

    // Always show layers panel at bottom
    buildLayersPanel(content);
  }

  function buildShapeProperties(container, shape) {
    // Shape type label
    const def = Shapes.get(shape.type);
    const typeLabel = document.createElement('div');
    typeLabel.style.cssText = 'padding:6px 10px;font-size:11px;color:#888;border-bottom:1px solid #e0e0e4;margin-bottom:4px;';
    typeLabel.textContent = def ? `${def.category} — ${def.label}` : shape.type;
    container.appendChild(typeLabel);

    // Style
    const styleSection = makePropsSection('Style');
    const fillOnChange = v => {
      History.execute(new History.ChangeStyleCommand(shape.id, 'style', { ...shape.style }, { ...shape.style, fill: v }));
    };
    styleSection.appendChild(makePropRow('Fill', makeColorInput(shape.style.fill, fillOnChange)));
    styleSection.appendChild(makeColorSwatchPicker(shape.style.fill, fillOnChange));
    styleSection.appendChild(makePropRow('Stroke', makeColorInput(shape.style.stroke, v => {
      History.execute(new History.ChangeStyleCommand(shape.id, 'style', { ...shape.style }, { ...shape.style, stroke: v }));
    })));
    styleSection.appendChild(makePropRow('Width', makeNumberInput(shape.style.strokeWidth, v => {
      History.execute(new History.ChangeStyleCommand(shape.id, 'style', { ...shape.style }, { ...shape.style, strokeWidth: v }));
    })));
    styleSection.appendChild(makePropRow('Opacity', makeRangeInput(shape.style.opacity, 0, 1, 0.05, v => {
      History.execute(new History.ChangeStyleCommand(shape.id, 'style', { ...shape.style }, { ...shape.style, opacity: v }));
    })));

    const dashSelect = makeSelectInput(shape.style.strokeDash || '', [
      { value: '', label: 'Solid' },
      { value: '5 5', label: 'Dashed' },
      { value: '2 4', label: 'Dotted' },
      { value: '10 5 2 5', label: 'Dash-Dot' }
    ], v => {
      History.execute(new History.ChangeStyleCommand(shape.id, 'style', { ...shape.style }, { ...shape.style, strokeDash: v }));
    });
    styleSection.appendChild(makePropRow('Dash', dashSelect));
    container.appendChild(styleSection);

    // Text
    const textSection = makePropsSection('Text');
    const textInput = document.createElement('input');
    textInput.className = 'props-input';
    textInput.value = shape.text || '';
    textInput.addEventListener('change', () => {
      History.execute(new History.ChangeTextCommand(shape.id, shape.text || '', textInput.value));
    });
    textSection.appendChild(makePropRow('Label', textInput));

    textSection.appendChild(makePropRow('Size', makeNumberInput(shape.textStyle.fontSize, v => {
      History.execute(new History.ChangeStyleCommand(shape.id, 'textStyle', { ...shape.textStyle }, { ...shape.textStyle, fontSize: v }));
    })));
    textSection.appendChild(makePropRow('Color', makeColorInput(shape.textStyle.color, v => {
      History.execute(new History.ChangeStyleCommand(shape.id, 'textStyle', { ...shape.textStyle }, { ...shape.textStyle, color: v }));
    })));

    const fontWeightSelect = makeSelectInput(shape.textStyle.fontWeight, [
      { value: 'normal', label: 'Normal' },
      { value: 'bold', label: 'Bold' },
      { value: '300', label: 'Light' }
    ], v => {
      History.execute(new History.ChangeStyleCommand(shape.id, 'textStyle', { ...shape.textStyle }, { ...shape.textStyle, fontWeight: v }));
    });
    textSection.appendChild(makePropRow('Weight', fontWeightSelect));
    container.appendChild(textSection);

    // Timeline interval date attributes
    if (shape.data && shape.data.timelineInterval && shape.data.startDate && shape.data.endDate) {
      const dateSection = makePropsSection('Timeline Dates');

      const startInput = document.createElement('input');
      startInput.type = 'date';
      startInput.className = 'props-input';
      startInput.value = shape.data.startDate;
      startInput.addEventListener('change', () => {
        applyTimelineDateChange(shape, startInput.value, shape.data.endDate);
      });
      dateSection.appendChild(makePropRow('Start', startInput));

      const endInput = document.createElement('input');
      endInput.type = 'date';
      endInput.className = 'props-input';
      endInput.value = shape.data.endDate;
      endInput.addEventListener('change', () => {
        applyTimelineDateChange(shape, shape.data.startDate, endInput.value);
      });
      dateSection.appendChild(makePropRow('End', endInput));

      if (shape.data.taskName) {
        const nameInput = document.createElement('input');
        nameInput.className = 'props-input';
        nameInput.value = shape.data.taskName;
        nameInput.addEventListener('change', () => {
          const s = diagram.getShape(shape.id);
          const dateLbl = formatDateLabel(s.data.startDate, s.data.endDate);
          diagram.updateShapeDeep(shape.id, {
            text: nameInput.value + '\n' + dateLbl,
            data: { taskName: nameInput.value }
          });
        });
        dateSection.appendChild(makePropRow('Task', nameInput));
      }

      container.appendChild(dateSection);
    }

    // Swim Lane lanes editor
    if (shape.type === 'flowchart:swim-lane' && shape.data && shape.data.lanes) {
      const lanesSection = makePropsSection('Lanes');
      shape.data.lanes.forEach((lane, idx) => {
        const laneRow = document.createElement('div');
        laneRow.style.cssText = 'display:flex;gap:4px;align-items:center;padding:2px 0;';

        const numInput = document.createElement('input');
        numInput.className = 'props-input';
        numInput.style.width = '30px';
        numInput.value = lane.number || '';
        numInput.title = 'Number';
        numInput.addEventListener('change', () => {
          shape.data.lanes[idx].number = numInput.value;
          diagram.updateShapeDeep(shape.id, { data: { lanes: shape.data.lanes } });
        });

        const nameInput = document.createElement('input');
        nameInput.className = 'props-input';
        nameInput.style.flex = '1';
        nameInput.value = (lane.name || '').replace(/\n/g, ' ');
        nameInput.title = 'Name';
        nameInput.addEventListener('change', () => {
          shape.data.lanes[idx].name = nameInput.value;
          diagram.updateShapeDeep(shape.id, { data: { lanes: shape.data.lanes } });
        });

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.style.cssText = 'width:24px;height:20px;border:none;padding:0;cursor:pointer;';
        colorInput.value = lane.color || '#ffffff';
        colorInput.addEventListener('input', () => {
          shape.data.lanes[idx].color = colorInput.value;
          diagram.updateShapeDeep(shape.id, { data: { lanes: shape.data.lanes } });
        });

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '\u00d7';
        removeBtn.style.cssText = 'width:20px;height:20px;border:none;background:#eee;cursor:pointer;border-radius:3px;font-size:12px;line-height:1;';
        removeBtn.title = 'Remove lane';
        removeBtn.addEventListener('click', () => {
          shape.data.lanes.splice(idx, 1);
          const newH = shape.data.lanes.length * ((shape.data.laneHeight) || 62);
          diagram.updateShapeDeep(shape.id, { height: newH, data: { lanes: shape.data.lanes } });
          updatePropertiesPanel([diagram.getShape(shape.id)], null);
        });

        laneRow.append(numInput, nameInput, colorInput, removeBtn);
        lanesSection.appendChild(laneRow);
      });

      const addBtn = document.createElement('button');
      addBtn.textContent = '+ Add Lane';
      addBtn.style.cssText = 'margin-top:4px;padding:4px 10px;border:1px solid #ccc;background:#fafafa;cursor:pointer;border-radius:3px;font-size:11px;width:100%;';
      addBtn.addEventListener('click', () => {
        const num = String(shape.data.lanes.length + 1).padStart(2, '0');
        shape.data.lanes.push({ number: num, name: 'New lane', color: '#ffffff', textColor: '#333333' });
        const newH = shape.data.lanes.length * ((shape.data.laneHeight) || 62);
        diagram.updateShapeDeep(shape.id, { height: newH, data: { lanes: shape.data.lanes } });
        updatePropertiesPanel([diagram.getShape(shape.id)], null);
      });
      lanesSection.appendChild(addBtn);
      container.appendChild(lanesSection);
    }

    // Position & Size (at bottom)
    const posSection = makePropsSection('Position & Size');
    posSection.appendChild(makePropRow('X', makeNumberInput(shape.x, v => {
      History.execute(new History.MoveShapeCommand(shape.id, shape.x, shape.y, v, shape.y));
    })));
    posSection.appendChild(makePropRow('Y', makeNumberInput(shape.y, v => {
      History.execute(new History.MoveShapeCommand(shape.id, shape.x, shape.y, shape.x, v));
    })));
    posSection.appendChild(makePropRow('Width', makeNumberInput(shape.width, v => {
      History.execute(new History.ResizeShapeCommand(shape.id,
        { x: shape.x, y: shape.y, width: shape.width, height: shape.height },
        { x: shape.x, y: shape.y, width: v, height: shape.height }
      ));
    })));
    posSection.appendChild(makePropRow('Height', makeNumberInput(shape.height, v => {
      History.execute(new History.ResizeShapeCommand(shape.id,
        { x: shape.x, y: shape.y, width: shape.width, height: shape.height },
        { x: shape.x, y: shape.y, width: shape.width, height: v }
      ));
    })));
    posSection.appendChild(makePropRow('Rotation', makeNumberInput(shape.rotation || 0, v => {
      diagram.updateShape(shape.id, { rotation: v });
    })));
    container.appendChild(posSection);
  }

  function buildConnectorProperties(container, conn) {
    const styleSection = makePropsSection('Connector Style');
    styleSection.appendChild(makePropRow('Color', makeColorInput(conn.style.stroke, v => {
      History.execute(new History.ChangeConnectorStyleCommand(conn.id, { ...conn.style }, { ...conn.style, stroke: v }));
    })));
    styleSection.appendChild(makePropRow('Width', makeNumberInput(conn.style.strokeWidth, v => {
      History.execute(new History.ChangeConnectorStyleCommand(conn.id, { ...conn.style }, { ...conn.style, strokeWidth: v }));
    })));

    const routeSelect = makeSelectInput(conn.routingType, [
      { value: 'orthogonal', label: 'Orthogonal' },
      { value: 'straight', label: 'Straight' },
      { value: 'curved', label: 'Curved' }
    ], v => {
      diagram.updateConnector(conn.id, { routingType: v });
      conn.points = Connectors.routeConnector(diagram, conn);
      diagram.updateConnector(conn.id, { points: conn.points });
    });
    styleSection.appendChild(makePropRow('Routing', routeSelect));

    const endArrowSelect = makeSelectInput(conn.endArrow, [
      { value: 'arrow', label: 'Arrow' },
      { value: 'diamond', label: 'Diamond' },
      { value: 'circle', label: 'Circle' },
      { value: 'none', label: 'None' }
    ], v => {
      diagram.updateConnector(conn.id, { endArrow: v });
    });
    styleSection.appendChild(makePropRow('End', endArrowSelect));

    const startArrowSelect = makeSelectInput(conn.startArrow, [
      { value: 'none', label: 'None' },
      { value: 'arrow', label: 'Arrow' },
      { value: 'diamond', label: 'Diamond' },
      { value: 'circle', label: 'Circle' }
    ], v => {
      diagram.updateConnector(conn.id, { startArrow: v });
    });
    styleSection.appendChild(makePropRow('Start', startArrowSelect));

    // Label
    const labelInput = document.createElement('input');
    labelInput.className = 'props-input';
    labelInput.value = (conn.label && conn.label.text) || '';
    labelInput.addEventListener('change', () => {
      diagram.updateConnector(conn.id, { label: { text: labelInput.value, position: 0.5 } });
    });
    styleSection.appendChild(makePropRow('Label', labelInput));

    container.appendChild(styleSection);
  }

  function buildCanvasProperties(container) {
    const section = makePropsSection('Canvas');
    section.appendChild(makePropRow('Color', makeColorInput(diagram.settings.canvasColor, v => {
      diagram.settings.canvasColor = v;
      document.getElementById('canvas-container').style.background = v;
    })));
    section.appendChild(makePropRow('Grid Size', makeNumberInput(diagram.settings.gridSize, v => {
      diagram.settings.gridSize = Math.max(5, v);
      Renderer.updateGrid();
    })));

    const nameInput = document.createElement('input');
    nameInput.className = 'props-input';
    nameInput.value = diagram.name;
    nameInput.addEventListener('change', () => { diagram.name = nameInput.value; });
    section.appendChild(makePropRow('Name', nameInput));

    container.appendChild(section);
  }

  // ===== LAYERS PANEL =====
  function buildLayersPanel(container) {
    container = container || document.getElementById('props-content');
    if (!container) return;

    const section = makePropsSection('Layers');

    // Add layer button
    const addBtn = document.createElement('button');
    addBtn.className = 'props-btn';
    addBtn.textContent = '+ Add Layer';
    addBtn.style.marginBottom = '8px';
    addBtn.style.width = '100%';
    addBtn.addEventListener('click', () => {
      diagram.addLayer();
      updatePropertiesPanel(Tools.getSelectedShapes(), Tools.getSelectedConnector());
    });
    section.appendChild(addBtn);

    // Layer list
    diagram.layers.slice().reverse().forEach(layer => {
      const item = document.createElement('div');
      item.className = 'layer-item';

      // Visibility toggle
      const visBtn = document.createElement('button');
      visBtn.className = 'layer-btn' + (layer.visible ? ' active' : '');
      visBtn.innerHTML = layer.visible ? '&#128065;' : '&#128064;';
      visBtn.title = 'Toggle visibility';
      visBtn.addEventListener('click', e => {
        e.stopPropagation();
        diagram.updateLayer(layer.id, { visible: !layer.visible });
        updatePropertiesPanel(Tools.getSelectedShapes(), Tools.getSelectedConnector());
      });
      item.appendChild(visBtn);

      // Lock toggle
      const lockBtn = document.createElement('button');
      lockBtn.className = 'layer-btn' + (layer.locked ? ' active' : '');
      lockBtn.innerHTML = layer.locked ? '&#128274;' : '&#128275;';
      lockBtn.title = 'Toggle lock';
      lockBtn.addEventListener('click', e => {
        e.stopPropagation();
        diagram.updateLayer(layer.id, { locked: !layer.locked });
        updatePropertiesPanel(Tools.getSelectedShapes(), Tools.getSelectedConnector());
      });
      item.appendChild(lockBtn);

      // Name
      const nameSpan = document.createElement('span');
      nameSpan.className = 'layer-name';
      nameSpan.textContent = layer.name;
      item.appendChild(nameSpan);

      // Delete button (if more than 1 layer)
      if (diagram.layers.length > 1) {
        const delBtn = document.createElement('button');
        delBtn.className = 'layer-btn';
        delBtn.innerHTML = '&times;';
        delBtn.title = 'Delete layer';
        delBtn.addEventListener('click', e => {
          e.stopPropagation();
          diagram.removeLayer(layer.id);
          updatePropertiesPanel(Tools.getSelectedShapes(), Tools.getSelectedConnector());
        });
        item.appendChild(delBtn);
      }

      section.appendChild(item);
    });

    container.appendChild(section);
  }

  // ===== STATUS BAR =====
  function buildStatusBar() {
    updateStatusBar();
  }

  function updateStatusBar() {
    const bar = document.getElementById('statusbar');
    if (!bar) return;
    const zoom = Renderer ? Math.round(Renderer.getZoom() * 100) : 100;
    const shapes = diagram ? diagram.shapes.length : 0;
    const conns = diagram ? diagram.connectors.length : 0;
    const selected = Tools ? Tools.getSelectedShapes().length : 0;
    const tool = Tools ? Tools.getTool() : 'select';

    bar.innerHTML = `
      <span class="status-item">Tool: ${tool}</span>
      <span class="status-item">Zoom: ${zoom}%</span>
      <span class="status-item">Shapes: ${shapes}</span>
      <span class="status-item">Connectors: ${conns}</span>
      ${selected > 0 ? `<span class="status-item">Selected: ${selected}</span>` : ''}
      <span class="status-spacer"></span>
      <span class="status-item">FlowCraft v1.0</span>
    `;
  }

  // ===== Helper functions for property inputs =====
  function makePropsSection(title) {
    const section = document.createElement('div');
    section.className = 'props-section';
    const titleEl = document.createElement('div');
    titleEl.className = 'props-section-title';
    titleEl.textContent = title;
    section.appendChild(titleEl);
    return section;
  }

  function makePropRow(label, inputEl) {
    const row = document.createElement('div');
    row.className = 'props-row';
    const lbl = document.createElement('span');
    lbl.className = 'props-label';
    lbl.textContent = label;
    row.appendChild(lbl);
    row.appendChild(inputEl);
    return row;
  }

  function makeNumberInput(value, onChange) {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'props-input';
    input.value = Math.round(value * 100) / 100;
    input.addEventListener('change', () => onChange(parseFloat(input.value) || 0));
    return input;
  }

  function makeColorInput(value, onChange) {
    const input = document.createElement('input');
    input.type = 'color';
    input.className = 'props-input';
    input.value = value || '#000000';
    input.addEventListener('input', () => onChange(input.value));
    return input;
  }

  // 10 hues × 4 shades color palette (Lucidchart-style)
  const SWATCH_COLORS = [
    // Row 0 (lightest)
    '#ffcdd2','#ffe0b2','#fff9c4','#f0f4c3','#c8e6c9','#b2dfdb','#b3e5fc','#bbdefb','#d1c4e9','#f8bbd0',
    // Row 1
    '#ef9a9a','#ffcc80','#fff59d','#e6ee9c','#a5d6a7','#80cbc4','#81d4fa','#90caf9','#b39ddb','#f48fb1',
    // Row 2
    '#e57373','#ffb74d','#fff176','#dce775','#81c784','#4db6ac','#4fc3f7','#64b5f6','#9575cd','#f06292',
    // Row 3 (darkest)
    '#c62828','#e65100','#f9a825','#827717','#2e7d32','#00695c','#0277bd','#1565c0','#4527a0','#ad1457',
  ];

  function makeColorSwatchPicker(currentColor, onChange) {
    const grid = document.createElement('div');
    grid.className = 'color-swatch-grid';
    SWATCH_COLORS.forEach(color => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.backgroundColor = color;
      if (currentColor && color.toLowerCase() === currentColor.toLowerCase()) {
        swatch.classList.add('selected');
      }
      swatch.title = color;
      swatch.addEventListener('click', () => onChange(color));
      grid.appendChild(swatch);
    });
    return grid;
  }

  function makeRangeInput(value, min, max, step, onChange) {
    const input = document.createElement('input');
    input.type = 'range';
    input.className = 'props-input';
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = value;
    input.addEventListener('input', () => onChange(parseFloat(input.value)));
    return input;
  }

  function makeSelectInput(value, options, onChange) {
    const select = document.createElement('select');
    select.className = 'props-select';
    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (opt.value === value) option.selected = true;
      select.appendChild(option);
    });
    select.addEventListener('change', () => onChange(select.value));
    return select;
  }

  // ===== Dialogs =====
  function confirmNew() {
    if (diagram.shapes.length === 0 || confirm('Create a new diagram? Unsaved changes will be lost.')) {
      diagram.clear();
      History.clear();
      Renderer.setPan(0, 0);
      Renderer.setZoom(1);
    }
  }

  function showShortcutsDialog() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <h3>Keyboard Shortcuts</h3>
      <div class="shortcuts-grid">
        <span>Select tool</span><span class="key">V</span>
        <span>Draw rectangle</span><span class="key">R</span>
        <span>Connector tool</span><span class="key">L</span>
        <span>Text tool</span><span class="key">T</span>
        <span>Pan tool</span><span class="key">H</span>
        <span>Pan (hold)</span><span class="key">Space</span>
        <span>Undo</span><span class="key">Ctrl+Z</span>
        <span>Redo</span><span class="key">Ctrl+Y</span>
        <span>Copy</span><span class="key">Ctrl+C</span>
        <span>Paste</span><span class="key">Ctrl+V</span>
        <span>Cut</span><span class="key">Ctrl+X</span>
        <span>Duplicate</span><span class="key">Ctrl+D</span>
        <span>Select all</span><span class="key">Ctrl+A</span>
        <span>Delete</span><span class="key">Delete</span>
        <span>Group</span><span class="key">Ctrl+G</span>
        <span>Ungroup</span><span class="key">Ctrl+Shift+G</span>
        <span>Edit text</span><span>Double-click shape</span>
        <span>Zoom</span><span>Scroll wheel</span>
        <span>Multi-select</span><span class="key">Shift+Click</span>
        <span>Constrain (equal)</span><span class="key">Shift+Drag</span>
      </div>
      <div class="modal-buttons">
        <button class="props-btn primary" id="close-shortcuts">Close</button>
      </div>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    document.getElementById('close-shortcuts').addEventListener('click', () => overlay.remove());
  }

  function zoomToFit() {
    if (diagram.shapes.length === 0) return;
    const bounds = Utils.getBoundingRect(diagram.shapes);
    const container = Renderer.getContainer();
    const padding = 60;
    const cw = container.clientWidth - padding * 2;
    const ch = container.clientHeight - padding * 2;
    const scale = Math.min(cw / bounds.width, ch / bounds.height, 2);
    Renderer.setZoom(scale);
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    Renderer.setPan(
      container.clientWidth / 2 - centerX * scale,
      container.clientHeight / 2 - centerY * scale
    );
  }

  // ===== Export dropdown =====
  function showExportDropdown(anchorEl) {
    const existing = document.querySelector('.export-dropdown');
    if (existing) { existing.remove(); return; }

    const dropdown = document.createElement('div');
    dropdown.className = 'export-dropdown';

    const items = [
      { label: 'PNG Image', icon: iconImage, action: () => ExportImport.exportPNG() },
      { label: 'JPG Image', icon: iconJpg, action: () => ExportImport.exportJPG() },
      { label: 'PDF Document', icon: iconPdf, action: () => ExportImport.exportPDF() },
      { label: 'SVG Vector', icon: iconSvg, action: () => ExportImport.exportSVG() },
    ];

    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'context-menu-item';
      el.innerHTML = `<span style="width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0">${item.icon}</span> ${item.label}`;
      el.addEventListener('click', () => { item.action(); dropdown.remove(); });
      dropdown.appendChild(el);
    });

    const rect = anchorEl.getBoundingClientRect();
    dropdown.style.position = 'fixed';
    dropdown.style.top = rect.bottom + 4 + 'px';
    dropdown.style.left = rect.left + 'px';
    dropdown.style.background = 'var(--bg-secondary)';
    dropdown.style.border = '1px solid var(--border-color)';
    dropdown.style.borderRadius = '8px';
    dropdown.style.padding = '4px';
    dropdown.style.minWidth = '170px';
    dropdown.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
    dropdown.style.zIndex = '10000';
    document.body.appendChild(dropdown);

    const closeDropdown = (e) => {
      if (!dropdown.contains(e.target) && e.target !== anchorEl) {
        dropdown.remove();
        document.removeEventListener('click', closeDropdown);
      }
    };
    setTimeout(() => document.addEventListener('click', closeDropdown), 0);
  }

  // ===== Timeline date helpers =====
  function timelineDateToX(dateStr, tl) {
    const [sy, sm, sd] = tl.startDate.split('-').map(Number);
    const [ey, em, ed] = tl.endDate.split('-').map(Number);
    const [dy, dm, dd] = dateStr.split('-').map(Number);
    const startMs = new Date(sy, sm-1, sd).getTime();
    const endMs = new Date(ey, em-1, ed).getTime();
    const dateMs = new Date(dy, dm-1, dd).getTime();
    return tl.startX + ((dateMs - startMs) / (endMs - startMs)) * (tl.endX - tl.startX);
  }

  function formatDateLabel(startDate, endDate) {
    const [,sm,sd] = startDate.split('-').map(Number);
    const [,em,ed] = endDate.split('-').map(Number);
    return `${sm}/${sd} - ${em}/${ed}`;
  }

  function getTimelineConfig(shape) {
    if (shape.data && shape.data.timelineId) {
      const tl = diagram.getShape(shape.data.timelineId);
      if (tl && tl.data && tl.data.startDate && tl.data.endDate) {
        return { startDate: tl.data.startDate, endDate: tl.data.endDate, startX: tl.x, endX: tl.x + tl.width };
      }
    }
    return diagram.settings.timeline || null;
  }

  function applyTimelineDateChange(shape, newStartDate, newEndDate) {
    if (!newStartDate || !newEndDate || !/^\d{4}-\d{2}-\d{2}$/.test(newStartDate) || !/^\d{4}-\d{2}-\d{2}$/.test(newEndDate)) return;
    const tl = getTimelineConfig(shape);
    if (!tl) return;
    const newX = timelineDateToX(newStartDate, tl);
    const newEndX = timelineDateToX(newEndDate, tl);
    if (isNaN(newX) || isNaN(newEndX) || newEndX <= newX) return;
    const taskName = shape.data.taskName || shape.text.split('\n')[0];
    const dateLbl = formatDateLabel(newStartDate, newEndDate);
    diagram.updateShapeDeep(shape.id, {
      x: newX,
      width: newEndX - newX,
      text: taskName + '\n' + dateLbl,
      data: { startDate: newStartDate, endDate: newEndDate }
    });
    // Refresh the properties panel with updated shape
    const updated = diagram.getShape(shape.id);
    updatePropertiesPanel([updated], null);
  }

  // ===== SVG Icons for toolbar =====
  const iconNew = '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
  const iconOpen = '<svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>';
  const iconSave = '<svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>';
  const iconImage = '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
  const iconExport = '<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  const iconJpg = '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><text x="12" y="15" text-anchor="middle" font-size="8" font-weight="bold" fill="currentColor" stroke="none">JPG</text></svg>';
  const iconPdf = '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><text x="12" y="17" text-anchor="middle" font-size="7" font-weight="bold" fill="currentColor" stroke="none">PDF</text></svg>';
  const iconSvg = '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M8 16l2-2 2 2 2-2 2 2"/></svg>';
  const iconUndo = '<svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>';
  const iconRedo = '<svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.13-9.36L23 10"/></svg>';
  const iconCursor = '<svg viewBox="0 0 24 24"><path d="M4 4l7 17 2.5-6.5L20 12z"/></svg>';
  const iconSquare = '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>';
  const iconConnect = '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 12h10"/><polyline points="14 8 18 12 14 16"/></svg>';
  const iconText = '<svg viewBox="0 0 24 24"><polyline points="4 7 4 4 20 4 20 7"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="8" y1="20" x2="16" y2="20"/></svg>';
  const iconHand = '<svg viewBox="0 0 24 24"><path d="M18 11V6a2 2 0 00-4 0v5m0 0V4a2 2 0 00-4 0v7m0 0V6a2 2 0 00-4 0v8a8 8 0 0016 0v-3a2 2 0 00-4 0"/></svg>';
  const iconAlignLeft = '<svg viewBox="0 0 24 24"><line x1="4" y1="4" x2="4" y2="20"/><rect x="8" y="6" width="12" height="4"/><rect x="8" y="14" width="8" height="4"/></svg>';
  const iconAlignCenterH = '<svg viewBox="0 0 24 24"><line x1="12" y1="4" x2="12" y2="20"/><rect x="6" y="6" width="12" height="4"/><rect x="8" y="14" width="8" height="4"/></svg>';
  const iconAlignRight = '<svg viewBox="0 0 24 24"><line x1="20" y1="4" x2="20" y2="20"/><rect x="4" y="6" width="12" height="4"/><rect x="8" y="14" width="8" height="4"/></svg>';
  const iconAlignTop = '<svg viewBox="0 0 24 24"><line x1="4" y1="4" x2="20" y2="4"/><rect x="6" y="8" width="4" height="12"/><rect x="14" y="8" width="4" height="8"/></svg>';
  const iconAlignCenterV = '<svg viewBox="0 0 24 24"><line x1="4" y1="12" x2="20" y2="12"/><rect x="6" y="4" width="4" height="16"/><rect x="14" y="6" width="4" height="12"/></svg>';
  const iconAlignBottom = '<svg viewBox="0 0 24 24"><line x1="4" y1="20" x2="20" y2="20"/><rect x="6" y="4" width="4" height="12"/><rect x="14" y="8" width="4" height="8"/></svg>';
  const iconZoomIn = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';
  const iconZoomOut = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';
  const iconZoomFit = '<svg viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>';
  const iconGrid = '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>';
  const iconMagnet = '<svg viewBox="0 0 24 24"><path d="M6 2v6a6 6 0 0012 0V2M6 2h4m4 0h4M6 8h4m4 0h4"/></svg>';
  const iconHelp = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';

  return { init, updatePropertiesPanel, updateStatusBar, zoomToFit };
})();
