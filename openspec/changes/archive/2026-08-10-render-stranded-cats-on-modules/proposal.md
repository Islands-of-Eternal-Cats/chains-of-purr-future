## Why

After a route is removed, a stranded cat can be attached to an ordinary module but is rendered only when attached to a road hub. This makes the cat appear to disappear even though it remains in the simulation.

## What Changes

- Display stranded cats and their unavailable-route warning on every module type, not only road hubs.
- Add component coverage for the ordinary-module stranded state.

## Capabilities

### New Capabilities

- `stranded-cat-visibility`: Makes a stranded cat visible at the module where it is waiting for a route.

### Modified Capabilities

- None.

## Impact

- `src/App.vue` supplies stranded cats to all rendered game nodes.
- `src/components/GameNode.vue` renders the warning in the normal module layout.
- Component tests cover the visible stranded state.
