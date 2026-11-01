export const IRON_MIRE_QUEST='ironMireLastShift';
export const IRON_MIRE_VERSION=1;
export const IRON_MIRE_CHAPTERS=['The Receiving Works','The Drowned Shifts','The Foreman’s Bell'];
const flag=(key,label)=>({type:'storyFlag',flag:`ironMire.${key}`,required:1,label});
export const IRON_MIRE_QUEST_DATA={id:IRON_MIRE_QUEST,title:'The Shift That Never Ended',type:'sideQuest',giverNpcId:'mineDrifter',recommendedLevel:16,
 summary:'The Iron Mire did not swallow an empty mine. Restore the emergency works, recover the three crew rolls, and silence the bell that still calls the drowned to work.',stages:[
 {id:'surveyor',title:'A Lamp Left Burning',text:'Find Surveyor Mara Venn in the receiving works beneath the Abandoned Iron Vault. The Mine Drifter left her holding the last dry refuge.',objectives:[{type:'talk',npcId:'ironMireSurveyor',required:1,label:'Speak with Mara Venn at the entrance refuge'}]},
 {id:'pumps',title:'Open the Emergency Returns',text:'Clear the west pump house and east boiler gallery. Open both emergency bypasses before using the northern cage lift.',objectives:[flag('westPump','Open the west pump bypass'),flag('eastPump','Vent the east boiler return')]},
 {id:'crews',title:'Three Crews Below',text:'Recover the receiving, cutting and night-shift rolls from their guarded work stations on the second floor. Release both cage brakes to reach the deep bell chamber.',objectives:[flag('crew0','Recover the receiving crew roll'),flag('crew1','Recover the cutting crew roll'),flag('crew2','Recover the night-shift roll'),flag('westBrake','Release the west cage brake'),flag('eastBrake','Release the east cage brake')]},
 {id:'foreman',title:'No More Overtime',text:'Enter the deep bell chamber and defeat the Drowned Iron Foreman. His raised pick marks a charge; chains leave lanes between them; the flood leaves dry ground. The chamber seals until victory or defeat.',objectives:[flag('foremanReleased','Defeat the Drowned Iron Foreman')]},
 {id:'report',title:'Names Above the Water',text:'Return to the Mine Drifter outside the Iron Vault with the three crew rolls. The dead deserve names, not another salvage tally.',objectives:[{type:'talk',npcId:'mineDrifter',required:1,label:'Bring the crew rolls to the Mine Drifter'}]}
 ],rewards:{xp:{mining:240,crafting:160,renown:250},items:[['blackIronSword',1],['shrineTonic',3],['ashCoin',80]],storyFlags:['ironMire.reported']}};
const node=(id,speaker,speakerId,text,options=[])=>({id,speaker,speakerId,text,options,appendNpcQuestOptions:false});
export const IRON_MIRE_DIALOGUES={
 ironMireAssignment:node('ironMireAssignment','Mine Drifter','mineDrifter','“Three crews went under. The bell still rings for all of them.” He turns a corroded tally token over in his hand. “I ran when the water broke through. Mara Venn went back with the emergency keys. Find her in the receiving works. Open the bypasses, bring the shift rolls up, and stop that foreman calling them down again.”',[
  {id:'lastShift',label:'I’ll bring their names back.',startsQuest:IRON_MIRE_QUEST,response:'“This is deeper than the Orchard. Take supplies. Mara has the first dry room; the old cage lift is north of the pump houses. Clear the crews guarding each control before you turn it.”',closeAfterResponse:true}]),
 ironMireWaiting:node('ironMireWaiting','Mine Drifter','mineDrifter','“Mara’s in the first refuge. West pump, east return, then the northern cage. Below that, three crew rolls and two cage brakes. The bell is lower still. I can mend a tool up here. I can’t mend what I left down there.”'),
 ironMireReport:node('ironMireReport','Mine Drifter','mineDrifter','He takes the rolls with both hands. Some names have washed away; others have been pressed deep enough to scar the metal beneath. “He sealed the overflow to save the last load. We heard the bell and kept cutting. I kept telling myself they’d followed me out.”',[
  {id:'names',label:'The bell is silent. These are the people who did not come out.',response:'“Then I’ll read every name that’s left. Mara can take the iron for the refuge; I’ll build the markers. No more shifts. No more counting a crew as cargo.”',completesTalkObjective:'mineDrifter',closeAfterResponse:true}]),
 ironMireAfter:node('ironMireAfter','Mine Drifter','mineDrifter','Three rows of names lie beside the mended tools. “The pumps hold. Mara’s bringing the last salvage up by daylight. Nobody goes below for a bell again.”'),
 ironMireSurveyor:node('ironMireSurveyor','Surveyor Mara Venn','ironMireSurveyor','Mara has chalked the waterline above her head. “The west pump and east boiler are feeding each other. Open both bypasses. The northern cage will unlock when the pressure falls. Below, the drowned still guard their shift rolls. Free both cage brakes after you find the three rolls.”',[
  {id:'plan',label:'What is ringing the bell?',response:'“The foreman. He locked the overflow to save the ore shipment. Now he wears the deep-work suit and rings for crews that cannot leave. In his chamber, keep clear of the raised pick, step between the chain lanes, and move to the dry side before the flood releases. When the bell sounds, get close or leave its marked ring.”',completesTalkObjective:'ironMireSurveyor',closeAfterResponse:true}]),
 ironMireSurveyorAfter:node('ironMireSurveyorAfter','Surveyor Mara Venn','ironMireSurveyor','“The pressure has settled. Take the crew rolls to the Drifter. He can put their names where the families can read them. I’ll keep the receiving works dry.”')
};
export function ironMireConversation(npc,p){
 const owner=p?.questOwner||p,id=npc?.npcId;if(!owner)return null;
 if(id==='ironMireSurveyor')return IRON_MIRE_DIALOGUES[owner.story?.flags?.ironMire?.foremanReleased?'ironMireSurveyorAfter':'ironMireSurveyor'];
 if(id!=='mineDrifter')return null;
 const result=IRON_MIRE_DIALOGUES[owner.quests?.completed?.[IRON_MIRE_QUEST]?'ironMireAfter':owner.quests?.active?.[IRON_MIRE_QUEST]?.currentStageId==='report'?'ironMireReport':owner.quests?.active?.[IRON_MIRE_QUEST]?'ironMireWaiting':'ironMireAssignment'];
 return result;
}
