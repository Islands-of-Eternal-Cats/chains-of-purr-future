# node-layout-clearance Specification

## Purpose

Управляемое размещение делает новые модули заметными и сохраняет читаемость модулей, хабов и дорожных связей на интерактивном холсте лаборатории.

## Requirements

### Requirement: Viewport-centered node creation
The system SHALL place every newly created graph node so that the node's visible center matches the center of the current graph viewport. Placement MUST account for the current pan, zoom, and the created node's visible dimensions without moving the viewport.

#### Scenario: Create after panning and zooming
- **WHEN** the player creates a module or road hub after panning or zooming the graph
- **THEN** the complete node is centered in the currently visible graph area

### Requirement: Node overlap blocking
The system SHALL allow graph nodes to overlap while being positioned. Every node that intersects another node's visible boundary MUST display a red blocked state and MUST be unavailable for work, science transfer, road connections, route calculation, and slot interaction until it is moved clear of the overlap.

#### Scenario: Overlap blocks a new node
- **WHEN** the player creates a centered node whose position intersects an existing node
- **THEN** both intersecting nodes remain at their positions and display the blocked state

#### Scenario: Moving clear restores a node
- **WHEN** the player moves a blocked node so that it no longer intersects another node
- **THEN** the node immediately becomes available again

### Requirement: Placement preserves road timing
The system SHALL recalculate the travel time of every connected road after a node is placed at its final valid position.

#### Scenario: Moving a connected node changes road time
- **WHEN** the player moves a node to a valid new position
- **THEN** each connected road reflects travel time calculated from the final positions
