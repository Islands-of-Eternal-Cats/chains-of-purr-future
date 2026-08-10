## Why

Road hubs make early cat logistics engaging, but their routing constraints should not remain the only transport model as the laboratory develops. A science-driven breakthrough creates a distinct late-game era that keeps the existing map readable while removing road-routing friction.

## What Changes

- Unlock direct cat flight once the laboratory accumulates 50 scientific data units.
- Make post-unlock assignments, returns to rest, and recovered stranded cats fly directly between modules at twice road speed.
- Preserve roads and hubs as removable, visible infrastructure; players may continue building them after the breakthrough, although cats no longer use them.
- Render temporary direct flight paths for airborne cats and announce the breakthrough in the interface.

## Capabilities

### New Capabilities

- `cat-flight-era`: Science-gated direct flight and its transition from ground routing.

### Modified Capabilities

- None. Historical road-routing change artifacts have not been synced into main specs; the new flight-era capability defines the post-unlock transport contract.

## Impact

- Affects simulation travel state, node geometry, transport controls, and cat-transit rendering.
- Extends the public simulation snapshot and travel types with flight state and node positions.
