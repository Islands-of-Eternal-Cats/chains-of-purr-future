## Why

Players cannot see which build they are running, and cats without work are only discoverable by panning the laboratory graph back to a rest room. The fixed help text also overlaps sidebar controls at common viewport heights, making important actions harder to reach.

## What Changes

- Promote the application to version 0.2.0 and display that package version in the brand header.
- Add a compact, selectable sidebar roster of every cat without a persistent work-slot assignment, including resting, waiting, travelling, and stranded cats.
- Keep the existing amber rest-seat indicator backed by the same unassigned-cat derivation.
- Place the network help text in the sidebar's normal scroll flow so it cannot cover crew or save controls.
- Preserve save schema version 1 and compatibility with existing saves.

## Capabilities

### New Capabilities
- `application-version-display`: Expose the package release version in the running interface.
- `control-panel-layout`: Keep sidebar controls and guidance reachable without visual overlap across supported layouts.

### Modified Capabilities
- `idle-cat-work-indicator`: Extend unassigned-cat visibility from rest-room seats to a global selectable crew roster.

## Impact

- Updates package metadata, Vite build configuration, global TypeScript declarations, the main Vue application, sidebar styling, and UI tests.
- Renames the internal node-view input from rest-only unassigned cat IDs to a global unassigned cat ID set.
- Does not change simulation commands, persisted state, or save schema version.
