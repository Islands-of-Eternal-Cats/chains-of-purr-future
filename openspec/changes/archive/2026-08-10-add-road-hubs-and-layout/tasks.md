## 1. Road-graph domain model

- [x] 1.1 Add hub nodes, typed road ports, endpoint-aware worker links, and stranded cat state to the simulation types.
- [x] 1.2 Enforce module and hub-port road limits, while keeping science channels unchanged.

## 2. Resilient cat routing

- [x] 2.1 Execute cat travel one road leg at a time and recompute the globally shortest remaining route after each arrival and topology change.
- [x] 2.2 Add hub deletion recovery, retained target reservations, stranded state, and automatic route resumption.
- [x] 2.3 Add simulation tests for topology limits, globally optimal routing, hub deletion, and stranded recovery.

## 3. Road-hub interface

- [x] 3.1 Render compact road hubs with four bidirectional ports, add their creation control, and render port-aware road edges.
- [x] 3.2 Validate road connections in the UI and show stranded cats and their red unreachable-destination warning on hubs.
- [x] 3.3 Calculate geometric emergency hub destinations in the UI before deleting a hub.

## 4. Overlap blocking layout

- [x] 4.1 Replace position rollback with overlap detection and blocked-node state synchronization.
- [x] 4.2 Block simulation actions and route use for overlapping nodes, while keeping them draggable.
- [x] 4.3 Render the red blocked state and restore normal interactions after overlap is resolved.
- [x] 4.4 Recalculate connected road times after committed position changes and add layout-focused UI tests where practical.

## 5. Verification

- [x] 5.1 Run the full test suite, production build, and OpenSpec validation; resolve any regressions.
