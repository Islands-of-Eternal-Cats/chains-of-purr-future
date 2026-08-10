## Purpose

Defines durable local sandbox saves and portable JSON backups while failing safely when early-development save formats become incompatible.

## ADDED Requirements

### Requirement: Game state autosaves locally
The application SHALL automatically persist the complete durable simulation state after changes, including nodes and positions, cats, connections, counters, scientific progress, flight state, data inventories, and economy totals. Transient selections, current speed, and diagnostic-speed visibility MUST NOT be persisted.

#### Scenario: Reload restores a laboratory
- **WHEN** the page reloads with a valid current-version local save
- **THEN** the durable laboratory state is restored and transient interface state uses defaults

### Requirement: Saves are versioned and validated atomically
Every save SHALL declare its schema version. Import or startup loading MUST fully validate version and structure before replacing the active simulation. Unsupported, malformed, or corrupt saves MUST leave the active game and stored save unchanged and display an actionable error. The system SHALL NOT migrate older versions.

#### Scenario: Unsupported import preserves current game
- **WHEN** the player imports JSON with an unsupported version
- **THEN** the current simulation remains unchanged and the interface offers export or reset

### Requirement: Players can export, import, and reset
The interface SHALL export the current versioned save as JSON, import a validated JSON save, and reset to a new laboratory after explicit confirmation. Reset MUST replace the local save with the new game.

#### Scenario: Export and import round trip
- **WHEN** the player exports a game and imports that JSON into a new session
- **THEN** all durable simulation state matches the exported game

### Requirement: Early-development warning is visible
The interface SHALL inform players that the game is in early development and save files may become incompatible with future versions.

#### Scenario: New player sees save warning
- **WHEN** the application starts for a player who has not acknowledged the warning
- **THEN** the warning is visible and can be acknowledged

