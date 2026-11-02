# Rust Learning Progress

> Last updated: 2026-11-02  
> Learner level: absolute beginner  
> Teaching language: Arabic  
> Current Rust toolchain: installed; learner previously verified `rustc 1.99.0`

## Current position

- **Phase:** 1 — Programming fundamentals
- **Current lesson:** Lesson 4 — Terminal, files, folders, and paths
- **Status:** In progress; explanation delivered, quiz/application not yet submitted
- **Next lesson:** Phase 2, Lesson 5 — Verify Rust toolchain and understand rustc
- **First Rust project:** Planned during Phase 2, immediately after the environment/Cargo introduction. Do not postpone until the whole language is taught.

## Completed lessons

| # | Lesson | Evidence | Status |
|---|---|---|---|
| 1 | What is programming? | أكّد المتعلم صحة جميع الإجابات | Complete |
| 2 | How does a computer work? | نتيجة الاختبار 4 / 4 | Complete |
| 3 | Programming languages and compilers | نتيجة الاختبار 4 / 4 | Complete |

## In progress

| # | Lesson | Work completed | Remaining |
|---|---|---|---|
| 4 | Terminal, files, folders, extensions, and paths | Full explanation delivered | Learner must complete the 5-question quiz and practical check |

## Upcoming curriculum

### Phase 1 — Programming fundamentals
- [x] 1. What is programming?
- [x] 2. How does a computer work?
- [x] 3. Programming languages and compilers
- [ ] 4. Terminal, files, folders, and paths

### Phase 2 — Rust environment and first project
- [ ] 5. Verify Rust toolchain and understand rustc
- [ ] 6. Cargo and creating the first project
- [ ] 7. Project structure, building, and running (Cargo.toml, main.rs, cargo build/run/check)
- [ ] 8. Reading compiler errors
- [ ] 9. Git and GitHub basics (init, add, commit, push, .gitignore)

### Phase 3 — Rust language fundamentals
- [ ] 10. Printing and comments
- [ ] 11. Variables and constants
- [ ] 12. Data types
- [ ] 13. Operations and operators
- [ ] 14. Conditions
- [ ] 15. Loops
- [ ] 16. Functions
- [ ] 17. Strings and input (simplified introduction; deeper treatment in Lesson 21)
- [ ] 18. Project: Terminal calculator

### Phase 4 — Core Rust concepts
- [ ] 19. Ownership
- [ ] 20. Borrowing and References
- [ ] 21. Slices and strings in depth (String vs &str)
- [ ] 22. Structs
- [ ] 23. Enums and match
- [ ] 24. Option and Result
- [ ] 25. Error handling
- [ ] 26. Collections
- [ ] 27. Testing (cargo test)
- [ ] 28. Project: Terminal task manager

### Phase 5 — Advanced concepts and tools
- [ ] 29. Modules and Crates
- [ ] 30. External libraries and reading docs.rs
- [ ] 31. rustfmt and clippy
- [ ] 32. Working with files
- [ ] 33. JSON and serde
- [ ] 34. Traits and Generics
- [ ] 35. Lifetimes
- [ ] 36. Iterators and Closures
- [ ] 37. Smart Pointers
- [ ] 38. Concurrency
- [ ] 39. Async Rust
- [ ] 40. Project: CLI file tool

### Phase 6 — Practical projects
- [ ] 41. Project: HTTP Client
- [ ] 42. Project: API-consuming application
- [ ] 43. Final project

## Review log

- No formal phase-review results have been recorded yet.
- At the beginning of every phase, complete a short five-question review covering the previous phase before starting new material.

## Repository layout

- `docs/` — Static Arabic and English learning dashboard and progress record page.
- `docs/progress.json` — Single structured source for curriculum progress and evidence.
- `LEARNING_PROGRESS.md` — Human-readable progress record and teaching notes.
- `lessons/` — Individual lesson documents.
- `projects/` — Standalone Rust practice projects.
- `scripts/validate-progress.mjs` — Dependency-free consistency checks for the JSON and Markdown progress records.
- `.github/workflows/deploy-pages.yml` — Validation and GitHub Pages deployment workflow.

## Skills demonstrated
- Understands the basic Input → Processing → Output model.
- Can distinguish CPU, RAM, and persistent storage.
- Understands the purpose of a compiler and the role of `rustc`.
- Recognizes basic file extensions and project-path concepts.

## Recurring mistakes
- None recorded so far.

## Teaching rules
- Explain each concept before using it.
- Explain code line by line.
- Do not provide exercise answers before the learner attempts them.
- Do not mark a lesson complete based only on reading. Require an attempt and evidence of understanding.
- Keep lessons small; do not skip fundamentals.
- The learner has Rust installed, but installation does not imply Rust knowledge.
- Update this file after actual demonstrated progress, not merely after presenting a lesson.
- At the beginning of every phase, give a short five-question review from previous lessons before introducing new material.

## Progress dashboard

The static dashboard in `docs/` reads the structured status from `docs/progress.json`. This page is a read-only view; progress is updated in the repository records and is not saved by browser interactions. `progress.json` is the source of truth for item status and evidence, and the Markdown record is checked against it automatically.
