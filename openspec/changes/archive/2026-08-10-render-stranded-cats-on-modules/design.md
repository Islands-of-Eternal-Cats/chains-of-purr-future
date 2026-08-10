## Context

The simulation already keeps a stranded cat's current `nodeId`. The map passes this information to road hubs only, while ordinary modules render cats only when they occupy a work slot.

## Goals / Non-Goals

**Goals:**

- Pass stranded cats to every rendered game node.
- Render a compact warning in the ordinary-module layout using the existing visual treatment.

**Non-Goals:**

- Changing evacuation, routing, or module-deletion rules.
- Making stranded cats selectable or assignable.

## Decisions

- Reuse the existing `strandedCats` node data and warning copy so hub and ordinary-module states communicate the same condition. This avoids introducing a second representation of stranded state.
- Place the ordinary-module warning beneath the worker slots. Showing it inside a slot would incorrectly imply that the stranded cat occupies that slot.

## Risks / Trade-offs

- [The warning adds height to a module] → It appears only while a cat is stranded and makes an otherwise invisible state actionable.
