## Purpose

Позволяет закреплять котов за рабочими местами, чтобы их цикл отдыха и возвращения к работе не требовал повторных действий игрока.

## ADDED Requirements

### Requirement: Persistent work assignment
The system SHALL retain a cat's work assignment after the cat leaves its work slot to rest. A work slot with a retained assignment MUST not receive another assignment automatically; the player may explicitly replace it as defined below.

#### Scenario: Exhausted worker keeps its assignment
- **WHEN** a cat assigned to a work slot reaches zero vigor
- **THEN** the cat travels to the rest room and its original work slot remains assigned to that cat

#### Scenario: Player changes an assignment
- **WHEN** the player assigns a different available cat to a slot already assigned to a resting cat
- **THEN** the system replaces the previous assignment and the previous cat no longer returns to that slot automatically

### Requirement: Personal rest berth
The system SHALL reserve one rest-room slot for each cat when that cat is hired. The berth MUST remain reserved while the cat is working or travelling, and the cat MUST return to that same berth when sent to rest.

#### Scenario: New cat receives a berth
- **WHEN** the player hires a cat and an unreserved rest-room slot is available
- **THEN** the cat occupies that slot and the slot becomes reserved for that cat

#### Scenario: Working cat retains its berth
- **WHEN** a cat leaves its berth for work
- **THEN** the berth stays reserved for that cat and is unavailable to newly hired cats

#### Scenario: Cat returns to its own berth
- **WHEN** a working cat returns to the rest room
- **THEN** the cat reserves and occupies its own previously assigned berth

### Requirement: Unreachable exhausted-worker warning
The system SHALL visually mark an exhausted cat in red when the cat has zero vigor, remains outside the rest room, and cannot begin a journey to its personal rest berth.

#### Scenario: Missing path strands an exhausted worker
- **WHEN** a working cat reaches zero vigor after all routes to its personal rest berth have been removed
- **THEN** the cat remains in its work slot at zero vigor and that slot displays a red warning that the rest room is unreachable

#### Scenario: Returning worker is not marked stranded
- **WHEN** a working cat reaches zero vigor and successfully starts travelling to its personal rest berth
- **THEN** the cat is not displayed as stranded while travelling

### Requirement: Automatic return after full recovery
The system SHALL send a resting cat with a retained work assignment to its assigned slot when its vigor reaches 100. The cat MUST begin working only after arriving at the slot.

#### Scenario: Fully recovered cat returns to work
- **WHEN** a resting assigned cat's vigor reaches 100 and a route to its assigned slot exists
- **THEN** the cat reserves the assigned slot and starts travelling to it automatically

#### Scenario: Missing return route preserves assignment
- **WHEN** a resting assigned cat's vigor reaches 100 and no route to its assigned slot exists
- **THEN** the cat remains in the rest room at 100 vigor and the work assignment remains visible

### Requirement: Assignment status is visible and controllable
The system SHALL visually distinguish an unassigned empty work slot from an assigned slot whose cat is resting. The player MUST be able to clear or replace a persistent work assignment through the work-slot interaction.

#### Scenario: Resting assignment is displayed
- **WHEN** an assigned cat is resting instead of occupying its work slot
- **THEN** the work slot identifies the assigned cat and indicates that the cat is resting or awaiting a route

#### Scenario: Player clears an assignment
- **WHEN** the player selects an assigned but unoccupied work slot without selecting another cat
- **THEN** the system clears the slot's persistent assignment and keeps the cat in the rest room
