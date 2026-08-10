# node-layout-clearance Specification

## Purpose

Размещение без наложений сохраняет читаемость модулей, хабов и дорожных связей на интерактивном холсте лаборатории.

## Requirements

### Requirement: Node overlap blocking
The system SHALL allow graph nodes to overlap while being positioned. Every node that intersects another node's visible boundary MUST display a red blocked state and MUST be unavailable for work, science transfer, road connections, route calculation, and slot interaction until it is moved clear of the overlap.

#### Scenario: Overlap blocks a new node
- **WHEN** the player creates a node whose default position intersects an existing node
- **THEN** both intersecting nodes remain at their positions and display the blocked state

#### Scenario: Moving clear restores a node
- **WHEN** the player moves a blocked node so that it no longer intersects another node
- **THEN** the node immediately becomes available again

### Requirement: Placement preserves road timing
The system SHALL recalculate the travel time of every connected road after a node is placed at its final valid position.

#### Scenario: Moving a connected node changes road time
- **WHEN** the player moves a node to a valid new position
- **THEN** each connected road reflects travel time calculated from the final positions
