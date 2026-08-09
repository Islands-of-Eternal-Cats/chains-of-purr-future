## Why

Free, unconstrained road links let players connect every module directly and stack modules together, removing routing and layout decisions from the PoC. The road network needs simple topology and spatial rules without introducing an economy.

## What Changes

- Add road hubs used only by cats, with four independently usable bidirectional road ports.
- Limit every non-hub module to one bidirectional road connection while preserving unrestricted science channels.
- Route cats one road leg at a time, recalculating the globally fastest remaining route whenever they reach a hub or the road topology changes.
- Allow a hub in use to be deleted; affected cats become stranded at the geometrically nearest surviving hub and resume automatically when a route exists again.
- Prevent visual node overlap and reserve a 48 px gap between nodes when creating or moving them.

## Capabilities

### New Capabilities

- `road-hub-routing`: Road hub topology, per-port road limits, resilient cat routing, and hub deletion recovery.
- `node-layout-clearance`: Collision-free placement and visual clearance for graph nodes.

### Modified Capabilities

- None.

## Impact

- Affects simulation node, cat, and worker-link interfaces and their tests in `src/core`.
- Affects the Vue Flow node renderer, connection validation, movement display, creation controls, and drag placement in `src`.
- Does not add dependencies or change science-data mechanics.
