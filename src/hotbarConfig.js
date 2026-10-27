// Shared by saves, inputs, UI and combat without importing the ability catalogue.
export const HOTBAR_SLOT_COUNT=5;
export const HOTBAR_LAYOUT_VERSION=4;
export const BLOCK_ABILITY_ID='block';
export const BLOCK_DEFENCE_XP_MULTIPLIER=1.25;
export const hasEquippedBlock=player=>player?.loadout?.abilitySlots?.includes(BLOCK_ABILITY_ID)===true;
export function isBlockSkillHeld(player,input){
 const slots=player?.loadout?.abilitySlots||[];
 return slots.some((id,index)=>id===BLOCK_ABILITY_ID&&input?.[`ability${index}Held`])||
   (hasEquippedBlock(player)&&!!input?.blockHeld); // Mouse guard shortcut requires an equipped Block.
}
