// Ember Court: the rules. Pure state transitions — no DOM here, so the
// AI and the screenshot states can drive the same game the player plays.
// A side is { life, mana, manaMax, deck, hand, board, fatigue }.
// A board creature is { uid, cardId, atk, hp, maxHp, keywords, ready,
// justPlayed }.
import { CARD_BY_ID, DECK_RECIPE, mulberry32, shuffle } from './cards.js';

let uidCounter = 1;

export function newCreature(cardId) {
  const def = CARD_BY_ID[cardId];
  return {
    uid: uidCounter++,
    cardId,
    atk: def.atk,
    hp: def.hp,
    maxHp: def.hp,
    keywords: def.keywords.slice(),
    ready: def.keywords.includes('charge'),
    justPlayed: true,
  };
}

export function newSide(seed) {
  const rng = mulberry32(seed);
  return {
    life: 20,
    mana: 0,
    manaMax: 0,
    deck: shuffle(DECK_RECIPE, rng).map((id) => ({ cardId: id, uid: uidCounter++ })),
    hand: [],
    board: [],
    fatigue: 0,
  };
}

export function newGame(seed = 1) {
  uidCounter = 1;
  const state = {
    seed,
    turn: 1,
    active: 'player',
    phase: 'playing',
    winner: null,
    log: [],
    player: newSide(seed),
    rival: newSide(seed + 7919),
  };
  drawCards(state, 'player', 3);
  drawCards(state, 'rival', 3);
  startTurn(state, 'player');
  return state;
}

export function log(state, text) {
  state.log.unshift(text);
  state.log.length = Math.min(state.log.length, 5);
}

export function drawCards(state, sideName, n) {
  const side = state[sideName];
  for (let i = 0; i < n; i++) {
    if (side.deck.length === 0) {
      side.fatigue += 1;
      side.life -= side.fatigue;
      log(state, `${sideName === 'player' ? 'You' : 'The Warden'} take ${side.fatigue} fatigue damage — the deck is empty.`);
      if (side.life <= 0) { endGame(state, sideName === 'player' ? 'rival' : 'player'); return; }
      continue;
    }
    const card = side.deck.pop();
    if (side.hand.length >= 10) {
      log(state, 'A drawn card burns — the hand is full.');
      continue;
    }
    side.hand.push(card);
  }
}

export function startTurn(state, sideName) {
  const side = state[sideName];
  state.active = sideName;
  side.manaMax = Math.min(10, side.manaMax + 1);
  side.mana = side.manaMax;
  for (const c of side.board) { c.ready = true; c.justPlayed = false; }
  drawCards(state, sideName, 1);
  if (state.phase === 'playing') {
    log(state, sideName === 'player' ? `Turn ${state.turn}: your move.` : `Turn ${state.turn}: the Warden moves.`);
  }
}

export function endTurn(state) {
  if (state.phase !== 'playing') return;
  const next = state.active === 'player' ? 'rival' : 'player';
  if (next === 'player') state.turn += 1;
  startTurn(state, next);
}

export function endGame(state, winner) {
  if (state.phase === 'over') return;
  state.phase = 'over';
  state.winner = winner;
  log(state, winner === 'player' ? 'Victory! The Ember Court is yours.' : 'Defeat. The Warden keeps the court.');
}

export function canPlay(state, sideName, handIndex) {
  const side = state[sideName];
  const card = side.hand[handIndex];
  if (!card || state.phase !== 'playing' || state.active !== sideName) return false;
  return CARD_BY_ID[card.cardId].cost <= side.mana;
}

// Plays a hand card. For creatures, no target is needed. For spells,
// target is { kind: 'face', side } | { kind: 'creature', uid } | null
// for self / all-enemy spells. Returns true when the card was played.
export function playCard(state, sideName, handIndex, target) {
  if (!canPlay(state, sideName, handIndex)) return false;
  const side = state[sideName];
  const foe = state[sideName === 'player' ? 'rival' : 'player'];
  const [card] = side.hand.splice(handIndex, 1);
  const def = CARD_BY_ID[card.cardId];
  side.mana -= def.cost;
  if (def.kind === 'creature') {
    const creature = newCreature(def.id);
    side.board.push(creature);
    log(state, `${sideName === 'player' ? 'You play' : 'The Warden plays'} ${def.name} (${def.atk}/${def.hp}).`);
    return true;
  }
  // Spell.
  const eff = def.effect ?? {};
  if (eff.damage && target) {
    if (target.kind === 'face') {
      const hit = state[target.side];
      hit.life -= eff.damage;
      log(state, `${def.name} hits ${target.side === 'player' ? 'you' : 'the Warden'} for ${eff.damage}.`);
      if (hit.life <= 0) endGame(state, target.side === 'player' ? 'rival' : 'player');
    } else if (target.kind === 'creature') {
      const owner = foe.board.some((c) => c.uid === target.uid) ? foe : side;
      damageCreature(state, owner, target.uid, eff.damage);
    } else if (target.kind === 'all-enemies') {
      for (const c of foe.board.slice()) damageCreature(state, foe, c.uid, eff.damage);
    }
  }
  if (eff.heal) {
    side.life = Math.min(20, side.life + eff.heal);
    log(state, `${def.name} restores ${eff.heal} life.`);
  }
  if (eff.draw) drawCards(state, sideName, eff.draw);
  if (eff.buffHp && target && target.kind === 'creature') {
    const c = side.board.find((x) => x.uid === target.uid);
    if (c) {
      c.maxHp += eff.buffHp; c.hp += eff.buffHp;
      if (eff.guard && !c.keywords.includes('guard')) c.keywords.push('guard');
      log(state, `${def.name} fortifies ${CARD_BY_ID[c.cardId].name}.`);
    }
  }
  return true;
}

export function damageCreature(state, owner, uid, amount) {
  const c = owner.board.find((x) => x.uid === uid);
  if (!c) return;
  c.hp -= amount;
  if (c.hp <= 0) {
    owner.board = owner.board.filter((x) => x.uid !== uid);
    log(state, `${CARD_BY_ID[c.cardId].name} falls.`);
  }
}

export function guardBlocks(state, sideName, targetUid) {
  const foe = state[sideName === 'player' ? 'rival' : 'player'];
  const guards = foe.board.filter((c) => c.keywords.includes('guard'));
  if (guards.length === 0) return false;
  return !guards.some((c) => c.uid === targetUid);
}

// One creature attacks one target: an enemy creature, or the enemy face.
// Both creatures deal their attack to each other. Drain heals its owner
// for the damage its creature deals.
export function attack(state, sideName, attackerUid, target) {
  if (state.phase !== 'playing' || state.active !== sideName) return false;
  const side = state[sideName];
  const foe = state[sideName === 'player' ? 'rival' : 'player'];
  const attacker = side.board.find((c) => c.uid === attackerUid);
  if (!attacker || !attacker.ready) return false;
  if (target.kind === 'creature') {
    if (guardBlocks(state, sideName, target.uid)) return false;
    const defender = foe.board.find((c) => c.uid === target.uid);
    if (!defender) return false;
    const atkDmg = attacker.atk, defDmg = defender.atk;
    defender.hp -= atkDmg;
    attacker.hp -= defDmg;
    if (attacker.keywords.includes('drain') && atkDmg > 0) side.life = Math.min(20, side.life + atkDmg);
    log(state, `${CARD_BY_ID[attacker.cardId].name} strikes ${CARD_BY_ID[defender.cardId].name} for ${atkDmg}.`);
    side.board = side.board.filter((c) => c.hp > 0);
    foe.board = foe.board.filter((c) => c.hp > 0);
    attacker.ready = false;
    if (foe.life <= 0) endGame(state, sideName);
    return true;
  }
  if (target.kind === 'face') {
    if (guardBlocks(state, sideName, -1)) return false;
    foe.life -= attacker.atk;
    if (attacker.keywords.includes('drain')) side.life = Math.min(20, side.life + attacker.atk);
    log(state, `${CARD_BY_ID[attacker.cardId].name} hits ${sideName === 'player' ? 'the Warden' : 'you'} for ${attacker.atk}.`);
    attacker.ready = false;
    if (foe.life <= 0) endGame(state, sideName);
    return true;
  }
  return false;
}

export function hasLegalMove(state, sideName) {
  const side = state[sideName];
  if (side.hand.some((_, i) => canPlay(state, sideName, i))) return true;
  return side.board.some((c) => c.ready);
}
