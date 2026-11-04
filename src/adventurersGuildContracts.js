import {addItem} from './player.js';

const contracts = [
  {id:'elk',boss:'theHollowElk',title:'Blighted Elk · Mirror Grove',gold:120,legacy:'hollowElkPaid',loot:['briarRoot',3]},
  {id:'warden',boss:'theVeyrWarden',title:'Veyr Warden · Castle Veyreign',gold:160,legacy:'veyrWardenPaid',loot:['veyrglassShard',2]},
  {id:'mother',boss:'motherOfBriars',title:'Mother of Briars · Blighted Grove',gold:80},
  {id:'custodian',boss:'alderVerranCustodian',title:'Grafted Custodian · Ashen Orchard',gold:110},
  {id:'foreman',boss:'drownedIronForeman',title:'Drowned Iron Foreman · Iron Mire',gold:200},
  {id:'malakar',boss:'malakarSolgateDemonLord',title:'Malakar · Last Dawn Reliquary',gold:300,legacy:'redSealPaid',loot:['bossCore',1]}
];

function status(player,contract) {
  const record=player.guildBounties?.contracts?.[contract.id];
  if(record?.paid||contract.legacy&&player.guildBounties?.[contract.legacy])return 'paid';
  if(!record)return 'available';
  return (player.bossKills?.[contract.boss]||0)>record.baseline?'ready':'hunting';
}

export function guildContractChoices(player) {
  return contracts.filter(c=>status(player,c)!=='paid').map(c=>{
    const state=status(player,c);
    return {id:'guild-contract-'+c.id,action:'guild-contract-'+c.id,
      text:`${state==='ready'?'Claim':state==='hunting'?'Hunting':'Accept'} · ${c.title} · ${c.gold} gold`,
      disabled:state==='hunting'};
  });
}

export function handleGuildContract(player,action,log) {
  const contract=contracts.find(c=>action==='guild-contract-'+c.id);
  if(!contract)return false;
  const state=status(player,contract);
  if(state==='paid'||state==='hunting')return false;
  const bounties=player.guildBounties ||= {};
  const ledger=bounties.contracts ||= {};
  if(state==='available'){
    ledger[contract.id]={baseline:player.bossKills?.[contract.boss]||0};
    log?.(`Contract accepted: ${contract.title}. Return to the guild after the hunt.`);
  }else{
    ledger[contract.id].paid=true;
    if(contract.legacy)bounties[contract.legacy]=true;
    player.gold+=contract.gold;
    if(contract.loot)addItem(player,...contract.loot);
    log?.(`Contract paid: ${contract.title}. Received ${contract.gold} gold.`);
  }
  return true;
}
