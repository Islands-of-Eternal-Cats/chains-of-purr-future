## Context

Ordinary deletion currently rejects any cat whose location, final target, stranded target, or active road leg references the node. Core simulation state now owns module positions and discriminates road and flight travel, while rest-room waiting already uses `idle` cats with no slot. See proposal.md for motivation and the safe-module-removal spec for observable behavior.

## Goals / Non-Goals

**Goals:**

- Perform cat-state recovery and node removal as one synchronous simulation command.
- Reuse existing rest waiting, stranded recovery, assignment, and destination-reservation semantics.
- Choose evacuation seats deterministically from core-owned geometry.

**Non-Goals:**

- Change road-hub deletion or general waiting-cat seat allocation.
- Add a displaced-cat status, persistence migration, or new public simulation type.
- Animate emergency evacuation from a module that no longer exists.

## Decisions

### Classify cats before mutating the graph

Snapshot each affected cat's geometric point and recovery action before deleting the module or incident links. A cat whose current location, flight origin, final target, or stranded location/target disappears is evacuated. A road traveller whose surviving `leg.fromNodeId` merely loses the next intermediate endpoint is returned to that start and converted to the existing stranded intent before route resumption. This distinguishes loss of a required module from an editable road interruption.

### Allocate rest seats after clearing obsolete occupancy

Clear each evacuated cat's surviving occupied slot and destination reservation, then remove the node. Allocate free, unreserved seats iteratively by distance from each captured cat point, sorting ties by rest-node ID and slot ID. Exclude blocked rooms and the removed room. Cats without a seat receive `nodeId = rest-1`, `slotId = null`, `status = idle`, matching the existing hire queue.

Alternatives considered were arbitrary insertion-order seating and a new displaced state. Geometry matches the player-visible map, while the existing queue avoids an unnecessary state-machine branch.

### Preserve only valid travel intent

Road-only interruptions retain `targetNodeId`, `targetSlotId`, `sourceNodeId`, and the reservation, then reuse stranded-route resumption after graph deletion. Evacuation cancels active travel and stranded state. Assignments stored on surviving work slots remain; assignments on the deleted node vanish with it. This lets normal recovery return rested cats without leaving references to deleted slots.

### Keep ordinary deletion self-contained in core

Core state contains all node positions needed for evacuation, so `deleteNode` needs no UI-supplied rescue map and keeps its `CommandResult<void>` interface. The UI only updates its success copy. Hub deletion remains separate because its established contract relocates cats to hubs rather than rest rooms.

## Risks / Trade-offs

- [A full-vigor evacuated cat has a surviving assignment and may depart again on the next tick] → This follows the existing automatic-return contract and preserves player intent.
- [Multiple evacuated cats compete for limited seats] → Process cats in stable ID order and reserve each selected seat immediately.
- [Missing geometry in external callers produces ties] → Use the simulation's existing zero-position fallback and deterministic IDs.

## Migration Plan

No persisted data or public types require migration. Deploy the core and UI changes together; rollback restores the previous deletion guard and message.
