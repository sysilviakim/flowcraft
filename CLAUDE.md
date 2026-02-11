Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 FlowCraft — Local Diagramming Application (Lucidchart Alternative)

 Context

 The user wants a free, local, browser-based diagramming application that rivals Lucidchart. It should open directly in a browser
 from a local HTML file with zero external dependencies. The app must support general-purpose diagramming: flowcharts, UML, network
  diagrams, org charts, mind maps, and ER diagrams — with a full feature set including smart connectors, layers, undo/redo, export,
  and styling.

 Architecture Overview

 ┌─────────────────────────────────────────────────────┐
 │                   index.html                         │
 │  ┌──────────┐ ┌──────────────────┐ ┌─────────────┐ │
 │  │  Shape    │ │   SVG Canvas     │ │ Properties  │ │
 │  │  Palette  │ │   (renderer.js)  │ │ Panel       │ │
 │  │  (ui.js)  │ │                  │ │ (ui.js)     │ │
 │  └──────────┘ └──────────────────┘ └─────────────┘ │
 │  ┌────────────────────────────────────────────────┐ │
 │  │              Top Toolbar (ui.js)                │ │
 │  └────────────────────────────────────────────────┘ │
 └─────────────────────────────────────────────────────┘
          │              │              │
     ┌────▼────┐   ┌─────▼─────┐  ┌───▼────┐
     │tools.js │   │ model.js  │  │history.js│
     │(input)  │   │ (data)    │  │(undo)   │
     └─────────┘   └───────────┘  └─────────┘
          │              │
     ┌────▼────┐   ┌─────▼─────┐
     │shapes.js│   │connectors │
     │(defs)   │   │   .js     │
     └─────────┘   └───────────┘

 Data flow: User interacts via tools.js → tools modify model.js → model emits change events → renderer.js re-renders SVG → ui.js
 updates panels. history.js wraps every model mutation for undo/redo.

 File Structure

 flowchart/
 ├── CLAUDE.md           # Project context for Claude Code resumption
 ├── index.html          # Main HTML layout, inline SVG icons, script tags
 ├── style.css           # All CSS (CSS Grid layout, panels, toolbar, themes)
 ├── js/
 │   ├── utils.js        # Geometry, color, DOM helpers (no dependencies)
 │   ├── model.js        # Data model with event emitter (depends: utils)
 │   ├── shapes.js       # Shape registry & definitions (depends: utils)
 │   ├── history.js      # Undo/redo command stack (depends: model)
 │   ├── renderer.js     # SVG rendering & canvas workspace (depends: model, shapes)
 │   ├── connectors.js   # Connector routing & ports (depends: model, renderer, utils)
 │   ├── tools.js        # Tool system & interactions (depends: model, renderer, connectors, history)
 │   ├── ui.js           # All UI panels & menus (depends: model, tools, shapes, history)
 │   ├── export.js       # Save/load/export (depends: model, renderer)
 │   └── app.js          # Bootstrap & wire everything (depends: all)

 Data Model (model.js)

 // Core diagram structure (also the JSON save format)
 Diagram {
   id, name, created, modified,
   settings: { gridSize, snapToGrid, showGrid, canvasColor },
   layers: [Layer],
   shapes: [Shape],
   connectors: [Connector],
   groups: [Group]
 }

 Shape {
   id, type,              // e.g. "flowchart:decision"
   x, y, width, height, rotation,
   text, textStyle: { fontFamily, fontSize, fontWeight, color, align, vAlign },
   style: { fill, stroke, strokeWidth, strokeDash, opacity, shadow },
   layerId, groupId, locked,
   ports: [{ id, side, offset }],   // connection points
   data: {}                          // shape-type-specific data
 }

 Connector {
   id,
   sourceShapeId, sourcePortId,
   targetShapeId, targetPortId,
   points: [{x,y}],                 // waypoints for orthogonal routing
   style: { stroke, strokeWidth, strokeDash },
   startArrow, endArrow,            // "none", "arrow", "diamond", "circle"
   label: { text, position },
   routingType: "orthogonal" | "straight" | "curved",
   layerId
 }

 Layer { id, name, visible, locked, order }
 Group { id, shapeIds, name }

 Model uses a simple event emitter pattern: diagram.on('shape:added', callback), diagram.on('shape:changed', callback), etc. This
 decouples model from rendering.

 Shape Definitions (shapes.js)

 Each shape type defines: { category, type, label, icon, defaultSize, ports, render(shape) → SVG path data }.

 Categories and shapes:
 - Basic: Rectangle, Rounded Rect, Circle, Ellipse, Triangle, Diamond, Parallelogram, Star, Hexagon, Arrow
 - Flowchart: Process, Decision, Terminal (Start/End), I/O, Document, Predefined Process, Manual Operation, Database/Cylinder, 
 Delay, Manual Input
 - UML Class: Class box (3-compartment), Interface, Package, Note, Actor (stick figure), Use Case (ellipse), Component, Sequence 
 Lifeline
 - Network: Server, Desktop, Laptop, Cloud, Router, Switch, Firewall, Database, Mobile
 - Org Chart: Person card (name/title/photo placeholder)
 - ER Diagram: Entity (rectangle), Relationship (diamond), Attribute (ellipse)
 - Mind Map: Central Topic (rounded), Sub-topic, Idea

 Each shape's render() returns SVG <path> d-attribute or composite SVG elements. Shapes define default ports (typically 4:
                                                                                                                top/right/bottom/left center points).

Rendering Pipeline (renderer.js)

Model change event
→ renderer.renderShape(shape) or renderer.renderConnector(conn)
→ Create/update SVG <g> element with id="shape-{id}"
→ Inside <g>: <path> for shape body, <text> for label, <circle> for ports (on hover)
→ Apply transforms: translate(x,y) rotate(r)

Canvas workspace features:
  - SVG root with a <g class="canvas-layer"> that receives pan/zoom transforms
- Pan: translate(tx, ty) via Space+drag or middle-mouse drag
- Zoom: scale(s) via scroll wheel, centered on cursor position
- Grid: <pattern> element for repeating grid dots/lines
- Layers map to SVG <g class="layer-{id}"> in stacking order

Hit testing: Use native document.elementFromPoint() or SVG getIntersectionList(). Each rendered shape's SVG group has
 data-shape-id attribute for fast lookup.

 Tool System (tools.js)

 Abstract Tool base with onMouseDown/Move/Up/KeyDown/KeyUp. Active tool set by toolbar.

 - SelectTool: Click to select, shift-click multi-select, drag for marquee, drag selected to move, drag handles to resize/rotate.
 Shows alignment guides when moving.
 - DrawTool: Click-drag on canvas to place the currently selected shape type from palette. Sets shape dimensions from drag bounds.
 - ConnectorTool: Click on a shape port to start, drag to target port to complete. Shows preview line while dragging. Triggers
 orthogonal route calculation on completion.
 - TextTool: Click on canvas to create standalone text. Double-click any shape to edit its text inline (creates a <foreignObject>
 with contenteditable).
 - PanTool: Activated by holding Space or selecting hand tool. Drag to pan canvas.

 Connector Routing (connectors.js)

 Orthogonal routing algorithm:
 1. Get source and target port positions and directions (the side they're on)
2. Extend a short segment outward from each port (clearance gap)
3. Try simple L-shape or Z-shape routes first (covers 80% of cases)
4. For complex cases: build a visibility grid around obstacle bounding boxes and use A* pathfinding with Manhattan distance
heuristic
5. Simplify result by merging collinear segments

Port system: Each shape has ports at N/E/S/W midpoints by default. Ports light up (highlight) when the connector tool hovers near
a shape. Connector snaps to nearest port.

UI Layout (ui.js + style.css)

CSS Grid Layout:
  ┌─────────────────────────────────────────────┐
│              Top Toolbar                     │  48px
├──────────┬──────────────────────┬───────────┤
│  Shape   │                      │ Properties│
│  Palette │    SVG Canvas        │ Panel     │  flex
│  240px   │    (flex)            │ 260px     │
│          │                      ├───────────┤
│          │                      │ Layers    │
│          │                      │ Panel     │
├──────────┴──────────────────────┴───────────┤
│              Status Bar                      │  28px
└─────────────────────────────────────────────┘

- Toolbar: File operations (New/Open/Save/Export), Undo/Redo, tool selectors, zoom controls, alignment buttons
- Shape Palette: Accordion sections per category, each with a grid of shape thumbnails. Drag from palette onto canvas to create.
- Properties Panel: Context-sensitive — shows shape properties when selected, connector properties when connector selected, canvas
properties when nothing selected
- Layers Panel: List of layers with visibility (eye icon) and lock toggles, drag to reorder
- Context Menu: Right-click on canvas/shape/connector for relevant actions (copy, paste, delete, bring to front, group, etc.)
- Status Bar: Current zoom %, cursor coordinates, selected element info

Undo/Redo (history.js)

Command pattern. Each action creates a command object with execute() and undo(). Commands are pushed to an undo stack. Redo stack
cleared on new action.

Command types: AddShape, RemoveShape, MoveShape, ResizeShape, ChangeStyle, AddConnector, RemoveConnector, GroupShapes,
UngroupShapes, ReorderLayers, CompositeCommand (for multi-operations).

Export/Import (export.js)

- JSON save/load: Serialize full Diagram object. Save to file download or localStorage.
- Auto-save: Debounced save to localStorage on every change (key: flowcraft-autosave).
- PNG export: Create an offscreen <canvas>, draw the SVG using XMLSerializer + canvg-style approach (or new Image() with SVG data
                                                                                                     URL), then canvas.toDataURL('image/png').
- SVG export: Clone the SVG workspace element, strip UI artifacts (selection handles, grid), serialize with XMLSerializer.

Implementation Order (10 Phases)

Phase 0: CLAUDE.md

Create CLAUDE.md with project context so work can be resumed.

Phase 1: Foundation (utils.js + model.js + style.css + index.html skeleton)

- Geometry utilities (point, rect, line intersection, distance)
- Event emitter mixin
- Diagram/Shape/Connector/Layer/Group data classes
- HTML structure with CSS Grid layout (empty panels)
- Base CSS with dark-neutral theme

Phase 2: Rendering (renderer.js + shapes.js basics)

- SVG workspace setup within main canvas area
- Pan and zoom with transform management
- Grid rendering with <pattern>
  - Basic shape rendering (rect, circle, diamond — 3 shapes)
- Shape → SVG element creation and update

Phase 3: Select Tool + Interaction (tools.js partial)

- Tool base class and tool manager
- SelectTool: click to select, drag to move, resize handles
- Marquee selection
- Delete selected (keyboard)

Phase 4: Draw Tool + Full Shape Library (tools.js + shapes.js full)

- DrawTool: drag on canvas to create shape
- Shape palette UI in left sidebar
- Drag-from-palette to create shape
- All shape definitions for all 7 categories

Phase 5: Connectors (connectors.js + tools.js ConnectorTool)

- Port system on shapes
- ConnectorTool: click port → drag → click port
- Orthogonal routing (L/Z shapes first, then A*)
- Connector rendering with arrowheads
- Connectors update when shapes move

Phase 6: Text + Properties Panel (tools.js TextTool + ui.js)

- Inline text editing on shapes (double-click)
- Standalone text tool
- Properties panel: fill, stroke, font, opacity
- Shape/connector property editing

Phase 7: History + Layers (history.js + ui.js layer panel)

- Undo/redo command system
- Wrap all existing operations in commands
- Layer panel UI
- Layer visibility/lock/reorder
- Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+C/V, Delete, etc.)

Phase 8: Advanced Features (grouping, alignment, clipboard)

- Group/ungroup
- Alignment tools (align left/center/right/top/middle/bottom)
- Distribution tools
- Copy/paste (internal clipboard)
- Snap-to-object alignment guides

Phase 9: Export + Polish (export.js + final ui.js)

- Save/load JSON files
- Auto-save to localStorage
- Export PNG and SVG
- Context menus
- Toolbar completion
- Status bar
- Keyboard shortcut help dialog
- Final styling polish

Verification

1. Open index.html in browser — app loads with full UI layout
2. Drag shapes from palette onto canvas — shapes appear
3. Select, move, resize shapes — transforms work
4. Draw connectors between shapes — routes correctly
5. Double-click shape — edit text inline
6. Change properties in right panel — styling updates
7. Ctrl+Z/Y — undo/redo works
8. File → Save → File → New → File → Open — round-trip works
9. Export PNG — image downloads
10. Refresh browser — auto-save restores diagram
11. Test all diagram types: create a flowchart, UML class diagram, network diagram, ER diagram





Swim lane colors: 
1. #b391b5
2. #d1bcd2
3. #f9d2de
4. #ffbbb1
5. #ffdba9
6. #ffeca9
7. #c3f7c8
8. #99d5ca
9. #c7e8ac
10. #b8f5ed
11. #c1e4f7
12. #85c2ed
13. #1071e5










