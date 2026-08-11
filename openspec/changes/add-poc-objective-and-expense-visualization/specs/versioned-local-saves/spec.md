## MODIFIED Requirements

### Requirement: Saves are versioned and validated atomically

Every save SHALL declare schema version 5 and include cumulative data sales plus profitable duration, maximum historical net income, achieved state, and acknowledged state. Startup SHALL read only the version-5 local key. Import or startup loading MUST fully validate version and structure before replacing the active simulation. Unsupported, malformed, or corrupt saves MUST leave the active game unchanged. The system SHALL NOT read or migrate the version-4 local key.

#### Scenario: Version-4 local save exists without version 5
- **WHEN** the application starts with only a version-4 local save
- **THEN** it starts a new laboratory without converting or deleting the old save

#### Scenario: Unsupported import preserves current game
- **WHEN** the player imports JSON with version 4 or another unsupported version
- **THEN** the current simulation remains unchanged and the interface reports an incompatible version

#### Scenario: Version-5 objective state round trips
- **WHEN** the player exports and imports a version-5 save
- **THEN** cumulative sales, partial or completed profitable duration, maximum historical net income, objective completion, and acknowledgement match the exported game
