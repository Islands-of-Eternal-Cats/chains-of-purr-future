## Purpose

Defines sellable-data production, storage, routing, and consumption through an explicit acyclic network of research modules, servers, and trade terminals.

## ADDED Requirements

### Requirement: Research produces progress and sellable data
Each active research work-second SHALL add one configured unit to global scientific progress and one configured unit to the research module's sellable-data buffer. Moving, selling, or deleting sellable data MUST NOT reduce scientific progress.

#### Scenario: Active researcher creates both outputs
- **WHEN** a cat actively works in a research module for one second
- **THEN** scientific progress and that module's data buffer each increase by their configured amounts

### Requirement: Data ports enforce compatible topology
The system SHALL allow `research → server`, `server → server`, and `server → terminal` data connections. It MUST reject all other type pairs, self-connections, duplicate connections, a second outgoing connection from a server, and a second incoming connection to a terminal.

#### Scenario: Server relays to another server
- **WHEN** the player connects a server output to a different server input and both ports are available
- **THEN** the directed connection is created

#### Scenario: Terminal cannot bypass a server
- **WHEN** the player attempts to connect research directly to a trade terminal
- **THEN** the connection is rejected without changing the data network

### Requirement: Data network is acyclic
Creating a connection MUST be rejected when it would introduce a directed cycle among servers.

#### Scenario: Back edge is rejected
- **WHEN** servers already provide a directed path from A to B and the player attempts to connect B to A
- **THEN** the new connection is rejected and the existing path remains unchanged

### Requirement: Servers store and move data without duplication
A server SHALL accept data from any number of compatible incoming connections, keep received data in unbounded local storage, and expose it through its single output. Transfer MUST remove exactly the amount added to the destination, and a server without an output SHALL retain its stored data.

#### Scenario: Relay preserves total data
- **WHEN** data moves from an upstream server into a downstream server
- **THEN** the upstream decrease equals the downstream increase

### Requirement: Shared input capacity is fair
When a server has multiple non-empty incoming sources, its available input capacity SHALL be divided evenly among those sources for the tick, with unused shares redistributed among sources that still contain data. Ordering connections MUST NOT permanently starve a source.

#### Scenario: Two sources share server capacity
- **WHEN** two connected sources both contain at least the server's per-source share of data
- **THEN** each supplies an equal amount during that tick

