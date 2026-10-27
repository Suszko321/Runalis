# Runalis Story Gap Analysis

Audit date: 2026-07-21

## Summary

The project contains a playable three-act scaffold, but the scaffold belongs to an older continuity. The new master brief is not a small extension; it changes the cause of the central catastrophe, the cosmology, the identity of every major antagonist, the opening, the Act III setting, the faction structure, and the timing of the core mysteries.

The mechanical gap is smaller than the narrative gap. Quest stages, dialogue conditions, flags, travel, region transitions, procedural dungeons, boss phases, and save migration already exist. The work is to create a canonical story model and feed it through those systems.

## Coverage by act

| Story area | Current implementation | Required target | Gap |
|---|---|---|---|
| Opening | New player appears safely in Orrakai; old data describes waking near Hearthmere after an ambiguous caravan attack. | Player is a caravan guard; ancient artifact is stolen by Order of the Last Dawn; player survives and awakens in Orrakai. | Playable inciting incident, artifact identity, Order presence, survivor logic, and recovery scene are missing. |
| Act I setting | Orrakai hub plus Echoryn/Hearthmere Frontier. | Orrakai region under Rot Blight pressure. | Geography and naming need consolidation, not replacement. |
| Act I visible conflict | Ember Veil demon cult, seals, corruption, Malakar. | Order of the Last Dawn appears villainous while Covenant appears heroic. | Current antagonist is generic and openly evil; red-herring structure is absent. |
| Act I mystery | Dawnspire wound, failed purification, Unbound player. | Rot Blight origin, artifact purpose, why the Order needs Malakar, Seraphel warning. | Mystery objects and reveal ladder need replacement. |
| Act I climax | Demon-themed procedural dungeon; Malakar dies and exposes Covenant/Dawnspire truth. | Order summons imprisoned Primordial Malakar for knowledge; player defeats him; he reveals the Order did not serve him and warns against Seraphel. | Fight can stay; summon context and all revelations must change. |
| Act II world | Compact Aureate Marches with checkpoint, camp, purification site, tower, and Shattered Choir. | Prosperous Frontier Marches, military frontier, pilgrim roads, ruins, convincing Covenant good works. | Strong concept but region is a prototype shell and needs civilian/political depth. |
| Act II antagonist | Seraphel is the final boss and already framed as fallen wrath. | A strong regional political/military/ideological antagonist distracts from Seraphel; Seraphel remains compassionate until late. | Regional antagonist, false resolution, and slow credibility shift are missing. |
| Act II climax | Seraphel reveals Zephyr/network truth. | Seraphel becomes the true antagonist near the climax without becoming obviously evil. | Motivation and reveal sequence need full redesign. |
| Act III world | Compact Ascension Wastes and Ascension Spire. | Zarynth, high Covenant politics, Zephyr, hidden order, Rot truth, Ninth God. | Required city/kingdom, institutions, conspiracy investigation, and political cast are absent. |
| Zephyr | Serene cosmic assimilator born from worship, machinery, Essence, and something older; framed as compassionate and terrifying. | Manufactured survivor infused with Ninth-God essence, publicly heroic, privately hateful, manipulative, irredeemable. | Origin, psychology, public career, hidden upbringing, victims, and conspiracy ties are absent. |
| Ending | Destroy, replace, or sever the Dawnspire Network. | Not yet fixed beyond Zephyr and Ninth-God resolution. | Existing choices may be reusable only after the new metaphysics and costs are defined. |

## Foundational gaps

### 1. Canon authority

**Problem:** The same story facts exist in multiple live and unreachable modules, often with different levels of detail. The project has no machine-readable statement that the new master brief supersedes the old continuity.

**Impact:** Any new quest or dialogue can accidentally reinforce obsolete lore. Boss behaviors and act-completion logic can contradict authored data.

**Required outcome:** A canonical registry and deprecation map that labels every old fact as preserve, reinterpret, false in-world belief, legacy alias, or retire.

### 2. The opening promise

**Problem:** The game advertises a classless wanderer preparing in a safe hub, not a caravan guard who has just survived a consequential attack.

**Impact:** The player lacks a personal reason to pursue the artifact or the Order. The main mystery begins as exposition rather than lived experience.

**Required outcome:** A short, playable caravan sequence that teaches movement, interaction, basic combat, injury, loss, and the artifact mystery before handing the player to the existing Orrakai hub.

The player should survive through circumstance, training, or another person's sacrifice—not because a prophecy selects them.

### 3. The artifact

**Problem:** The artifact has no canonical identity, capabilities, provenance, transport reason, custodian, or gameplay signature.

**Impact:** The inciting incident cannot connect cleanly to Malakar, the Rot Blight, the Ninth God, or Zephyr.

**Required outcome:** Define what the artifact does, what each faction thinks it does, why the caravan carried it, why the Order stole it, and what evidence it leaves in gameplay. Its full truth should remain hidden until late.

### 4. The Order of the Last Dawn

**Problem:** The Order is absent as a functioning faction. The Ember Veil occupies the hostile-cult role and has a plainly generic motivation.

**Impact:** The central Act I misdirection and moral reversal do not exist.

**Required outcome:** Public reputation, internal doctrine, leadership, cells, resources, atrocities, justification, disagreement, artifact plan, Malakar plan, and visible difference from the hidden Covenant conspiracy.

The Order must do things the player cannot excuse while still pursuing a comprehensible survival strategy.

### 5. The Rot Blight

**Problem:** Current content uses generic corruption, demonic taint, failed purification, and Essence damage without a canonical relationship among them.

**Impact:** The main catastrophe has no consistent rules and cannot be investigated through play.

**Required outcome:** Symptoms, vectors, stages, ecological effects, human effects, false cures, true containment, visual language, enemy mutations, resource effects, political uses, and hidden engineered origin.

The Rot should create gameplay decisions—routes, supplies, treatment, quarantine, harvesting risk—not just change color palettes.

### 6. Cosmology and revelation control

**Problem:** The Eight/Ninth system, Divine Realms, Primordials, and Primearchs are missing. Old angel/demon assumptions reveal the wrong cosmology from the beginning.

**Impact:** Bloodlines, classes, bosses, religions, ruins, and races cannot share a coherent history.

**Required outcome:** A truth ledger with five layers: objective canon, official Covenant history, regional folk belief, faction belief, and player-known information by act.

The Ninth must not become explicit public knowledge before late game. Early evidence should be absences, mismatched counts, erased symbols, reused foundations, and liturgical grammar that assumes a missing subject.

### 7. Malakar

**Problem:** Current Malakar is a demon lord who is evil and drawn to a wound.

**Impact:** The Order's tragic logic and the Primordial hierarchy are lost. His warning points at the wrong target.

**Required outcome:** Imprisonment history, relationship to a God/Divine Realm, reason civilizations feared him, knowledge only he retains, Order bargain, limits on physical manifestation, and a death scene that changes the player's model of the conflict.

Malakar must be powerful and dangerous without being the ultimate evil. He must remain distinct from a Primearch.

### 8. Seraphel

**Problem:** Seraphel is already coded and described as a fallen angel whose compassion failed.

**Impact:** Malakar's warning is easy to believe too early, destroying Act II tension.

**Required outcome:** Primearch lineage, public miracles, credible acts of mercy, political position, relationship to Covenant leadership, true goal, unacceptable method, and a chain of evidence that can still be rationalized until late Act II.

The regional antagonist should embody a cruder version of order/control so that defeating them makes Seraphel's gentler solution feel attractive.

### 9. Zephyr and the hidden order

**Problem:** The hidden conspiracy, child experiments, Ninth remnants, manufactured messiah program, and sole survivor are absent. Current Zephyr sincerely wants unity.

**Impact:** The final villain lacks the required personal history and deliberate human culpability.

**Required outcome:** Conspiracy origin, recruitment, cells, archives, methods, failed subjects, institutional cover, Rot program, Zephyr's upbringing, public legend, private behavior, and why the conspirators believe they can control him.

Zephyr's suffering can explain him but must not excuse or redeem him. His charisma should make people volunteer the power he intends to weaponize.

### 10. Zarynth and political stakes

**Problem:** Zarynth does not exist in code or content.

**Impact:** Act III jumps from frontier exploration to cosmic wasteland without the required political escalation.

**Required outcome:** Government, Covenant hierarchy, noble/merchant/military blocs, districts, religious institutions, hidden-order access, public Zephyr cult, Rot policy, class/race tensions, and ways the player can gain or lose access.

The Ascension Wastes can survive as a scar, outer territory, hidden layer, or late transformation associated with Zarynth.

## Character and relationship gaps

| Character area | Existing strength | Missing work |
|---|---|---|
| Player | Classless start and flexible build. | Caravan-guard background, non-Chosen-One survival logic, personal stake, optional past without a fixed heroic destiny. |
| Mara Vell | Clear voice and healing-versus-control theme. | Role in Orrakai/Rot crisis, durable companion presence, hard compromises, personal relationships beyond trainer function. |
| Warden Mael | Credible tired authority figure. | Political allegiance, history with Covenant/Order, limits of jurisdiction, secrets, Act I decision arc. |
| Bram | Grounded courage and tutorial suitability. | Persistent field role, growth through failure, relationships and conflicts not based solely on fear. |
| Kaelen Dusk | Strong memory/death philosophy. | Canonical Primordial/bloodline context and an active companion system. |
| Sister Elian | Best existing lens on sincere faith. | Place in the actual Covenant, consequences of doubt, alternate outcomes, and non-binary faith choices. |
| Malakar | Distinct fight and truth-teller function. | Entire canonical identity and warning scene. |
| Seraphel | Strong visual/mechanical identity. | Primearch canon, credible compassion, subtle antagonism, and relationship to the Eight. |
| Zephyr | Beautiful, serene, manipulative presentation. | Manufactured human history, refined hatred, hidden victims, public hero career, and irredeemable agency. |
| Act II regional antagonist | None. | A complete political/military/ideological foil with local stakes. |
| Hidden-order cast | None. | Founders, current leaders, researchers, handlers, defectors, victims, archivists, and cover identities. |

## Quest-design gaps

The quest engine is capable, but many existing side quests are linear combinations of collect, kill, discover, and return. They support progression but often resolve a local problem without changing the player's understanding.

Major quests need:

- at least one piece of optional evidence outside the critical path;
- two plausible interpretations before confirmation;
- a character or faction consequence;
- a mechanical preparation or exploration payoff;
- a new question introduced by the resolution;
- visual aftermath in the world where practical;
- failure, refusal, or partial-success handling when the premise supports it.

The main quest currently advances through objective stages, but boss-name matching can complete an act wholesale. Major story completion should require explicit milestone flags, not a loose name/theme match.

## Lore-delivery gaps

Missing delivery systems or content patterns:

- books, letters, tablets, court records, sermons, and field notes;
- inspectable architecture and murals;
- contradictory historical sources;
- race/culture-specific material language;
- NPC rumors that update after major events;
- companion camp conversations driven by relationship and act;
- faction reputation and access consequences;
- environmental changes after quest choices;
- a player journal that separates facts, claims, and unresolved questions;
- late-game recontextualization of early items and ruins.

## Highest-risk generic-fantasy failure modes

1. Renaming every demon “Primordial” without giving it lineage, politics, history, and manifestation rules.
2. Turning the Order into misunderstood heroes whose atrocities have no victims or consequences.
3. Making the hidden order a monolithic evil cult instead of an institution with recruitment logic and self-justification.
4. Making the Ninth simply an ancient evil that wants resurrection.
5. Making the player uniquely immune because destiny requires it.
6. Treating the Covenant as obviously evil in Act I or obviously totalitarian in every local interaction.
7. Making Seraphel signal betrayal through ominous dialogue before the player has reasons to trust him.
8. Explaining Zephyr's childhood so sympathetically that the story undermines the requirement that his mature choices are irredeemable.
9. Adding elves, dwarves, orcs, and other races before defining why their civilizations exist in this cosmology.
10. Using lore dumps where architecture, enemy behavior, item provenance, or quest consequences could carry the same information.

## Story-ready acceptance conditions

The project is ready for broad narrative expansion only when:

- one canonical source controls each major fact;
- the Eight/Ninth truth ledger and reveal schedule exist;
- the opening artifact and attack are defined;
- Orrakai/Hearthmere/Echoryn geography is unambiguous;
- Rot Blight rules exist in narrative and gameplay terms;
- the Order and hidden conspiracy are separate faction records;
- Malakar, Seraphel, and Zephyr have new-canon profiles;
- Zarynth has a political and spatial brief;
- player-facing angel/demon terminology has a migration plan;
- companion relationships have an actual runtime path;
- automated validators catch broken IDs and retired terminology in new content.
