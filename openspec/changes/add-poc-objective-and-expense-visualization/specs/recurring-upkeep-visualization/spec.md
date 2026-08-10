## Purpose

Makes recurring laboratory expenses understandable from the fixed economy HUD.

## ADDED Requirements

### Requirement: The top bar visualizes recurring upkeep composition

The economy readout SHALL show total upkeep per minute and a proportional stacked strip containing each positive module-type and cat-upkeep category. Every segment MUST expose its category and numeric rate through a tooltip and accessible label.

#### Scenario: Laboratory composition changes
- **WHEN** a module or cat is added or removed
- **THEN** the total, category values, and proportional segments update to match current recurring upkeep

#### Scenario: Player incurs a one-off cost
- **WHEN** credits change because of construction, hiring, dismissal, or demolition refund
- **THEN** that one-off amount does not appear in the recurring upkeep strip
