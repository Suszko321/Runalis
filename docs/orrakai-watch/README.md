# Visible Orrakai watch posts

The opening quest guard stood beneath the south arch's foreground artwork.
That guard now stands in the open square below the Market Steps. Three new
guards watch the market, infirmary west side and Warden's Hall. The existing
Road Watch is now the North Gate Guard, stationed clear of the northern roofs.

All five posts are stationary, labelled, armed town guards. Each offers the
same road report through the existing `orrakaiLowerGateGuard` quest objective.
Markers appear on all five until the report is recorded, then clear together.
Early conversations cannot consume the report before the aid stage begins.
Mael's instructions and the quest journal point to the nearest open posts.

The watch anchors are reapplied after published town overrides and on campaign
updates. Reconstruction and save/load preserve one instance of each guard.

Checks:

- `node tools/verify-orrakai-watch.mjs`: every guard's report, markers, roof/arch
  clearance, stationary labels, save/load, and early conversation behavior.
- `node tools/verify-orrakai-watch-browser.cjs`: real interaction and report
  completion at all five posts, with screenshots and no browser errors.
- `node tools/verify-orrakai.mjs`: town interaction reachability and services.
- `node tools/verify-mercy-flow.mjs`: complete opening and Act I interaction
  flow, including 42 save/load checkpoints.
- `node tools/verify-act1-campaign.mjs` and `node tools/verify-root-retort.mjs`:
  campaign progression and the two apothecary floors remain functional.

The browser test repositions the player to inspect each post. The full quest
flow also sets enemy HP to zero to exercise death handling; neither test is a
combat balance or manual navigation playthrough.
