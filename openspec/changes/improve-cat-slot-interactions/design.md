## Context

Slot state is represented by three independent references: `catId` for current occupancy, `reservedByCatId` for an active destination, and `assignedCatId` for persistent work. The UI currently treats only `catId` as a selectable cat, while the simulation rejects assignment commands for travelling or stranded cats.

## Goals / Non-Goals

**Goals:**

- Give every slot that names a cat consistent selection behavior.
- Keep destination replacement and cancellation atomic inside the simulation.
- Reuse existing travel, stranded, and return-to-rest states without changing saves.

**Non-Goals:**

- Animate movement backwards along an interrupted leg.
- Cancel a journey whose destination is a rest-room seat.
- Add a new travel-state or save version.

## Decisions

- Slot interaction resolves a represented cat in priority order `catId`, `reservedByCatId`, then `assignedCatId`. A different represented cat replaces the current selection instead of receiving the previously selected cat.
- Core assignment handles three origins separately: an idle cat uses the existing assignment path, a cat headed to work is rolled back and redirected, and a cat headed to rest keeps travelling while only its future work assignment changes.
- Interruption uses `leg.fromNodeId` for road travel, `fromNodeId` for flight, and the current `nodeId` for stranded travel. This matches the established link-removal rollback rule and needs no additional persisted field.
- Cancelling a work destination clears its assignment and reservation before invoking the normal return-to-rest behavior from the rollback node. Same-node rest placement is handled immediately; unavailable seats or routes use the existing stranded/waiting representation.
- Destination validation happens before old state is released so a rejected target cannot discard the current journey.

## Risks / Trade-offs

- [An almost-arrived cat jumps back to the current leg's start] → The behavior is deterministic, explicitly specified, and consistent with occupied-link removal.
- [A rest-bound cat is assigned future work while exhausted] → Its rest journey remains intact and automatic return waits for full recovery.
- [Two identifiers on one slot could imply different cats in corrupted state] → The interaction priority follows visible rendering order and save validation remains unchanged.

## Migration Plan

No data migration is required. Rollback removes the new commands and UI branches; version-1 saves retain the same shape.
