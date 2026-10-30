import {VEYREIGN_CHAPTERS,VEYREIGN_MEMORIES} from './veyreignData.js';
import {applyBloodline,canChooseBloodline} from './bloodlineSystem.js';
import {setStoryFlag} from './storyProgress.js';
export const isVeyreign=w=>w?.dungeonId==='castleVeyr';
export const veyreignParty=p=>[p,...(p?.coop?.players||[]).filter(a=>a.active!==false&&a.joined!==false)];
export const veyreignActorKey=p=>p.veyreignIdentity||=crypto.randomUUID();
export function chooseVeyreignFate(p,w,choice){
 const s=w?.dungeonState?.veyreign,owner=p.questOwner||p;
 if(!isVeyreign(w)||!s?.firstVisit||!s.defeated||!['kill','turn'].includes(choice)||!s.eligible?.includes(veyreignActorKey(p)))return false;
 s.choices||={};const key=veyreignActorKey(p);if(s.choices[key])return false;
 if(choice==='turn'&&(!canChooseBloodline(p,'vampire').ok||!applyBloodline(p,'vampire')))return false;
 s.choices[key]=choice;p.veyreignCompleted=true;p.worldMemory||={};p.worldMemory.veyreignCompleted=true;p.worldMemory.veyreignFate=choice;setStoryFlag(p,'veyreign.resolved');
 // Shared quest completion records the party's conclusion; the curse itself
 // belongs only to the actor who explicitly accepted it.
 setStoryFlag(owner,'veyreign.resolved');return true;
}
export function veyreignConversation(npc,p,w){
 const s=w?.dungeonState?.veyreign;if(npc.npcId!=='lordVeyrShade'&&(!isVeyreign(w)||!s?.firstVisit))return null;
 if(/^veyreignChapter[1-5]$/.test(npc.npcId)){
  const i=Number(npc.npcId.at(-1))-1,c=VEYREIGN_CHAPTERS[i],m=VEYREIGN_MEMORIES[i];
  return {id:`veyreign:chapter${i+1}`,speaker:i===4?'Alistair Veyreign':'Castellan Edrik’s Echo',speakerId:npc.npcId,text:c[0]+'. '+c[2]+(i===4?' “I once opened these gates to save my people. Now I cannot remember their faces. Come. Let us see whether your mercy is stronger than mine.”':''),appendNpcQuestOptions:false,options:[{id:'past',label:m[0],response:m[1]},{id:'price',label:m[2],response:m[3]},{id:'continue',label:i===4?'Your stolen years end tonight.':'I will break this part of the tithe.',close:true}]};
 }
 if(npc.npcId==='veyreignAlistair'){
  const key=veyreignActorKey(p);if(!s.defeated||!s.eligible?.includes(key)||s.choices?.[key])return {id:'veyreign:answered',speaker:'Alistair Veyreign',text:'“Your answer is given. No house, no hunger, no king can take it back.”',options:[{id:'leave',label:'Leave him to his last silence.',close:true}],appendNpcQuestOptions:false};
  return {id:'veyreign:verdict',speaker:'Alistair Veyreign, Vampire Lord',speakerId:'veyreignAlistair',text:'Alistair kneels beneath the broken window. His sword lies beyond his reach. “I called the first feeding mercy. I called the next necessity. Centuries of words, and every one meant someone else must die. You have beaten me. End this house—or take my blood. No obedience. No master. Only the hunger, forever. Each of you must answer for yourself.”',appendNpcQuestOptions:false,options:[{id:'end',label:'I refuse your blood. Your reign ends here.',response:'“Then keep the names you found. Let the valley remember the people, not their lord.” His hand falls away from his heart. The curse dies with its author once the company has answered.',veyreignFate:'kill',closeAfterResponse:true},{id:'curse',label:'[Permanent] Turn me into a vampire. I accept the hunger.',response:'“Then hear the truth before the blood: there is no returning to the life you had. You will wake with my hunger, but your choices will remain your own.” Cold enters your veins. Your eyes burn crimson; fangs press against your lower lip.',veyreignFate:'turn',disabled:!canChooseBloodline(p,'vampire').ok,disabledReason:canChooseBloodline(p,'vampire').reason,closeAfterResponse:true},{id:'wait',label:'I need time. Leave the choice unanswered.',close:true}]};
 }
 if(npc.npcId==='lordVeyrShade'&&((p.questOwner||p).veyreignCompleted||(p.questOwner||p).worldMemory?.veyreignCompleted))return {id:'veyreign:aftermath',speaker:'Castellan Edrik’s Echo',text:'The invitations have turned to dust. Alistair’s reign is finished. Greater vampires still gather in the empty court, but none can offer the blood of its first lord.',options:[{id:'leave',label:'Leave the court to its silence.',close:true}],appendNpcQuestOptions:false};
 if(npc.npcId==='lordVeyrShade')return {id:'veyreign:invitation',speaker:'Castellan Edrik’s Echo',text:'“I kept the invitations. I counted the chairs. I knew what the locked doors meant. Alistair Veyreign still holds court above a valley he has eaten for centuries. Break the banquet seals, recover the servants’ names, silence the aviary, then shatter his borrowed hearts. His final gift will be another name for hunger. Decide what it costs before you accept.”',appendNpcQuestOptions:false,options:[{id:'enter',label:'I will bring his court to an end.',startsQuest:'vampireRedChalice',close:true},{id:'leave',label:'Not yet.',close:true}]};
 return null;
}
