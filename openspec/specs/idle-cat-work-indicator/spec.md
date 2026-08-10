# idle-cat-work-indicator Specification

## Purpose

Makes cats awaiting a work assignment easy to find directly on rest-room modules without changing assignment interactions.

## Requirements

### Requirement: Seated cats without work are visibly identified
The interface SHALL display a static amber highlight and the text "без работы" on a rest-room seat occupied by a cat that has no work-slot assignment anywhere in the laboratory.

#### Scenario: Unassigned cat occupies a rest seat
- **WHEN** an idle cat occupies a rest-room seat and no work slot is assigned to that cat
- **THEN** the seat has the unassigned-cat highlight and displays "без работы"

#### Scenario: Resting cat retains an assignment
- **WHEN** a cat occupies a rest-room seat while retaining a work-slot assignment
- **THEN** the seat does not display the unassigned-cat highlight or label

#### Scenario: Unseated cat waits for a chair
- **WHEN** an unassigned cat waits in a rest room without occupying a seat
- **THEN** the waiting-cat display remains unchanged and does not receive the seat highlight
