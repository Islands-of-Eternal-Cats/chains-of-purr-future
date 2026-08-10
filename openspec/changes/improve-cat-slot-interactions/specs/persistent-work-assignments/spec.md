## MODIFIED Requirements

### Requirement: Assignment status is visible and controllable
The system SHALL visually distinguish an unassigned empty work slot from a slot that represents an occupied, resting, route-waiting, or travelling cat. Selecting any represented slot MUST select its displayed cat before a repeated selection performs the role-specific action. If a different cat was selected previously, the represented cat MUST replace that selection. The player MUST be able to clear or replace a persistent work assignment through the work-slot interaction.

#### Scenario: Resting assignment is displayed
- **WHEN** an assigned cat is resting instead of occupying its work slot
- **THEN** the work slot identifies the assigned cat and indicates that the cat is resting or awaiting a route

#### Scenario: Player selects a resting assignment
- **WHEN** the player selects an assigned but unoccupied work slot for the first time
- **THEN** the assigned cat becomes selected and its assignment remains unchanged

#### Scenario: Player clears an assignment
- **WHEN** the player selects an assigned but unoccupied work slot while its cat is already selected
- **THEN** the system clears the slot's persistent assignment and keeps the cat in the rest room

#### Scenario: Indirect slot replaces another selection
- **WHEN** one cat is selected and the player selects an assigned or reserved slot representing another cat
- **THEN** the represented cat becomes selected without changing either cat's simulation state

#### Scenario: Player clears a working cat's assignment
- **WHEN** the player selects an occupied work slot and then selects the same slot again
- **THEN** the system clears the persistent assignment, frees the slot, stops its production contribution, and sends the cat toward rest

#### Scenario: Immediate rest journey is unavailable
- **WHEN** a player clears a working cat's assignment while no route or rest seat is available
- **THEN** the old work slot is freed and the cat visibly waits at its current module without contributing production until it can continue toward rest

#### Scenario: Working cat remains productive while selected
- **WHEN** the player selects an occupied work slot but has not selected a destination yet
- **THEN** the cat remains in its current slot and continues working without any simulation-state change

#### Scenario: Player transfers a working cat directly
- **WHEN** the player selects an occupied work slot and then selects an available work slot in another module
- **THEN** the cat leaves its current slot and travels directly to the new assignment without visiting a rest room

#### Scenario: Player transfers a cat within one module
- **WHEN** the player selects an occupied work slot and then selects another available slot in the same module
- **THEN** the cat moves to the new slot immediately and the old slot becomes unassigned

#### Scenario: Transfer route is unavailable
- **WHEN** a working cat is transferred to a slot that has no available route from the current module
- **THEN** the old slot is freed, the new slot is assigned and reserved, and the cat visibly waits at the current module until a route appears

#### Scenario: Player cancels worker selection
- **WHEN** the player presses Escape after selecting a working cat and before selecting a destination
- **THEN** the selection is cleared and the cat remains assigned to and working in the original slot

## ADDED Requirements

### Requirement: Active destinations are selectable and redirectable
The system SHALL allow a reserved destination slot to select the cat represented by that destination. A selected cat travelling or waiting for a route to a work destination MUST be redirectable to another available work slot.

#### Scenario: Player selects an active work destination
- **WHEN** the player selects a work slot reserved by a travelling or route-waiting cat
- **THEN** that cat becomes selected and its current destination remains unchanged

#### Scenario: Player redirects an active work destination
- **WHEN** the selected travelling or route-waiting cat is assigned to another available work slot
- **THEN** the old destination is released and the cat starts or waits for a route to the new destination from the start node of its interrupted leg

#### Scenario: Player cancels an active work destination
- **WHEN** the player selects the same reserved work destination while its cat is already selected
- **THEN** the work assignment and destination reservation are cleared, the cat returns immediately to the start node of its current leg, and the cat proceeds toward rest

#### Scenario: Player cancels a route-unavailable destination
- **WHEN** a reserved work destination represents a cat waiting for a route and the player selects it twice
- **THEN** the destination is cleared from the cat's current node and the cat proceeds toward rest

#### Scenario: Return to rest remains selectable
- **WHEN** the player selects a rest-room slot reserved by a returning cat
- **THEN** the returning cat becomes selected but a repeated selection does not cancel its return to rest

#### Scenario: Returning cat receives future work
- **WHEN** a cat travelling or waiting for a route to rest is selected through its reserved rest slot and assigned to an available work slot
- **THEN** the new work assignment is retained while the cat continues to rest and returns to work through the normal recovery cycle
