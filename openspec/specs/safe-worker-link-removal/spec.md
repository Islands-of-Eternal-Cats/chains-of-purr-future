# safe-worker-link-removal Specification

## Purpose

Lets players remove worker transitions at any time without losing cats that are travelling on them.

## Requirements

### Requirement: Immediate removal of occupied worker transitions
The system SHALL remove a worker transition immediately when requested, including when one or more cats are travelling on it. The system MUST return every affected cat to the node at the start of its current transition leg without requesting confirmation.

#### Scenario: Removal with no alternate route
- **WHEN** a player removes a transition carrying a cat and no route to the cat's destination remains
- **THEN** the transition is removed and the cat waits at the leg's start node with an unavailable-route state

#### Scenario: Removal with an alternate route
- **WHEN** a player removes a transition carrying a cat and another route to the cat's destination exists
- **THEN** the transition is removed and the cat begins travelling from the leg's start node along the alternate route

#### Scenario: Multiple cats on a transition
- **WHEN** a player removes a transition carrying multiple cats
- **THEN** every affected cat is returned and rerouted or marked unavailable independently
