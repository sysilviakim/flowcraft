// FlowCraft - Data Model
// Diagram, Shape, Connector, Layer, Group data model with event emitter
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

const Model = (() => {
  const DEFAULT_TEXT_STYLE = {
    fontFamily: 'MaruBuri, Inter, system-ui, sans-serif',
    fontSize: 10,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    color: '#1a1a2e',
    align: 'center',
    vAlign: 'middle'
  };

  const DEFAULT_SHAPE_STYLE = {
    fill: '#ffffff',
    stroke: '#1a7a4c',
    strokeWidth: 2,
    strokeDash: '',
    opacity: 1,
    shadow: false
  };

  const DEFAULT_CONNECTOR_STYLE = {
    stroke: '#1a7a4c',
    strokeWidth: 2,
    strokeDash: ''
  };

  class Diagram extends Utils.EventEmitter {
    constructor() {
      super();
      this.id = Utils.uid('diag');
      this.name = 'Untitled Diagram';
      this.created = Date.now();
      this.modified = Date.now();
      this.settings = {
        gridSize: 40,
        snapToGrid: true,
        showGrid: true,
        canvasColor: '#ffffff'
      };
      this.layers = [{ id: 'layer_default', name: 'Layer 1', visible: true, locked: false, order: 0 }];
      this.shapes = [];
      this.connectors = [];
      this.groups = [];
      this._shapeMap = new Map();
      this._connectorMap = new Map();
    }

    // --- Shape operations ---
    addShape(shape) {
      if (!shape.id) shape.id = Utils.uid('shp');
      if (!shape.layerId) shape.layerId = this.layers[0].id;
      this.shapes.push(shape);
      this._shapeMap.set(shape.id, shape);
      this.modified = Date.now();
      this.emit('shape:added', shape);
      this.emit('changed');
      return shape;
    }

    removeShape(id) {
      const idx = this.shapes.findIndex(s => s.id === id);
      if (idx === -1) return null;
      const shape = this.shapes.splice(idx, 1)[0];
      this._shapeMap.delete(id);
      // Remove connected connectors
      const toRemove = this.connectors.filter(c => c.sourceShapeId === id || c.targetShapeId === id);
      toRemove.forEach(c => this.removeConnector(c.id));
      // Clear containerId from children if this was a container
      this.shapes.forEach(s => {
        if (s.containerId === id) s.containerId = null;
      });
      this.modified = Date.now();
      this.emit('shape:removed', shape);
      this.emit('changed');
      return shape;
    }

    // --- Container operations ---
    getChildrenOfContainer(containerId) {
      return this.shapes.filter(s => s.containerId === containerId);
    }

    setContainer(shapeId, containerId) {
      const shape = this._shapeMap.get(shapeId);
      if (!shape) return;
      shape.containerId = containerId;
      this.modified = Date.now();
      this.emit('shape:changed', shape);
      this.emit('changed');
    }

    removeFromContainer(shapeId) {
      const shape = this._shapeMap.get(shapeId);
      if (!shape) return;
      shape.containerId = null;
      this.modified = Date.now();
      this.emit('shape:changed', shape);
      this.emit('changed');
    }

    getShape(id) {
      return this._shapeMap.get(id) || null;
    }

    updateShape(id, changes) {
      const shape = this._shapeMap.get(id);
      if (!shape) return null;
      Object.assign(shape, changes);
      this.modified = Date.now();
      this.emit('shape:changed', shape);
      this.emit('changed');
      return shape;
    }

    updateShapeDeep(id, changes) {
      const shape = this._shapeMap.get(id);
      if (!shape) return null;
      for (const [key, val] of Object.entries(changes)) {
        if (val && typeof val === 'object' && !Array.isArray(val) && shape[key] && typeof shape[key] === 'object') {
          Object.assign(shape[key], val);
        } else {
          shape[key] = val;
        }
      }
      this.modified = Date.now();
      this.emit('shape:changed', shape);
      this.emit('changed');
      return shape;
    }

    // --- Connector operations ---
    addConnector(conn) {
      if (!conn.id) conn.id = Utils.uid('conn');
      if (!conn.layerId) conn.layerId = this.layers[0].id;
      this.connectors.push(conn);
      this._connectorMap.set(conn.id, conn);
      this.modified = Date.now();
      this.emit('connector:added', conn);
      this.emit('changed');
      return conn;
    }

    removeConnector(id) {
      const idx = this.connectors.findIndex(c => c.id === id);
      if (idx === -1) return null;
      const conn = this.connectors.splice(idx, 1)[0];
      this._connectorMap.delete(id);
      this.modified = Date.now();
      this.emit('connector:removed', conn);
      this.emit('changed');
      return conn;
    }

    getConnector(id) {
      return this._connectorMap.get(id) || null;
    }

    updateConnector(id, changes) {
      const conn = this._connectorMap.get(id);
      if (!conn) return null;
      Object.assign(conn, changes);
      this.modified = Date.now();
      this.emit('connector:changed', conn);
      this.emit('changed');
      return conn;
    }

    getConnectorsForShape(shapeId) {
      return this.connectors.filter(c => c.sourceShapeId === shapeId || c.targetShapeId === shapeId);
    }

    // --- Layer operations ---
    addLayer(name) {
      const layer = {
        id: Utils.uid('layer'),
        name: name || `Layer ${this.layers.length + 1}`,
        visible: true,
        locked: false,
        order: this.layers.length
      };
      this.layers.push(layer);
      this.emit('layer:added', layer);
      this.emit('changed');
      return layer;
    }

    removeLayer(id) {
      if (this.layers.length <= 1) return null;
      const idx = this.layers.findIndex(l => l.id === id);
      if (idx === -1) return null;
      const layer = this.layers.splice(idx, 1)[0];
      // Move shapes to first layer
      const firstLayer = this.layers[0];
      this.shapes.filter(s => s.layerId === id).forEach(s => { s.layerId = firstLayer.id; });
      this.connectors.filter(c => c.layerId === id).forEach(c => { c.layerId = firstLayer.id; });
      this.emit('layer:removed', layer);
      this.emit('changed');
      return layer;
    }

    getLayer(id) {
      return this.layers.find(l => l.id === id) || null;
    }

    updateLayer(id, changes) {
      const layer = this.layers.find(l => l.id === id);
      if (!layer) return null;
      Object.assign(layer, changes);
      this.emit('layer:changed', layer);
      this.emit('changed');
      return layer;
    }

    // --- Group operations ---
    addGroup(shapeIds, name) {
      const group = {
        id: Utils.uid('grp'),
        shapeIds: [...shapeIds],
        name: name || 'Group'
      };
      this.groups.push(group);
      shapeIds.forEach(sid => {
        const s = this.getShape(sid);
        if (s) s.groupId = group.id;
      });
      this.emit('group:added', group);
      this.emit('changed');
      return group;
    }

    removeGroup(id) {
      const idx = this.groups.findIndex(g => g.id === id);
      if (idx === -1) return null;
      const group = this.groups.splice(idx, 1)[0];
      group.shapeIds.forEach(sid => {
        const s = this.getShape(sid);
        if (s) s.groupId = null;
      });
      this.emit('group:removed', group);
      this.emit('changed');
      return group;
    }

    getGroup(id) {
      return this.groups.find(g => g.id === id) || null;
    }

    getGroupForShape(shapeId) {
      return this.groups.find(g => g.shapeIds.includes(shapeId)) || null;
    }

    // --- Z-ordering ---
    bringToFront(shapeId) {
      const idx = this.shapes.findIndex(s => s.id === shapeId);
      if (idx === -1) return;
      const [shape] = this.shapes.splice(idx, 1);
      this.shapes.push(shape);
      this.emit('shape:reordered');
      this.emit('changed');
    }

    sendToBack(shapeId) {
      const idx = this.shapes.findIndex(s => s.id === shapeId);
      if (idx === -1) return;
      const [shape] = this.shapes.splice(idx, 1);
      this.shapes.unshift(shape);
      this.emit('shape:reordered');
      this.emit('changed');
    }

    // --- Serialization ---
    toJSON() {
      return {
        id: this.id,
        name: this.name,
        created: this.created,
        modified: this.modified,
        settings: { ...this.settings },
        layers: this.layers.map(l => ({ ...l })),
        shapes: this.shapes.map(s => Utils.deepClone(s)),
        connectors: this.connectors.map(c => Utils.deepClone(c)),
        groups: this.groups.map(g => ({ ...g, shapeIds: [...g.shapeIds] }))
      };
    }

    fromJSON(data) {
      data = data && typeof data === 'object' ? data : {};
      this.id = data.id || Utils.uid('diag');
      this.name = data.name || 'Untitled Diagram';
      this.created = data.created || Date.now();
      this.modified = data.modified || Date.now();
      this.settings = { ...this.settings, ...data.settings };
      this.layers = Array.isArray(data.layers) && data.layers.length > 0
        ? data.layers
        : [{ id: 'layer_default', name: 'Layer 1', visible: true, locked: false, order: 0 }];
      this.shapes = (Array.isArray(data.shapes) ? data.shapes : []).map(s => normalizeShape(s, this.layers));
      this.connectors = (Array.isArray(data.connectors) ? data.connectors : []).map(c => normalizeConnector(c, this.layers));
      this.groups = (Array.isArray(data.groups) ? data.groups : []).map(g => {
        g = g && typeof g === 'object' ? g : {};
        return {
          id: g.id || Utils.uid('grp'),
          name: g.name || 'Group',
          shapeIds: Array.isArray(g.shapeIds) ? [...g.shapeIds] : []
        };
      });
      this._shapeMap.clear();
      this._connectorMap.clear();
      this.shapes.forEach(s => this._shapeMap.set(s.id, s));
      this.connectors.forEach(c => this._connectorMap.set(c.id, c));
      this.emit('diagram:loaded');
      this.emit('changed');
      return this;
    }

    clear() {
      this.shapes = [];
      this.connectors = [];
      this.groups = [];
      this._shapeMap.clear();
      this._connectorMap.clear();
      this.layers = [{ id: 'layer_default', name: 'Layer 1', visible: true, locked: false, order: 0 }];
      this.settings = { gridSize: 40, snapToGrid: true, showGrid: true, canvasColor: '#ffffff' };
      this.name = 'Untitled Diagram';
      this.emit('diagram:cleared');
      this.emit('changed');
    }
  }

  // --- Shape factory ---
  function createShape(type, x, y, width, height, extra = {}) {
    return {
      id: Utils.uid('shp'),
      type: type,
      x, y, width, height,
      rotation: 0,
      text: '',
      textStyle: { ...DEFAULT_TEXT_STYLE },
      style: { ...DEFAULT_SHAPE_STYLE },
      layerId: null,
      groupId: null,
      containerId: null,
      locked: false,
      ports: [],
      data: {},
      ...extra
    };
  }

  function createConnector(sourceShapeId, sourcePortId, targetShapeId, targetPortId, extra = {}) {
    return {
      id: Utils.uid('conn'),
      sourceShapeId,
      sourcePortId,
      targetShapeId,
      targetPortId,
      points: [],
      style: { ...DEFAULT_CONNECTOR_STYLE },
      startArrow: 'none',
      endArrow: 'arrow',
      label: { text: '', position: 0.5 },
      routingType: 'orthogonal',
      layerId: null,
      ...extra
    };
  }

  // Loaded files and autosaves are untrusted: strip unsafe rich HTML
  function sanitizeRich(text) {
    const rt = typeof Utils !== 'undefined' ? Utils.RichText : null;
    return rt && rt.isRichText(text) ? rt.sanitizeHtml(text) : text;
  }

  function normalizeShape(shape, layers) {
    shape = shape && typeof shape === 'object' ? shape : {};
    const normalized = { ...shape };
    normalized.id = normalized.id || Utils.uid('shp');
    normalized.type = normalized.type || 'basic:rectangle';
    const def = typeof Shapes !== 'undefined' ? Shapes.get(normalized.type) : null;
    const defaultStyle = { ...DEFAULT_SHAPE_STYLE, ...((def && def.defaultStyle) || {}) };
    const defaultTextStyle = { ...DEFAULT_TEXT_STYLE, ...((def && def.defaultTextStyle) || {}) };
    const defaultData = def && def.defaultData ? def.defaultData() : {};
    const defaultSize = (def && def.defaultSize) || { width: 140, height: 80 };
    normalized.x = Number.isFinite(Number(normalized.x)) ? Number(normalized.x) : 0;
    normalized.y = Number.isFinite(Number(normalized.y)) ? Number(normalized.y) : 0;
    normalized.width = Number.isFinite(Number(normalized.width)) ? Number(normalized.width) : defaultSize.width;
    normalized.height = Number.isFinite(Number(normalized.height)) ? Number(normalized.height) : defaultSize.height;
    normalized.rotation = Number.isFinite(Number(normalized.rotation)) ? Number(normalized.rotation) : 0;
    normalized.text = typeof normalized.text === 'string' ? normalized.text : '';
    normalized.text = sanitizeRich(normalized.text);
    normalized.textStyle = { ...defaultTextStyle, ...(normalized.textStyle || {}) };
    normalized.style = { ...defaultStyle, ...(normalized.style || {}) };
    normalized.layerId = normalized.layerId || (layers[0] && layers[0].id) || 'layer_default';
    normalized.groupId = normalized.groupId || null;
    normalized.containerId = normalized.containerId || null;
    normalized.locked = !!normalized.locked;
    normalized.ports = Array.isArray(normalized.ports) ? normalized.ports : [];
    normalized.data = normalized.data && typeof normalized.data === 'object'
      ? { ...defaultData, ...normalized.data }
      : defaultData;
    return normalized;
  }

  function normalizeConnector(conn, layers) {
    conn = conn && typeof conn === 'object' ? conn : {};
    const normalized = { ...conn };
    normalized.id = normalized.id || Utils.uid('conn');
    normalized.points = Array.isArray(normalized.points) ? normalized.points : [];
    normalized.style = { ...DEFAULT_CONNECTOR_STYLE, ...(normalized.style || {}) };
    normalized.startArrow = normalized.startArrow || 'none';
    normalized.endArrow = normalized.endArrow || 'arrow';
    normalized.label = normalized.label && typeof normalized.label === 'object'
      ? { text: normalized.label.text || '', position: normalized.label.position ?? 0.5 }
      : { text: '', position: 0.5 };
    normalized.label.text = sanitizeRich(normalized.label.text);
    normalized.routingType = normalized.routingType || 'orthogonal';
    normalized.layerId = normalized.layerId || (layers[0] && layers[0].id) || 'layer_default';
    return normalized;
  }

  return { Diagram, createShape, createConnector };
})();
