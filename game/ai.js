// Ember Court: the Warden. A readable opponent: it plays its best
// cards, takes lethal when it sees it, kills guards, trades up, and
// otherwise goes for the player's life total. Its choices are plain
// heuristics over the same rules the player uses, so a player can read
// them and plan around them.
import { CARD_BY_ID } from './cards.js';
import { attack, canPlay, playCard } from './rules.js';

function spellValue(state, def) {
  const eff = def.effect ?? {};
  let v = def.cost + 1;
  if (eff.damage) v += eff.damage * 2;
  if (eff.heal) v += eff.heal / 2;
  if (eff.draw) v += eff.draw * 2;
  return v;
}

export function planTurn(state) {
  // Plan on a copy, so the live game only changes when the actions are
  // played out one by one with their animations.
  const sim = structuredClone(state);
  const actions = [];
  const rival = sim.rival;
  const player = sim.player;

  // Lethal by spell first: Ember Bolt to the face when it ends the game.
  const boltIndex = rival.hand.findIndex((c) => CARD_BY_ID[c.cardId].id === 'ember-bolt');
  if (boltIndex >= 0 && canPlay(sim, 'rival', boltIndex)) {
    const faceDamage = rival.board.filter((c) => c.ready).reduce((s, c) => s + c.atk, 0) + 3;
    if (faceDamage >= player.life) {
      actions.push({ type: 'play', handIndex: boltIndex, target: { kind: 'face', side: 'player' } });
    }
  }

  // Play cards, best value first, while anything affordable remains.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let best = -1, bestValue = -1;
    rival.hand.forEach((card, i) => {
      if (!canPlay(sim, 'rival', i)) return;
      const def = CARD_BY_ID[card.cardId];
      let v = def.kind === 'creature' ? def.cost * 2 + def.atk + def.hp : spellValue(state, def);
      if (def.keywords.includes('guard')) v += 1;
      if (def.keywords.includes('charge')) v += 1;
      // Do not waste a heal at full life, or a draw spell with a full hand.
      if (def.effect?.heal && rival.life >= 19) v -= 6;
      if (def.effect?.draw && rival.hand.length >= 8) v -= 4;
      if (v > bestValue) { bestValue = v; best = i; }
    });
    if (best < 0) break;
    const def = CARD_BY_ID[rival.hand[best].cardId];
    let target = null;
    if (def.kind === 'spell') {
      if (def.target === 'any' || def.target === 'creature') {
        // Thorn Volley / Bolt: remove the biggest threat it can kill.
        const prey = player.board.filter((c) => c.hp <= (def.effect.damage ?? 0))
          .sort((a, b) => b.atk - a.atk)[0];
        target = prey ? { kind: 'creature', uid: prey.uid } : { kind: 'face', side: 'player' };
      } else if (def.target === 'ally') {
        const ally = rival.board.slice().sort((a, b) => b.hp - a.hp)[0];
        if (!ally) break;
        target = { kind: 'creature', uid: ally.uid };
      } else if (def.target === 'all-enemies') {
        target = { kind: 'all-enemies' };
      }
    }
    actions.push({ type: 'play', handIndex: best, target });
    // Apply it now so the next choice sees the new board and mana.
    playCard(sim, 'rival', best, target);
    if (sim.phase !== 'playing') break;
  }

  // Attacks, in the order the board shows them.
  for (const attacker of rival.board.slice()) {
    if (sim.phase !== 'playing' || !attacker.ready) continue;
    const faceDamage = rival.board.filter((c) => c.ready).reduce((s, c) => s + c.atk, 0);
    const guards = player.board.filter((c) => c.keywords.includes('guard'));
    let target;
    if (faceDamage >= player.life) {
      target = { kind: 'face' };
    } else if (guards.length > 0) {
      // Kill the guard it can kill most cheaply, with the weakest attacker
      // that still does the job, so big attackers stay free.
      const guard = guards.slice().sort((a, b) => a.hp - b.hp)[0];
      target = { kind: 'creature', uid: guard.uid };
    } else {
      const trade = player.board
        .filter((c) => c.hp <= attacker.atk && c.atk < attacker.hp)
        .sort((a, b) => b.atk - a.atk)[0];
      if (trade) target = { kind: 'creature', uid: trade.uid };
      else if (player.board.length === 0 || attacker.atk >= 3) target = { kind: 'face' };
      else {
        const weakest = player.board.slice().sort((a, b) => a.hp - b.hp)[0];
        target = weakest ? { kind: 'creature', uid: weakest.uid } : { kind: 'face' };
      }
    }
    actions.push({ type: 'attack', uid: attacker.uid, target });
    attack(sim, 'rival', attacker.uid, target);
    if (sim.phase !== 'playing') break;
  }
  actions.push({ type: 'end' });
  return actions;
}
