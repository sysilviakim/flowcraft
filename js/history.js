// FlowCraft - Undo/Redo Command Stack
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

const History = (() => {
  let undoStack = [];
  let redoStack = [];
  let diagram = null;
  let batchCommands = null; // for composite commands
  let onChange = null;

  function init(diag) {
    diagram = diag;
    undoStack = [];
    redoStack = [];
  }

  function setOnChange(fn) {
    onChange = fn;
  }

  function notify() {
    if (onChange) onChange();
  }

  // --- Execute a command ---
  function execute(cmd) {
    if (batchCommands) {
      cmd.execute();
      batchCommands.push(cmd);
      return;
    }
    cmd.execute();
    undoStack.push(cmd);
    redoStack = []; // clear redo on new action
    notify();
  }

  // Record a command without executing it (for actions already applied, e.g. drag moves)
  function record(cmd) {
    if (batchCommands) {
      batchCommands.push(cmd);
      return;
    }
    undoStack.push(cmd);
    redoStack = [];
    notify();
  }

  function undo() {
    if (undoStack.length === 0) return;
    const cmd = undoStack.pop();
    cmd.undo();
    redoStack.push(cmd);
    notify();
  }

  function redo() {
    if (redoStack.length === 0) return;
    const cmd = redoStack.pop();
    cmd.execute();
    undoStack.push(cmd);
    notify();
  }

  function canUndo() { return undoStack.length > 0; }
  function canRedo() { return redoStack.length > 0; }

  // Batch multiple commands into one undo step
  function beginBatch() {
    batchCommands = [];
  }

  function endBatch(name) {
    if (!batchCommands) return;
    const cmds = batchCommands;
    batchCommands = null;
    if (cmds.length === 0) return;
    if (cmds.length === 1) {
      undoStack.push(cmds[0]);
    } else {
      undoStack.push(new CompositeCommand(name || 'Batch', cmds));
    }
    redoStack = [];
    notify();
  }

  function cancelBatch() {
    if (!batchCommands) return;
    // Undo everything in the batch
    for (let i = batchCommands.length - 1; i >= 0; i--) {
      batchCommands[i].undo();
    }
    batchCommands = null;
    notify();
  }

  function clear() {
    undoStack = [];
    redoStack = [];
    notify();
  }

  // ===== Command Classes =====

  class AddShapeCommand {
    constructor(shape) {
      this.shape = Utils.deepClone(shape);
    }
    execute() { diagram.addShape(Utils.deepClone(this.shape)); }
    undo() { diagram.removeShape(this.shape.id); }
  }

  class RemoveShapeCommand {
    constructor(shape, connectors) {
      this.shape = Utils.deepClone(shape);
      this.connectors = (connectors || []).map(c => Utils.deepClone(c));
    }
    execute() { diagram.removeShape(this.shape.id); }
    undo() {
      diagram.addShape(Utils.deepClone(this.shape));
      this.connectors.forEach(c => {
        if (!diagram.getConnector(c.id)) {
          diagram.addConnector(Utils.deepClone(c));
        }
      });
    }
  }

  class MoveShapeCommand {
    constructor(shapeId, oldX, oldY, newX, newY) {
      this.shapeId = shapeId;
      this.oldX = oldX; this.oldY = oldY;
      this.newX = newX; this.newY = newY;
    }
    _moveChildren(dx, dy) {
      const shape = diagram.getShape(this.shapeId);
      if (!shape) return;
      const def = Shapes.get(shape.type);
      if (def && def.isContainer) {
        const children = diagram.getChildrenOfContainer(this.shapeId);
        children.forEach(child => {
          diagram.updateShape(child.id, { x: child.x + dx, y: child.y + dy });
          Connectors.updateConnectorsForShape(diagram, child.id);
        });
      }
    }
    execute() {
      diagram.updateShape(this.shapeId, { x: this.newX, y: this.newY });
      Connectors.updateConnectorsForShape(diagram, this.shapeId);
      this._moveChildren(this.newX - this.oldX, this.newY - this.oldY);
    }
    undo() {
      diagram.updateShape(this.shapeId, { x: this.oldX, y: this.oldY });
      Connectors.updateConnectorsForShape(diagram, this.shapeId);
      this._moveChildren(this.oldX - this.newX, this.oldY - this.newY);
    }
  }

  class ResizeShapeCommand {
    constructor(shapeId, oldBounds, newBounds) {
      this.shapeId = shapeId;
      this.oldBounds = { ...oldBounds };
      this.newBounds = { ...newBounds };
    }
    execute() {
      diagram.updateShape(this.shapeId, this.newBounds);
      Connectors.updateConnectorsForShape(diagram, this.shapeId);
    }
    undo() {
      diagram.updateShape(this.shapeId, this.oldBounds);
      Connectors.updateConnectorsForShape(diagram, this.shapeId);
    }
  }

  class ChangeStyleCommand {
    constructor(shapeId, property, oldValue, newValue) {
      this.shapeId = shapeId;
      this.property = property;
      this.oldValue = typeof oldValue === 'object' ? Utils.deepClone(oldValue) : oldValue;
      this.newValue = typeof newValue === 'object' ? Utils.deepClone(newValue) : newValue;
    }
    execute() {
      diagram.updateShapeDeep(this.shapeId, { [this.property]: this.newValue });
    }
    undo() {
      diagram.updateShapeDeep(this.shapeId, { [this.property]: this.oldValue });
    }
  }

  class ChangeTextCommand {
    constructor(shapeId, oldText, newText) {
      this.shapeId = shapeId;
      this.oldText = oldText;
      this.newText = newText;
    }
    execute() { diagram.updateShape(this.shapeId, { text: this.newText }); }
    undo() { diagram.updateShape(this.shapeId, { text: this.oldText }); }
  }

  class AddConnectorCommand {
    constructor(conn) {
      this.conn = Utils.deepClone(conn);
    }
    execute() { diagram.addConnector(Utils.deepClone(this.conn)); }
    undo() { diagram.removeConnector(this.conn.id); }
  }

  class RemoveConnectorCommand {
    constructor(conn) {
      this.conn = Utils.deepClone(conn);
    }
    execute() { diagram.removeConnector(this.conn.id); }
    undo() { diagram.addConnector(Utils.deepClone(this.conn)); }
  }

  class ChangeConnectorStyleCommand {
    constructor(connId, oldStyle, newStyle) {
      this.connId = connId;
      this.oldStyle = Utils.deepClone(oldStyle);
      this.newStyle = Utils.deepClone(newStyle);
    }
    execute() { diagram.updateConnector(this.connId, { style: Utils.deepClone(this.newStyle) }); }
    undo() { diagram.updateConnector(this.connId, { style: Utils.deepClone(this.oldStyle) }); }
  }

  class CompositeCommand {
    constructor(name, commands) {
      this.name = name;
      this.commands = commands;
    }
    execute() { this.commands.forEach(c => c.execute()); }
    undo() {
      for (let i = this.commands.length - 1; i >= 0; i--) {
        this.commands[i].undo();
      }
    }
  }

  class GroupCommand {
    constructor(shapeIds, groupId) {
      this.shapeIds = [...shapeIds];
      this.groupId = groupId;
    }
    execute() { diagram.addGroup(this.shapeIds); }
    undo() { diagram.removeGroup(this.groupId); }
  }

  class UngroupCommand {
    constructor(group) {
      this.group = Utils.deepClone(group);
    }
    execute() { diagram.removeGroup(this.group.id); }
    undo() { diagram.addGroup(this.group.shapeIds, this.group.name); }
  }

  class SetContainerCommand {
    constructor(shapeId, oldContainerId, newContainerId) {
      this.shapeId = shapeId;
      this.oldContainerId = oldContainerId;
      this.newContainerId = newContainerId;
    }
    execute() {
      if (this.newContainerId) {
        diagram.setContainer(this.shapeId, this.newContainerId);
      } else {
        diagram.removeFromContainer(this.shapeId);
      }
    }
    undo() {
      if (this.oldContainerId) {
        diagram.setContainer(this.shapeId, this.oldContainerId);
      } else {
        diagram.removeFromContainer(this.shapeId);
      }
    }
  }

  class ChangeShapeDataCommand {
    constructor(shapeId, oldData, newData) {
      this.shapeId = shapeId;
      this.oldData = Utils.deepClone(oldData);
      this.newData = Utils.deepClone(newData);
    }
    execute() {
      diagram.updateShapeDeep(this.shapeId, { data: this.newData });
    }
    undo() {
      diagram.updateShapeDeep(this.shapeId, { data: this.oldData });
    }
  }

  return {
    init, setOnChange, execute, record, undo, redo, canUndo, canRedo,
    beginBatch, endBatch, cancelBatch, clear,
    AddShapeCommand, RemoveShapeCommand, MoveShapeCommand, ResizeShapeCommand,
    ChangeStyleCommand, ChangeTextCommand,
    AddConnectorCommand, RemoveConnectorCommand, ChangeConnectorStyleCommand,
    CompositeCommand, GroupCommand, UngroupCommand,
    SetContainerCommand, ChangeShapeDataCommand
  };
})();
