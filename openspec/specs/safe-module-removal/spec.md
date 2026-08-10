# safe-module-removal Specification

## Purpose

Defines how ordinary modules can be removed without losing cats, surviving work intent, or simulation-state integrity.

## Requirements

### Requirement: Occupied ordinary modules remain removable
The system SHALL allow any ordinary module except the base rest room to be removed while cats occupy it, travel from it, or have it as their final destination. Road hubs MUST continue to use their dedicated removal behavior.

#### Scenario: Working module is removed while occupied
- **WHEN** the player removes a work module containing one or more working cats
- **THEN** the module and its incident channels are removed and every affected cat remains in the simulation

#### Scenario: Base rest room remains protected
- **WHEN** the player attempts to remove the base rest room
- **THEN** the system rejects the operation without changing the simulation

### Requirement: Cats losing a current or final module are evacuated
The system SHALL evacuate a cat when its current module, flight origin, or final travel target is removed. Each evacuated cat MUST occupy a free seat in the nearest unblocked surviving rest room measured from the cat's current geometric position. If no such seat exists, the cat MUST wait without a seat in the base rest room using the same waiting state as a newly hired cat.

#### Scenario: Nearest free rest seat is selected
- **WHEN** an affected cat can reach free seats in multiple unblocked rest rooms
- **THEN** the cat occupies a seat in the geometrically nearest room with deterministic identifier-based tie-breaking

#### Scenario: All rest seats are unavailable
- **WHEN** no unblocked surviving rest room has a free unreserved seat
- **THEN** the cat waits without a seat in the base rest room

#### Scenario: Flight destination is removed
- **WHEN** a cat is flying to a module that the player removes
- **THEN** the flight and obsolete reservation are cancelled and the cat is evacuated

### Requirement: Interrupted road traversal preserves surviving intent
When removal affects only the next endpoint of a cat's active road leg and the final destination survives, the system SHALL return the cat to the leg's surviving start module, retain its destination reservation and assignment, and recalculate travel after the incident roads are removed.

#### Scenario: Alternate route survives removal
- **WHEN** an intermediate road endpoint is removed and another route exists from the active leg's start module to the retained destination
- **THEN** the cat immediately begins travelling along the recalculated route

#### Scenario: No alternate route survives removal
- **WHEN** an intermediate road endpoint is removed and no replacement route exists
- **THEN** the cat remains visible at the active leg's start module with its retained destination marked unavailable

### Requirement: Module removal leaves no obsolete references
The system MUST remove or replace every cat location, journey, stranded target, slot occupancy, and slot reservation that references the removed module. An assignment to a removed work slot MUST disappear, while an assignment to a surviving destination MUST remain available for automatic return after recovery.

#### Scenario: Removed work assignment disappears
- **WHEN** a work module is removed while a cat is assigned to one of its slots
- **THEN** that assignment no longer exists and the evacuated cat remains unassigned

#### Scenario: Surviving assignment remains
- **WHEN** a cat is evacuated because its journey origin is removed but its assigned destination survives
- **THEN** the assignment remains and normal recovery behavior can return the cat to that work
