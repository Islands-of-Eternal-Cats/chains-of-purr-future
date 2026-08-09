## 1. Core deletion recovery

- [x] 1.1 Classify affected cats and capture their current geometric positions before ordinary-module deletion.
- [x] 1.2 Evacuate cats losing a current or final module to the nearest available rest seat or the base waiting queue, clearing obsolete state.
- [x] 1.3 Return road-only interruptions to the surviving leg start and resume their retained route after graph deletion.

## 2. Interface and verification

- [x] 2.1 Update the ordinary-module deletion success message to describe evacuation and rerouting.
- [ ] 2.2 Add simulation tests for occupied and target deletion, deterministic rest allocation and overflow, intermediate-road rerouting, and reference cleanup.
- [ ] 2.3 Run the complete test suite, production build, and strict OpenSpec validation.
