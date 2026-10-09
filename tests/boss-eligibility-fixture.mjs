export const card = (id, rank, suit = '♣') => ({ id, rank, suit });
const run = (id, ranks, suit) => ranks.map(rank => card(`${id}:${rank}`, rank, suit));
export const eligibilityCases = ['ready', 'poor', 'empty_table', 'closed_table', 'small_hands', 'no_stock_dead', 'resources', 'active_zombies', 'corpses', 'repeat_only', 'pressure_poor', 'many_targets', 'active_threats', 'full_resource', 'spent_revives'];
export function eligibilityFixture(engine, definition, phase = 1, kind = 'ready', seed = 1) {
  const state = {
    mode: definition.mode, variant: 'fechado', currentPlayer: 0, turnNumber: 10,
    stock: run('stock', ['3','4','5','6','7'], '♦'), discard: [card('under','Q','♠'),card('top','8','♣')],
    deadPiles: [run('dead',['3','4','5'],'♠'), []], deadChunksTaken: [0,0], deadChunksMax: [1,1],
    players: [0,1].map(id => ({id,name:`Player ${id}`,teamId:0,hand: [
      ...run(`hand:${id}`,['6','7','8'],id ? '♥' : '♣'), card(`keep:${id}`,'K','♦'), card(`spare:${id}`,'4','♠'),
    ]})),
    teams: [{ id:0,playerIndexes:[0,1],melds:[run('meld:0',['3','4','5'],'♣'),run('meld:1',['3','4','5'],'♥')] }, {id:1,playerIndexes:[],melds:[]}],
    boss: engine.createBossState(definition.id,seed), hasDrawnThisTurn:true,
  };
  const boss=state.boss;
  boss.phase=phase; boss.phaseTransitions=Array.from({length:phase},(_,i)=>i+1); boss.phaseIntroPending=null;
  boss.roundNumber=7; boss.starsPlayerId=0; boss.hp=definition.maxHp-200;
  if(['poor','empty_table','closed_table','pressure_poor'].includes(kind)) for(const player of state.players) player.hand=[
    card(`bad:${player.id}:1`,'4','♦'),card(`bad:${player.id}:2`,'8','♠'),card(`bad:${player.id}:3`,'K','♦')];
  if(kind==='empty_table') state.teams[0].melds=[];
  if(kind==='closed_table') state.teams[0].melds=[run('closed',['A','2','3','4','5','6','7','8','9','10','J','Q','K'],'♥').concat(card('last-A','A','♥'))];
  if(kind==='small_hands') for(const player of state.players) player.hand=[card(`single:${player.id}`,'K','♦')];
  if(kind==='no_stock_dead'){state.stock=[];state.deadPiles=[[],[]];state.deadChunksTaken=[1,1];}
  if(['resources','pressure_poor'].includes(kind)) {
    if(boss.id==='dominadora') boss.chainsByPlayer={0:2,1:1};
    else if(boss.id==='nehelenia'){boss.dreamMirrorMarksMigrated=true;boss.dreamMirrorMarksByPlayer={0:1.4,1:0.6};boss.danger=2;}
    else boss.danger=boss.id==='matriarca_esmeralda'?2:40;
  }
  if(kind==='active_zombies'&&boss.id==='nemesis') for(const entity of boss.combatEntities.slice(0,phase)) {entity.status='persistent';entity.hp=entity.maxHp-30;}
  if(kind==='corpses'&&boss.id==='nemesis') for(const [i,entity] of boss.combatEntities.entries()){entity.status='corpse';entity.hp=0;entity.revivals=i===0?1:0;}
  if(kind==='spent_revives'&&boss.id==='nemesis') for(const entity of boss.combatEntities){entity.status='corpse';entity.hp=0;entity.revivals=1;}
  if(kind==='many_targets') for(const player of state.players) player.hand.push(...run(`extra:${player.id}`,['6','7'],player.id?'♣':'♥'));
  if(kind==='active_threats'&&boss.id==='matriarca_esmeralda') {
    engine.normalizeBossState(state);
    const target=engine.inspectBossAbilityEligibility(state,'hungry_root').payload;
    boss.natureThreats=[{id:'existing-root',type:'root',status:'active',teamId:0,meldIndex:target.meldIndex,meldId:target.meldId,fed:false,createdRound:6}];
  }
  if(kind==='full_resource') {boss.hp=definition.maxHp;boss.danger=boss.id==='matriarca_esmeralda'?5:0;state.discard=[];}
  if(kind==='repeat_only') {
    state.players=[];state.teams[0].melds=[];state.discard=[];state.deadPiles=[];
    boss.lastAbilityId=boss.id==='nemesis'?'omega_outbreak':definition.abilities[0].id;
  }
  return state;
}
