## Purpose

Makes the running release identifiable to players and support without duplicating version metadata across the application.

## ADDED Requirements

### Requirement: The interface displays the application release version
The interface SHALL display the semantic version sourced from the application's package metadata in the brand header, prefixed with `v`.

#### Scenario: Version 0.2.0 is running
- **WHEN** the application package version is `0.2.0`
- **THEN** the brand header displays `v0.2.0`

