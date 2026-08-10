## Context

The Vue application already derives assigned cat IDs from work slots and derives a narrower list for amber rest-seat indicators. Cat selection is owned by `App.vue`, while package version 0.1.0 is not exposed to runtime code. The sidebar is scrollable, but its absolutely positioned help block overlays controls when content exceeds the viewport. See `proposal.md` and the capability specs for observable behavior.

## Goals / Non-Goals

**Goals:**
- Reuse a single assignment-derived cat list for the sidebar roster and rest-seat indicator.
- Keep package metadata as the only release-version source.
- Preserve existing selection commands and responsive behavior.

**Non-Goals:**
- Change simulation state, save schema version 1, or assignment rules.
- Add navigation that pans the graph to a cat or module.
- Introduce runtime package metadata requests.

## Decisions

### Inject package version at build time
Read `package.json` in Vite configuration and define a typed `__APP_VERSION__` constant. This avoids a duplicated source constant and avoids bundling package metadata or fetching it at runtime. Directly importing JSON in the Vue component was rejected because it exposes more metadata than required and couples application code to the repository layout.

### Derive one global unassigned list from work-slot assignments
Build the assigned-cat ID set from every slot's `assignedCatId`, then filter the complete snapshot cat array against that set. Use the resulting cats for the roster and pass their IDs to node views; the rest-node slot check naturally limits amber highlighting to seated cats. This keeps assignment truth in existing slot state and includes waiting, travelling, and stranded cats without adding persisted flags.

### Reuse the existing selection interaction
Roster buttons call the existing cat-selection handler and expose selected state through styling and `aria-pressed`. Assigning the cat mutates slot assignment through existing commands; the computed roster then updates automatically. Each row shows formatted vigor and maps current cat state to concise Russian labels.

### Keep guidance in document flow
Remove absolute positioning from the hint and reduce the control panel's compensating bottom padding. The hint remains last in template order, so desktop users can scroll to it after save controls; the current mobile breakpoint continues hiding it and the roster spans the compact grid width.

## Risks / Trade-offs

- [Many unassigned cats lengthen the sidebar] → Keep rows compact and rely on the existing panel scroll container.
- [A travelling cat's label can be ambiguous] → Derive labels from status and destination, distinguishing travel, recovery, ready, waiting for a seat, and missing route without changing commands.
- [Build-time constant is unavailable to TypeScript by default] → Add an ambient declaration included by the existing `src/**/*.ts` configuration.
- [Version bump could be confused with save format] → Keep save schema version and storage key unchanged and cover compatibility with existing tests.

## Migration Plan

Update package metadata and deploy the rebuilt static application. Existing local saves continue to load without migration. Rollback restores the previous bundle and package version; persisted data remains compatible.
