## Context

The simulation owns the road graph and finds shortest paths by road duration, while Vue Flow owns node positions and turns screen distance into road duration. Existing worker links have no port identity, all modules can have unlimited links, and the active travel record stores the whole path.

## Goals / Non-Goals

**Goals:**
- Add constrained hub topology without affecting science-data flow.
- Make every hop robust to edits of the road graph.
- Preserve cat intent when a hub is removed.
- Keep cards and hubs visually separate on the canvas.

**Non-Goals:**
- Grid-based construction, hub costs, congestion, port throughput, or science relays.
- Persistent storage of canvas positions.

## Decisions

### Port-aware worker links

Add a road-port type and store the selected port at both worker-link endpoints. Core validation derives each endpoint's available ports from its node type, allowing one `road` port for modules and four cardinal ports for hubs. This keeps topology authoritative in the simulation rather than relying on UI handles alone.

### One-leg route execution

Keep Dijkstra as the global optimisation step, but store only the active leg in cat travel. On completing any leg, recompute the shortest remaining path from the arrived node to the retained final target and begin its first leg. Replanning at every hub and after topology changes avoids committing cats to a stale full route. Lexical link ordering remains the tie-breaker for reproducibility.

### Hub-deletion recovery split across UI and core

The UI calculates geometric rescue destinations because it owns current node positions and can interpolate a cat's point on its active edge. It passes a validated cat-to-hub rescue map to a dedicated hub deletion command. The core removes the hub and incident roads atomically, retains target-slot reservations, and transitions affected cats to `stranded`. The fallback source module is retained when a journey starts, so the core can recover cats even after all hubs are gone.

### Automatic stranded recovery

Topology-changing commands and simulation ticks both attempt to start a route for stranded cats. If no route exists, the cat remains stationary and visible; otherwise it starts the first leg immediately. This is preferred to an explicit retry control because the player has already expressed the cat's destination through the existing assignment or rest flow.

### Overlap blocking in the UI

The UI compares node bounds after creation and every drag update. It keeps the requested position, marks every intersecting node as blocked, and synchronizes that state into the simulation. Blocked nodes remain draggable so the player can resolve the overlap, but all other interactions are disabled until their bounds separate.

## Risks / Trade-offs

- [Emergency relocation is not physical movement] → It is limited to destructive hub deletion and is visibly marked as stranded.
- [Dynamic card height can change collision bounds] → Re-evaluate collision bounds after every placement update.
- [Replanning can alter tie routes] → Use the existing deterministic link-ID ordering for equal-duration paths.

## Migration Plan

- Extend in-memory simulation types; no persisted save data requires migration.
- Replace existing generic road handles and keep science handles untouched.
- Run the complete unit and component test suite before shipping.
