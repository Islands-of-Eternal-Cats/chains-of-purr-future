## Purpose

Дорожные хабы ограничивают число прямых путей и делают перемещение котов по лаборатории устойчивым к изменениям дорожной сети.

## ADDED Requirements

### Requirement: Road hub topology
The system SHALL provide a road hub that is used only for cat travel. A road hub MUST expose four bidirectional road ports, one on each cardinal side, and each port MUST accept at most one road connection. A non-hub module MUST accept at most one bidirectional road connection. Road hubs MAY connect to other road hubs.

#### Scenario: Hub joins four roads
- **WHEN** the player connects four distinct roads to different sides of a road hub
- **THEN** all four roads are created successfully

#### Scenario: Occupied port rejects another road
- **WHEN** the player attempts to connect a road to an already occupied hub side or to a non-hub module that already has a road
- **THEN** the system rejects the connection without changing the road network

### Requirement: Road hubs do not participate in science or work
The system SHALL not provide work slots, science production, science reception, or science-channel ports on a road hub.

#### Scenario: Hub cannot receive a science channel
- **WHEN** the player attempts to create a science channel with a road hub as either endpoint
- **THEN** the system rejects the channel and existing science behavior remains unchanged

### Requirement: Globally optimal hub-to-hub travel
The system SHALL select a cat's next road leg from the globally fastest available route to its final destination, measured by total road travel time. On arrival at every intermediate hub, the system MUST recalculate the remaining fastest route before selecting the next road leg. A direct road to the final destination MUST be used when it is the fastest route.

#### Scenario: Faster non-nearest hub is selected
- **WHEN** the geographically nearest next hub leads to a slower total route than another available hub
- **THEN** the cat starts toward the hub on the faster total route

#### Scenario: Cat recalculates after reaching a hub
- **WHEN** a cat arrives at an intermediate road hub and the road topology has changed since it started travelling
- **THEN** the cat selects the fastest currently available next leg to its unchanged final destination

### Requirement: Hub deletion strands and recovers cats
The system SHALL allow a player to delete a road hub even when cats use it in active or planned travel. Each affected cat MUST retain its final destination and destination-slot reservation, be placed at the geometrically nearest surviving road hub, and enter a visible stranded state. If no road hub survives, the cat MUST be placed at the source module of its interrupted journey. The system MUST automatically resume a stranded cat's journey when a route to its retained destination becomes available.

#### Scenario: Deleting a hub strands an en-route cat
- **WHEN** the player deletes a road hub that occurs on a travelling cat's remaining route and another road hub remains
- **THEN** the cat is placed at the nearest surviving hub, marked stranded, and its destination reservation remains held

#### Scenario: Stranded cat resumes after reconnection
- **WHEN** the player creates road connections that restore a route from a stranded cat to its retained destination
- **THEN** the cat automatically begins travelling on the fastest available route

#### Scenario: Deleting the final hub falls back to the source module
- **WHEN** the player deletes a hub that interrupts a cat's journey and no road hub remains
- **THEN** the cat returns to the source module and remains stranded until a route can be restored

### Requirement: Stranded travel is visible
The system SHALL display a stranded cat at its current road hub with a red warning that its final destination is unreachable.

#### Scenario: Hub shows unreachable cat
- **WHEN** a cat is stranded at a road hub
- **THEN** the hub visibly identifies the cat and displays a red unreachable-destination warning
