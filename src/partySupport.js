// Resolve host-owned membership without putting cyclic party lists on allies.
export function getLivingPartyMembers(actor, extra = []) {
  const owner=actor?.questOwner || actor;
  return [...new Set([actor,owner,...(owner?.coop?.players||[]),...extra])].filter(p=>
    p && p.hp>0 && p.active!==false && p.joined!==false &&
    !['downed','beingRevived','dead','respawning'].includes(p.lifeState));
}
