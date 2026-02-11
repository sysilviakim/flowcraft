// FlowCraft - Connector Routing & Ports
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

const Connectors = (() => {
  const CLEARANCE = 20;

  // Route a connector between two shapes/ports
  function routeConnector(diagram, conn) {
    const srcShape = diagram.getShape(conn.sourceShapeId);
    const tgtShape = diagram.getShape(conn.targetShapeId);
    if (!srcShape || !tgtShape) return [];

    const srcDef = Shapes.get(srcShape.type);
    const tgtDef = Shapes.get(tgtShape.type);

    const srcPort = (srcDef.ports || Shapes.stdPorts()).find(p => p.id === conn.sourcePortId) || { id: 'right', side: 'right', offset: 0.5 };
    const tgtPort = (tgtDef.ports || Shapes.stdPorts()).find(p => p.id === conn.targetPortId) || { id: 'left', side: 'left', offset: 0.5 };

    const srcPos = Shapes.getPortPosition(srcShape, srcPort);
    const tgtPos = Shapes.getPortPosition(tgtShape, tgtPort);
    const srcDir = Shapes.getPortDirection(srcPort);
    const tgtDir = Shapes.getPortDirection(tgtPort);

    if (conn.routingType === 'straight') {
      return [srcPos, tgtPos];
    }

    if (conn.routingType === 'curved') {
      // For curved, provide control points
      const midX = (srcPos.x + tgtPos.x) / 2;
      const midY = (srcPos.y + tgtPos.y) / 2;
      return [
        srcPos,
        { x: srcPos.x + srcDir.x * CLEARANCE * 3, y: srcPos.y + srcDir.y * CLEARANCE * 3 },
        { x: tgtPos.x + tgtDir.x * CLEARANCE * 3, y: tgtPos.y + tgtDir.y * CLEARANCE * 3 },
        tgtPos
      ];
    }

    // Orthogonal routing
    return routeOrthogonal(srcPos, tgtPos, srcDir, tgtDir, srcShape, tgtShape);
  }

  function routeOrthogonal(src, tgt, srcDir, tgtDir, srcShape, tgtShape) {
    const ext1 = { x: src.x + srcDir.x * CLEARANCE, y: src.y + srcDir.y * CLEARANCE };
    const ext2 = { x: tgt.x + tgtDir.x * CLEARANCE, y: tgt.y + tgtDir.y * CLEARANCE };

    // Try L-shape first
    const lRoute = tryLShape(src, tgt, ext1, ext2, srcDir, tgtDir);
    if (lRoute) return lRoute;

    // Try Z-shape
    const zRoute = tryZShape(src, tgt, ext1, ext2, srcDir, tgtDir);
    if (zRoute) return zRoute;

    // Fallback: 5-segment route
    return fallbackRoute(src, tgt, ext1, ext2, srcDir, tgtDir);
  }

  function tryLShape(src, tgt, ext1, ext2, srcDir, tgtDir) {
    // L-shape: one turn
    // Horizontal then vertical, or vertical then horizontal
    if (isHorizontal(srcDir) && isVertical(tgtDir)) {
      const corner = { x: tgt.x + tgtDir.x * CLEARANCE, y: src.y + srcDir.y * CLEARANCE };
      return simplifyPoints([src, ext1, { x: ext2.x, y: ext1.y }, ext2, tgt]);
    }
    if (isVertical(srcDir) && isHorizontal(tgtDir)) {
      return simplifyPoints([src, ext1, { x: ext1.x, y: ext2.y }, ext2, tgt]);
    }
    return null;
  }

  function tryZShape(src, tgt, ext1, ext2, srcDir, tgtDir) {
    // Z-shape: two turns
    if (isHorizontal(srcDir) && isHorizontal(tgtDir)) {
      const midX = (ext1.x + ext2.x) / 2;
      return simplifyPoints([src, ext1, { x: midX, y: ext1.y }, { x: midX, y: ext2.y }, ext2, tgt]);
    }
    if (isVertical(srcDir) && isVertical(tgtDir)) {
      const midY = (ext1.y + ext2.y) / 2;
      return simplifyPoints([src, ext1, { x: ext1.x, y: midY }, { x: ext2.x, y: midY }, ext2, tgt]);
    }
    return null;
  }

  function fallbackRoute(src, tgt, ext1, ext2, srcDir, tgtDir) {
    // General 5-segment route
    const midX = (ext1.x + ext2.x) / 2;
    const midY = (ext1.y + ext2.y) / 2;

    if (isHorizontal(srcDir)) {
      return simplifyPoints([
        src, ext1,
        { x: midX, y: ext1.y },
        { x: midX, y: ext2.y },
        ext2, tgt
      ]);
    } else {
      return simplifyPoints([
        src, ext1,
        { x: ext1.x, y: midY },
        { x: ext2.x, y: midY },
        ext2, tgt
      ]);
    }
  }

  function isHorizontal(dir) { return dir.x !== 0; }
  function isVertical(dir) { return dir.y !== 0; }

  // Remove collinear points
  function simplifyPoints(points) {
    if (points.length < 3) return points;
    const result = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
      const prev = result[result.length - 1];
      const curr = points[i];
      const next = points[i + 1];
      // Check if collinear
      const dx1 = curr.x - prev.x, dy1 = curr.y - prev.y;
      const dx2 = next.x - curr.x, dy2 = next.y - curr.y;
      if (Math.abs(dx1 * dy2 - dy1 * dx2) > 0.01) {
        result.push(curr);
      }
    }
    result.push(points[points.length - 1]);
    return result;
  }

  // Find nearest port on shape to a canvas point
  function findNearestPort(shape, canvasX, canvasY) {
    const def = Shapes.get(shape.type);
    const ports = def.ports || Shapes.stdPorts();
    let best = null, bestDist = Infinity;
    for (const port of ports) {
      const pos = Shapes.getPortPosition(shape, port);
      const d = Utils.distance({ x: canvasX, y: canvasY }, pos);
      if (d < bestDist) {
        bestDist = d;
        best = port;
      }
    }
    return best;
  }

  // Auto-select best ports for connecting two shapes
  function autoSelectPorts(srcShape, tgtShape) {
    const srcDef = Shapes.get(srcShape.type);
    const tgtDef = Shapes.get(tgtShape.type);
    const srcPorts = srcDef.ports || Shapes.stdPorts();
    const tgtPorts = tgtDef.ports || Shapes.stdPorts();

    let bestSrc = null, bestTgt = null, bestDist = Infinity;
    for (const sp of srcPorts) {
      const spos = Shapes.getPortPosition(srcShape, sp);
      for (const tp of tgtPorts) {
        const tpos = Shapes.getPortPosition(tgtShape, tp);
        const d = Utils.distance(spos, tpos);
        if (d < bestDist) {
          bestDist = d;
          bestSrc = sp;
          bestTgt = tp;
        }
      }
    }
    return { sourcePort: bestSrc, targetPort: bestTgt };
  }

  // Update all connectors attached to a shape
  function updateConnectorsForShape(diagram, shapeId) {
    const conns = diagram.getConnectorsForShape(shapeId);
    conns.forEach(conn => {
      const points = routeConnector(diagram, conn);
      conn.points = points;
      diagram.emit('connector:changed', conn);
    });
  }

  return {
    routeConnector, findNearestPort, autoSelectPorts, updateConnectorsForShape, simplifyPoints
  };
})();
