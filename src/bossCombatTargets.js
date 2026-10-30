import {getEnemyTargetablePlayers} from './coopEnemyScaling.js';

export function getBossCombatTargets(player) {
 const players=getEnemyTargetablePlayers(player).filter(p=>p.joined!==false);
 const owners=[...new Set([player,...(player?.coop?.players||[]),...players])].filter(p=>p&&p.active!==false&&p.joined!==false);
 return [...new Set([...players,...owners.flatMap(p=>(p.summons||[]).filter(s=>s&&s.hp>0&&s.alive!==false&&!s.dead&&!s.dismissed))])];
}

// Player pressure remains the norm regardless of how many minions are alive.
export function selectBossAttackTarget(enemy,player,turn=0) {
 const players=getEnemyTargetablePlayers(player).filter(p=>p.joined!==false);
 const summons=getBossCombatTargets(player).filter(t=>!players.includes(t));
 if(summons.length&&(!players.length||turn%4===3))return summons.reduce((a,b)=>Math.hypot(b.x-enemy.x,b.y-enemy.y)<Math.hypot(a.x-enemy.x,a.y-enemy.y)?b:a);
 const playerTurn=summons.length?turn-Math.floor(turn/4):turn;
 return players[playerTurn%Math.max(1,players.length)]||null;
}
