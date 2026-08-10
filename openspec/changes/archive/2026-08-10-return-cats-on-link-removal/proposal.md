## Why

Blocking deletion of an occupied worker transition prevents players from changing the network when they intend to do so. A cat must be returned to a valid node rather than left on a removed transition.

## What Changes

- Allow an occupied worker transition to be removed immediately, without confirmation.
- Return every cat on that transition to the node at the start of its current leg.
- Recalculate each cat's journey: continue through another route when one exists, otherwise show it as stranded.

## Capabilities

### New Capabilities

- `safe-worker-link-removal`: Removes active worker transitions without losing travelling cats.

### Modified Capabilities

- None.

## Impact

- `src/core/simulation.ts` changes transition removal and route resumption.
- Simulation tests cover alternate and missing replacement routes.
