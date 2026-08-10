## MODIFIED Requirements

### Requirement: Saves are versioned and validated atomically

Every save SHALL declare schema version 2 and include cumulative data sales plus achieved and acknowledged objective state. Startup SHALL read only the version-2 local key. Import or startup loading MUST fully validate version and structure before replacing the active simulation. Unsupported, malformed, or corrupt saves MUST leave the active game unchanged. The system SHALL NOT read or migrate the version-1 local key.

#### Scenario: Version-1 local save exists without version 2
- **WHEN** the application starts with only a version-1 local save
- **THEN** it starts a new laboratory without converting or deleting the old save

#### Scenario: Unsupported import preserves current game
- **WHEN** the player imports JSON with version 1 or another unsupported version
- **THEN** the current simulation remains unchanged and the interface reports an incompatible version

#### Scenario: Version-2 objective state round trips
- **WHEN** the player exports and imports a version-2 save
- **THEN** cumulative sales and objective completion and acknowledgement match the exported game
