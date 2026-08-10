## ADDED Requirements

### Requirement: Cats without work appear in a global selectable roster
The crew panel SHALL display a count and a compact selectable entry for every cat that has no persistent work-slot assignment anywhere in the laboratory. Each entry SHALL show the cat's glyph, name, vigor, and current state. The roster SHALL include idle, unseated, travelling, and stranded cats, and SHALL exclude cats that retain a work assignment.

#### Scenario: Unassigned cats have different states
- **WHEN** cats without work are resting, waiting for a seat, travelling, or stranded
- **THEN** every unassigned cat appears in the crew roster with its current state

#### Scenario: A cat retains a work assignment
- **WHEN** a cat has a persistent work-slot assignment while resting or travelling
- **THEN** that cat does not appear in the unassigned crew roster

#### Scenario: Every cat has work
- **WHEN** no cat lacks a persistent work-slot assignment
- **THEN** the crew panel displays a neutral message that all cats are assigned

#### Scenario: Player selects an unassigned cat
- **WHEN** the player clicks an unassigned cat entry
- **THEN** the cat becomes the active selection for the existing work-slot assignment interaction

#### Scenario: Player clicks the selected cat again
- **WHEN** the player clicks the currently selected roster entry
- **THEN** the active cat selection is cleared

#### Scenario: Player assigns roster cat to work
- **WHEN** the selected roster cat receives a persistent work-slot assignment
- **THEN** the cat immediately disappears from the unassigned roster

