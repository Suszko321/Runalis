# RUNALIS engineering guidance

Read [docs/RUNALIS_ENGINEERING_STANDARDS.md](docs/RUNALIS_ENGINEERING_STANDARDS.md)
before changing runtime code. Use [the engineering audit](docs/RUNALIS_ENGINEERING_AUDIT.md)
for the runtime map and [the quality register](docs/ENGINEERING_QUALITY_REGISTER.md)
for known defects, priorities and verification requirements.

- The playable application is the root `index.html` and `src/`. It uses Canvas 2D.
  The nested `Runalis/` tree is an archived upload, excluded from the Pages build.
- Inspect `git status` and preserve other agents' work. Keep changes focused.
- Preserve gameplay rules, persistent IDs and character progress. Coordinate
  design decisions with the relevant Combat, Multiplayer, Narrative or Art director.
- Run `npm run check:engineering`, `npm run build`, and the affected feature suites.
  The small engineering gate does not cover every known defect or browser scenario.
- Record significant findings/fixes in the quality register. Distinguish passing
  contracts, defect reproductions, source observations and untested hypotheses.
