## Why

Slots that represent a cat indirectly currently behave differently from occupied slots: resting assignments clear immediately, while reserved destinations cannot select or redirect their cat. This makes reassignment inconsistent and prevents players from correcting an active destination.

## What Changes

- Treat assigned and reserved slots as interactions with the cat they display.
- Let players reassign cats that are travelling or waiting for a route to a work destination.
- Let a repeated click on a selected resting assignment clear the work assignment.
- Let a repeated click on a selected work destination cancel it, roll the cat back to the start of its current leg, and send it to rest.
- Keep return-to-rest destinations selectable without allowing their repeated click to cancel rest.
- Highlight indirect slots that represent the selected cat and provide role-specific guidance.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `persistent-work-assignments`: Extend assignment controls to indirect slot representations, in-transit reassignment, and destination cancellation.

## Impact

- Core simulation assignment and travel-interruption commands.
- Vue slot interaction, selection highlighting, and status text.
- Unit and integration coverage for resting, travelling, and route-unavailable cats.
- Save schema and external dependencies remain unchanged.
