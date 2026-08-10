## MODIFIED Requirements

### Requirement: Science unlocks direct cat flight
The system SHALL unlock the flight era when active research work has produced 50 cumulative scientific-progress units, whether or not sellable data has reached a server. Moving, selling, or deleting data MUST NOT change this progress. Before the unlock, cats MUST use the existing road network. After the unlock, road connectivity MUST NOT be required for a cat to travel between unblocked non-hub modules.

#### Scenario: Research unlocks flight without a data network
- **WHEN** active research work raises scientific progress to 50 while no server is connected
- **THEN** the system marks the flight era as unlocked and displays the new transport state

#### Scenario: Data operations do not change flight progress
- **WHEN** data is transferred, sold, disconnected, or removed
- **THEN** scientific progress and its flight-unlock state remain unchanged

#### Scenario: A cat flies without a road route
- **WHEN** flight is unlocked and a cat is assigned from one unblocked module to another without a road route
- **THEN** the cat begins direct travel and retains its destination-slot reservation

