# cat-flight-era Specification

## Purpose

Defines the late-game transition from hub-based roads to direct cat flights while retaining the early-game road network.

## Requirements

### Requirement: Science unlocks direct cat flight
The system SHALL unlock the flight era when the laboratory has accumulated 50 scientific data units. Before the unlock, cats MUST use the existing road network. After the unlock, road connectivity MUST NOT be required for a cat to travel between unblocked non-hub modules.

#### Scenario: Flight unlocks at the threshold
- **WHEN** accumulated scientific data reaches 50 units
- **THEN** the system marks the flight era as unlocked and displays the new transport state

#### Scenario: A cat flies without a road route
- **WHEN** flight is unlocked and a cat is assigned from one unblocked module to another without a road route
- **THEN** the cat begins direct travel and retains its destination-slot reservation

### Requirement: Direct flight follows module geometry
The system SHALL move an airborne cat directly from its current module to its target module using their current positions. Flight duration MUST be derived from direct distance at twice the base road speed.

#### Scenario: Direct flight is twice as fast as a direct road
- **WHEN** a cat travels between two modules at a known distance after flight unlock
- **THEN** its direct-flight duration is half the corresponding direct-road duration

### Requirement: Flight transition preserves active travel
The system SHALL let cats already travelling on a road complete their current road segment, then continue directly to their retained final destination. A stranded cat with a retained destination MUST resume directly when flight unlocks.

#### Scenario: Road traveller changes modes at its next node
- **WHEN** flight unlocks while a cat is partway through a road segment toward an intermediate hub
- **THEN** the cat reaches that hub on the current segment and begins direct flight toward its final destination

#### Scenario: Stranded cat recovers at unlock
- **WHEN** flight unlocks while a cat is stranded with a destination-slot reservation
- **THEN** the cat begins direct flight to the reserved destination without a restored road route

### Requirement: Road infrastructure remains available
After flight unlocks, the system SHALL keep roads and hubs visible, removable, and available for new construction. Road infrastructure MUST NOT affect an airborne cat.

#### Scenario: Roads remain buildable after the breakthrough
- **WHEN** flight is unlocked and the player creates a road hub or road connection using free compatible ports
- **THEN** the system creates the infrastructure while cats continue to use direct flight

#### Scenario: A road is removed during flight
- **WHEN** the player removes any road while a cat is airborne
- **THEN** the cat continues its direct flight unchanged

### Requirement: Airborne cats are visibly distinct
The interface SHALL render a temporary straight trajectory and moving cat token while a cat is airborne, and SHALL not retain that trajectory after arrival.

#### Scenario: Flight disappears on arrival
- **WHEN** an airborne cat reaches its target module
- **THEN** its temporary flight trajectory is removed and the cat is shown at the target slot
