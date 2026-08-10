## Context

Travelling cats retain their current leg's source node in state until that leg finishes. A removed transition can therefore be replaced by a stranded state at that known node, while the target-slot reservation remains intact.

## Goals / Non-Goals

**Goals:**

- Remove worker transitions immediately even when occupied.
- Preserve every affected cat and its intended destination.
- Reuse route calculation to take an alternative road when available.

**Non-Goals:**

- Asking for confirmation before removing a transition.
- Adding a new in-transit position model.

## Decisions

- Return cats to `leg.fromNodeId` regardless of their progress. It is always an existing, well-defined location and matches the requested "go back" interaction.
- Convert affected cats to stranded before deleting the transition, then run the existing stranded-resumption logic after deletion. This uses the normal path finder for all alternate routes and preserves the target reservation.

## Risks / Trade-offs

- [A nearly-arrived cat returns the full leg] → The rule is deterministic and avoids deciding an arbitrary nearest endpoint.
