## Why

The current laboratory is a technically complete sandbox but has no resource loop that gives expansion a cost or turns produced data into sustained progress. A cozy economy, explicit server routing, and durable local saves will make the sandbox worth developing over longer sessions without introducing a timer or forced ending.

## What Changes

- Separate cumulative scientific progress from sellable data: active research creates both, while data alone moves through the network and is consumed by trade.
- Add a staffed trade terminal, credits, construction and hiring costs, continuous upkeep, partial demolition refunds, paid cat dismissal, and recoverable debt warnings.
- Add directed server output ports and support acyclic `research → server`, `server → server`, and `server → terminal` networks with bounded ports and fair transfer.
- Centralize all tunable gameplay values in one typed balance configuration shared by the core, UI, and tests.
- Add versioned local autosaves, JSON import/export, reset controls, and explicit handling for unsupported or corrupt saves.
- Hide the ×100 diagnostic speed until the player clicks the brand mark; keep ordinary controls at pause, ×1, ×5, and ×10.
- **BREAKING**: replace server-delivered scientific-data progress with global scientific progress produced directly by active research work.

## Capabilities

### New Capabilities

- `cozy-laboratory-economy`: Credits, costs, upkeep, trade-terminal sales, demolition refunds, cat dismissal, debt feedback, centralized balance values, and the hidden diagnostic speed.
- `directed-data-network`: Sellable-data production, server buffering and relaying, terminal delivery, compatible ports, cycle prevention, and fair transfer behavior.
- `versioned-local-saves`: Autosave, versioned JSON import/export, reset, early-development warning, and safe rejection of invalid saves.

### Modified Capabilities

- `cat-flight-era`: Direct flight unlocks from cumulative science produced by research rather than data delivered to servers.

## Impact

- Extends public core types, commands, snapshots, node types, connection rules, and persistence APIs.
- Refactors simulation constants into `src/core/balance.ts` and updates the Vue Flow node renderer and application controls.
- Adds no runtime dependencies; persistence uses browser storage and JSON files.
