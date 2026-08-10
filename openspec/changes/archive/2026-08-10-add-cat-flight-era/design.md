## Context

The simulation currently represents each active journey as a road leg and derives road timing from the canvas positions in the Vue layer. Core simulation code intentionally has no browser dependency. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**

- Keep the existing ground-routing behavior intact until the scientific threshold.
- Make geometry available to the simulation so direct-flight timing is deterministic and testable.
- Preserve destination reservations through road-to-flight transition and stranded recovery.

**Non-Goals:**

- Add landing infrastructure, fuel, air traffic collisions, or a second transport-building system.
- Remove or convert legacy roads and hubs automatically.

## Decisions

- Store each node's canvas position in simulation state and expose it in snapshots. The application updates it on creation and drag, allowing direct-flight duration to remain core-owned and unit-testable. This replaces the UI-only timing dependency for the new mode.
- Model travel as a discriminated `road` or `flight` journey. A road journey retains a link-backed leg; a flight journey stores only origin, target, elapsed progress, and duration. This prevents legacy link deletion from coupling to airborne travel.
- Unlock at total server-received data of 50 units. Flight duration uses the existing distance conversion divided by two, with the same minimum duration scaled by half.
- Preserve an in-progress road leg at unlock, then select flight at the next stop. This avoids inventing an off-network position in the simulation while preserving a smooth visual transition.
- Render each airborne cat as a transient Vue Flow edge. Virtual edges reuse endpoint positioning and disappear as soon as the travel state clears; unlike road edges, they are neither selectable nor persistent.

## Risks / Trade-offs

- [Legacy hubs no longer solve late-game routing] → Keep roads available as player-authored map infrastructure, while communicating that flights ignore them.
- [Position updates influence travel time] → Keep the existing collision rules and derive flight duration only when a flight begins, so a later drag cannot change an active journey.
- [Old road behavior has no main spec baseline] → Capture all post-unlock transport behavior in the new capability; leave early-road behavior unchanged.

## Migration Plan

1. Extend core snapshot and travel types compatibly for the UI.
2. Switch journey creation and continuation by the unlock state.
3. Add the transient flight renderer and post-unlock construction controls.
4. Run core and UI build checks; rollback is removal of the feature change because no persisted save data exists.
