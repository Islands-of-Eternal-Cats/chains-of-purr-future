## Context

The simulation core owns all durable rules in memory, while `App.vue` converts user interactions into commands and renders immutable snapshots. Existing science progress is inferred from cumulative server receipts, connections only support research-to-server flow, and there is no persistence boundary or economy. See `proposal.md` for motivation and the delta specs for observable requirements.

## Goals / Non-Goals

**Goals:**

- Keep economy, routing, save validation, and balance rules deterministic and browser-independent in the core.
- Make data a conserved inventory while scientific progress remains monotonic.
- Preserve existing cat routing, deletion recovery, layout, and flight behavior except for the unlock source.
- Make every tuning number discoverable through a single typed configuration.

**Non-Goals:**

- Save migrations, cloud synchronization, market-price variation, finite server capacity, random events, or a hard game-over state.
- Persisting interface selections, speed, warning acknowledgement in exported saves, or the diagnostic-speed unlock.

## Decisions

### Use one typed balance object

`src/core/balance.ts` exports a deeply readonly `GAME_BALANCE`. Node entries use a `Record<NodeType, NodeBalance>` so a new node type cannot compile without cost, upkeep, and slot values. The core index re-exports the object for UI price labels. This is preferred to per-feature constants because it prevents display and command costs from drifting.

### Keep progress and commodity separate

`scienceProgress` lives at simulation level and increases alongside research buffers. Servers hold `dataStored`; terminals consume that inventory and create credits. This avoids provenance flags when data is relayed and makes save validation straightforward. The trade-off is that flight can unlock without building a server, which is intentional.

### Pull through an acyclic directed graph

Destinations pull from their incoming connections during each tick. Research can fan out, servers aggregate multiple inputs but have one output, and terminals have one input. Cycle detection runs before connection creation. Fair allocation repeatedly gives each non-empty source an equal share of remaining capacity, redistributing unused shares until capacity or data is exhausted. This avoids insertion-order starvation without adding player-configurable priorities.

### Apply sales and upkeep as one deterministic tick delta

The tick calculates transferred and sold data, converts sales to revenue, computes upkeep from elapsed simulation time, then applies the net credit delta once. Purchases require current credits at command time, while upkeep and dismissal may create debt. Debt warning state is derived from the configured threshold and never blocks simulation.

### Put serialization behind the core boundary

The core exports a plain `GameSaveV1` and reconstructs a `Simulation` only after validating every collection, reference, numeric field, counter, and version. The UI owns debounced `localStorage`, file download/upload, confirmations, and messages. Invalid imports are parsed and validated before the current simulation reference is replaced.

### Keep diagnostic speed as transient UI state

The normal speed list omits ×100. A button-based brand mark reveals it for the current page lifetime only. No save field represents this state.

## Risks / Trade-offs

- [Large cross-cutting snapshot change] → Use explicit copy/validation helpers and round-trip tests before wiring browser persistence.
- [Coarse ×100 ticks can expose allocation drift] → Base economy and transfer math on elapsed seconds and test large-tick equivalence within floating-point tolerance.
- [One server output limits existing fan-out expectations] → The restriction applies only to servers; research retains existing fan-out behavior.
- [Autosave may write every animation frame] → Save only when serialized durable state changes and debounce writes.
- [Unsupported saves frustrate players] → Keep the original text available for re-export, explain the early-development policy, and make reset explicit.

## Migration Plan

1. Add new types and balance configuration while updating existing construction and tick behavior.
2. Replace cumulative server-receipt flight progress with simulation-level research progress and update the existing capability tests.
3. Add version-1 serialization after the final durable state shape is stable.
4. Wire UI persistence and controls; existing sessions without a save start a new 1000-credit laboratory.
5. Rollback is a code revert; no older persisted format is promised or migrated.
