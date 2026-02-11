# FlowCraft

A free, local, browser-based diagramming application. No server, no signup, no external dependencies — just open `index.html` in your browser and start diagramming.

## Features

- **Multiple diagram types** — Flowcharts, UML, network diagrams, org charts, mind maps, ER diagrams, and timelines
- **Smart connectors** — Orthogonal, straight, and curved routing with automatic re-routing when shapes move
- **Drag-and-drop** — Drag shapes from the palette onto the canvas, or click-drag to draw
- **Inline text editing** — Double-click any shape to edit its label
- **Properties panel** — Style shapes and connectors with fill, stroke, font, opacity, and more
- **Layers** — Organize diagrams with multiple layers, each with visibility and lock controls
- **Undo/Redo** — Full command-based history (Ctrl+Z / Ctrl+Y)
- **Snap & align** — Grid snapping, shape-to-shape alignment guides, and alignment/distribution tools
- **Containers & swim lanes** — Group shapes inside containers with configurable lanes and colors
- **Timelines** — Block and line timelines with configurable date ranges, markers, and labels
- **Export** — PNG, JPG, PDF, and SVG export
- **Auto-save** — Diagrams are automatically saved to localStorage

## Getting Started

1. Clone or download this repository
2. Open `index.html` in any modern browser
3. Start diagramming

No build step, no dependencies, no internet connection required.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+C | Copy |
| Ctrl+V | Paste |
| Ctrl+A | Select all |
| Ctrl+S | Save |
| Delete | Delete selected |
| Arrow keys | Move selected (snaps to grid) |
| Ctrl+Arrow | Nudge selected by 1px |
| Space+Drag | Pan canvas |
| Scroll wheel | Zoom |
| Double-click | Edit shape text |

## Shape Categories

- **Basic** — Rectangle, Circle, Triangle, Diamond, and more
- **Flowchart** — Process, Decision, Terminal, I/O, Document, Database, and more
- **UML** — Class, Interface, Package, Actor, Use Case, Component, Lifeline
- **Network** — Server, Desktop, Laptop, Cloud, Router, Switch, Firewall
- **Org Chart** — Person card with name/title
- **ER Diagram** — Entity, Relationship, Attribute
- **Mind Map** — Central Topic, Sub-topic, Idea
- **Containers** — Swim lane containers with configurable lanes and colors

## File Format

Diagrams are saved as `.flowcraft.json` files — plain JSON that's easy to inspect, version-control, or process with scripts.

## License

Copyright (C) 2026 Silvia Kim

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

See [LICENSE](https://www.gnu.org/licenses/agpl-3.0.html) for details.
