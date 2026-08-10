## Why

Ordinary modules cannot currently be removed while a cat occupies them or travels through or toward them, even though the simulation already has recovery behavior for destructive road edits. Module removal should preserve cats and their surviving work intent instead of rejecting the player action.

## What Changes

- Allow any non-base, non-hub module to be removed at any time.
- Evacuate cats whose current or final target module is removed to the nearest available rest seat, falling back to the base rest-room waiting queue.
- Return road travellers affected only by removal of their next leg endpoint to the start of that leg and recalculate their route while retaining a surviving assignment.
- Remove obsolete cat references and destination reservations atomically with the module and its incident links.
- Report successful module removal as an evacuation or rerouting operation instead of rejecting it with the legacy cat-usage message.
- Highlight seated rest-room cats without a work assignment using a static amber treatment and a visible "без работы" label.

## Capabilities

### New Capabilities

- `safe-module-removal`: Safe evacuation, rerouting, and reference cleanup when an ordinary module is removed.
- `idle-cat-work-indicator`: Visible identification of seated rest-room cats that have no current work assignment.

### Modified Capabilities

None. The repository has no synchronized main specification for ordinary module removal.

## Impact

- Affects ordinary-node deletion and cat travel recovery in `src/core/simulation.ts`.
- Updates deletion status text and assignment-derived node view data in `src/App.vue`, rest-seat rendering, styles, and tests.
- Does not change public simulation types, persistence, dependencies, or road-hub deletion behavior.
