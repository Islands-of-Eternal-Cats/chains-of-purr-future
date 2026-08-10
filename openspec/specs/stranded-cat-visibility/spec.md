# stranded-cat-visibility Specification

## Purpose

Ensures every cat awaiting a restored route remains visible at its current module.

## Requirements

### Requirement: Visible stranded cats at every module
The system SHALL display each stranded cat at the existing module identified by its current location, regardless of that module's type. The display MUST identify the cat and state that its route is unavailable.

#### Scenario: Stranded cat at an ordinary work module
- **WHEN** a cat is stranded at a research or server module
- **THEN** that module displays the cat and a route-unavailable warning

#### Scenario: Stranded cat at a road hub
- **WHEN** a cat is stranded at a road hub
- **THEN** that hub continues to display the cat and a route-unavailable warning
