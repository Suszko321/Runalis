# Oathkeeper: Blunt Mastery and impact pass

This records the original Blunt integration. For current Holyknight and Sinner mechanics, tree changes and balance results, see the [Oathkeeper identity pass](../oathkeeper-identity/README.md).

Oathkeeper's two maces were registered as swords. They now use the mace moveset and a dedicated **Blunt Weapons** proficiency, with the Oathkeeper's existing +25% weapon-training affinity. Swords retain Blades; Waverider's affinities are unchanged.

Blunt Mastery has twelve nodes: a core, two exclusive technique choices, two exclusive specializations, a capstone, and four optional passives. Crushing Grip, Driving Momentum, Iron Brace, Breaking Blow, Quaking Impact and Weight of the Oath use established power, stagger, armour, blocking, critical and area bonuses. Its existing point costs and prerequisite structure follow the other weapon trees.

The thirteen original Oathkeeper class skills and their twenty-six morphs use Blunt for their original physical progression. Existing costs, damage ratios, cooldowns, Conviction, healing, defensive mechanics, morph unlocks and Expertise choices remain intact. Mandate recognizes actual mace hits. Blunt offensive scaling uses Dexterity, as the former Blade scaling did.

The mace's light combo now has a deliberate forehand, returning backhand and overhead crushing finish. It keeps the mandatory restart pause. Weapon poses arrive at contact when damage becomes active, so impact pauses hold the struck pose rather than a weapon still overhead. Maces and hammers keep anatomically constrained arms and rigid body proportions in every direction. Heavy attack balance profiles are retained; the corrected maces now actually select their intended mace profile.

## Effects and sound

- Original/Holyknight: gold, ivory and iron; blessed mace trails, shield stamps, sacred chains, consecration seals, judgment columns and ground fractures.
- Sinner now uses black grave-swords with violet and ivory death-magic edges, spectral sword armor, rising impalements and a moving sword procession.
- Primary weapons: lift, strike-timed whoosh, metal-and-body contact, and a deeper crushing impact. Ground debris appears on actual heavy/finisher hits; misses only produce swing presentation.
- Persistent fields retain their real circular boundary and fade at expiry. Ground effects remain anchored to world positions; a bounded 24-entry seal cache keeps dense presentation inexpensive.
- The character-creator Oathkeeper preview uses the new mace impact and guard motifs.

## Existing characters

Old mace users receive their former Blade proficiency in Blunt once, without erasing valid Blade progress. Mace-only Oathkeepers' formerly mislabelled Sword Mastery purchases move to equivalent Blunt nodes at the same costs. Characters owning actual swords keep their Sword purchases. Historical proficiency point credit is preserved rather than duplicated. Class-tree node IDs and all saved morph/Expertise selections stay valid. Respecs continue to work through the existing system.

## Performed verification

`verification.json` records eight focused simulation groups, including all 52 current skill forms, real three-part mace hits, Mandate, level scaling, old and ancient save migration, mixed sword/mace builds, point accounting and hotbar-only mastery.

`browser-verification.json` records 52 real skill captures, 16 mace captures across four directions, eight synthesized sound samples, nine geometry checks with zero camera drift, and rendering measurements for 18 simultaneous fields. The cached field renderer measured 0 ms median / 1 ms 95th percentile in the recorded run; this is a renderer-only measurement, not a claim about whole-game performance.

The screenshots use controlled proving-ground targets. They verify casts, contact, presentation and resource behavior; they do not constitute a long-form campaign difficulty playtest. Broader progression, morph, Expertise, combat, human gait, controller and elite-hazard regressions are also run before delivery.

Original edited files are retained in `backups/oathkeeper-blunt-2026-10-12/`.

The subsequent [Vow’s Arsenal pass](../oathkeeper-paladin/) adds Hallowed Blades and its three morphs, bringing Oathkeeper to thirteen skills and thirty-nine morphs. It also strengthens shockwaves and provides individual pixel sword art and sound cues.

Current choices, save migration and verification: [two-path catalogue](../subclass-reduction/README.md).
