// Ember Court: input, turn flow and the screenshot states. The rules
// live in rules.js, the opponent in ai.js, the drawing in render.js —
// this file only wires clicks and keys to them, runs the Warden's turn
// out one action at a time, and builds the four fixed states the
// screenshots are taken from (?shot=title|game|win|loss).
import { CARD_BY_ID } from './cards.js';
import { attack, canPlay, endTurn, newGame, playCard } from './rules.js';
import { planTurn } from './ai.js';
import { renderAll } from './render.js';
import { ensureAudio, playSound, setMuted } from './audio.js';

const params = new URLSearchParams(location.search);
const shotMode = params.get('shot');
const seed = Number(params.get('seed') ?? '7') || 7;

let state = newGame(seed);
const ui = {
  selectedHand: null,
  attackerUid: null,
  hint: 'Click a card in your hand to play it. Click one of your creatures, then an enemy, to attack.',
  titleShown: !shotMode || shotMode === 'title',
};

const refs = {
  rivalHero: document.getElementById('rival-hero'),
  playerHero: document.getElementById('player-hero'),
  rivalHand: document.getElementById('rival-hand'),
  rivalBoard: document.getElementById('rival-board'),
  playerBoard: document.getElementById('player-board'),
  playerHand: document.getElementById('player-hand'),
  turnLabel: document.getElementById('turn-label'),
  log: document.getElementById('log'),
  endTurn: document.getElementById('end-turn'),
  hint: document.getElementById('hint'),
  winOverlay: document.getElementById('win-overlay'),
  loseOverlay: document.getElementById('lose-overlay'),
  winStats: document.getElementById('win-stats'),
  loseStats: document.getElementById('lose-stats'),
  titleOverlay: document.getElementById('title-overlay'),
};

function render() { renderAll(state, ui, refs); }

function cancelSelection() {
  ui.selectedHand = null;
  ui.attackerUid = null;
  ui.hint = 'Click a card in your hand to play it. Click one of your creatures, then an enemy, to attack.';
}

function myTurn() { return state.phase === 'playing' && state.active === 'player'; }

function spellNeedsTarget(def) {
  return def.kind === 'spell' && ['any', 'creature', 'ally'].includes(def.target);
}

function castSelected(handIndex, target) {
  const ok = playCard(state, 'player', handIndex, target);
  if (ok) playSound('spell');
  else playSound('error');
  cancelSelection();
  render();
  return ok;
}

function handleHandCard(index) {
  if (!myTurn()) return;
  const handCard = state.player.hand[index];
  if (!handCard) return;
  const def = CARD_BY_ID[handCard.cardId];
  if (!canPlay(state, 'player', index)) { playSound('error'); return; }
  ensureAudio();
  if (def.kind === 'creature') {
    if (playCard(state, 'player', index, null)) playSound('play');
    cancelSelection();
    render();
    return;
  }
  if (!spellNeedsTarget(def)) {
    if (playCard(state, 'player', index, def.target === 'all-enemies' ? { kind: 'all-enemies' } : null)) playSound('spell');
    cancelSelection();
    render();
    return;
  }
  ui.selectedHand = index;
  ui.attackerUid = null;
  ui.hint = def.target === 'ally'
    ? `Choose one of your creatures for ${def.name}.`
    : `Choose a target for ${def.name} — an enemy creature, or the Warden.`;
  playSound('select');
  render();
}

function handleOwnCreature(uid) {
  if (!myTurn()) return;
  ensureAudio();
  // A targeting spell aimed at an ally.
  if (ui.selectedHand !== null) {
    const def = CARD_BY_ID[state.player.hand[ui.selectedHand].cardId];
    if (def.target === 'ally') { castSelected(ui.selectedHand, { kind: 'creature', uid }); return; }
  }
  const c = state.player.board.find((x) => x.uid === uid);
  if (!c) return;
  if (!c.ready) { playSound('error'); ui.hint = `${CARD_BY_ID[c.cardId].name} is resting — it attacks next turn.`; render(); return; }
  ui.attackerUid = uid;
  ui.selectedHand = null;
  ui.hint = `Attack with ${CARD_BY_ID[c.cardId].name}: click an enemy creature, or the Warden. Esc cancels.`;
  playSound('select');
  render();
}

function handleEnemyCreature(uid) {
  if (!myTurn()) return;
  if (ui.attackerUid !== null) {
    if (attack(state, 'player', ui.attackerUid, { kind: 'creature', uid })) playSound('attack');
    else playSound('error');
    cancelSelection();
    render();
    return;
  }
  if (ui.selectedHand !== null) {
    const def = CARD_BY_ID[state.player.hand[ui.selectedHand].cardId];
    if (def.target === 'any' || def.target === 'creature') { castSelected(ui.selectedHand, { kind: 'creature', uid }); return; }
  }
}

function handleFace(side) {
  if (!myTurn()) return;
  if (side === 'rival') {
    if (ui.attackerUid !== null) {
      if (attack(state, 'player', ui.attackerUid, { kind: 'face' })) playSound('attack');
      else playSound('error');
      cancelSelection();
      render();
      return;
    }
    if (ui.selectedHand !== null) {
      const def = CARD_BY_ID[state.player.hand[ui.selectedHand].cardId];
      if (def.target === 'any') { castSelected(ui.selectedHand, { kind: 'face', side: 'player' === 'player' ? 'rival' : 'player' }); return; }
    }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runRivalTurn() {
  if (state.phase !== 'playing' || state.active !== 'rival') return;
  await sleep(500);
  const actions = planTurn(state);
  for (const action of actions) {
    if (state.phase !== 'playing' && action.type !== 'end') break;
    if (action.type === 'play') {
      const def = CARD_BY_ID[state.rival.hand[action.handIndex]?.cardId];
      if (def && playCard(state, 'rival', action.handIndex, action.target)) playSound(def.kind === 'spell' ? 'spell' : 'play');
    } else if (action.type === 'attack') {
      if (attack(state, 'rival', action.uid, action.target)) playSound('attack');
    }
    render();
    await sleep(650);
    if (state.phase === 'over') break;
  }
  if (state.phase === 'playing' && state.active === 'rival') {
    endTurn(state);
    playSound('turn');
  }
  render();
}

function doEndTurn() {
  if (!myTurn()) return;
  cancelSelection();
  endTurn(state);
  playSound('turn');
  render();
  runRivalTurn();
}

function restart(newSeed) {
  state = newGame(newSeed ?? Math.floor(Math.random() * 100000));
  cancelSelection();
  ui.titleShown = false;
  refs.titleOverlay.classList.remove('show');
  render();
}

// Clicks, delegated from the table.
document.getElementById('table').addEventListener('click', (event) => {
  const handCard = event.target.closest('[data-hand-index]');
  if (handCard) { handleHandCard(Number(handCard.dataset.handIndex)); return; }
  const boardCard = event.target.closest('[data-uid]');
  if (boardCard) {
    const uid = Number(boardCard.dataset.uid);
    if (boardCard.closest('#player-board')) handleOwnCreature(uid);
    else if (boardCard.closest('#rival-board')) handleEnemyCreature(uid);
    return;
  }
  const face = event.target.closest('[data-target]');
  if (face) { handleFace(face.dataset.target === 'face-rival' ? 'rival' : 'player'); return; }
  cancelSelection();
  render();
});

refs.endTurn.addEventListener('click', doEndTurn);
document.getElementById('play-button').addEventListener('click', () => {
  ensureAudio();
  ui.titleShown = false;
  refs.titleOverlay.classList.remove('show');
  render();
});
document.getElementById('how-button').addEventListener('click', () => {
  document.getElementById('how-panel').classList.toggle('show');
});
document.getElementById('mute-button').addEventListener('click', (event) => {
  const btn = event.currentTarget;
  const nowMuted = btn.dataset.muted !== 'true';
  btn.dataset.muted = String(nowMuted);
  btn.textContent = nowMuted ? 'Sound: off' : 'Sound: on';
  setMuted(nowMuted);
});
for (const id of ['restart-win', 'restart-lose']) {
  document.getElementById(id).addEventListener('click', () => restart());
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { cancelSelection(); render(); return; }
  if (ui.titleShown) {
    if (event.key === 'Enter' || event.key === ' ') {
      document.getElementById('play-button').click();
    }
    return;
  }
  if (event.key === 'e' || event.key === 'E') { doEndTurn(); return; }
  if (event.key === 'r' || event.key === 'R') { if (state.phase === 'over') restart(); return; }
  const num = Number(event.key);
  if (num >= 1 && num <= 9) { handleHandCard(num - 1); return; }
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    const n = state.player.hand.length;
    if (n === 0) return;
    ui.selectedHand = ui.selectedHand === null
      ? (event.key === 'ArrowRight' ? 0 : n - 1)
      : (ui.selectedHand + (event.key === 'ArrowRight' ? 1 : -1) + n) % n;
    render();
  }
  if (event.key === 'Enter' && ui.selectedHand !== null) handleHandCard(ui.selectedHand);
});

// Fixed states for the screenshots: real renders of the game's own
// state, reached through the same state the game plays with.
function buildShotState(mode) {
  if (mode === 'game' || mode === 'win' || mode === 'loss') {
    const s = newGame(7);
    s.turn = 5;
    s.player.life = 17; s.rival.life = 14;
    s.player.mana = 5; s.player.manaMax = 5;
    s.rival.mana = 4; s.rival.manaMax = 4;
    // Hands: five readable cards for the player, four backs for the rival.
    s.player.hand = [
      { cardId: 'ember-drake', uid: 101 }, { cardId: 'tide-mend', uid: 102 },
      { cardId: 'grove-guardian', uid: 103 }, { cardId: 'stone-ward', uid: 104 },
      { cardId: 'cinder-imp', uid: 105 },
    ];
    s.rival.hand = [
      { cardId: 'wave-serpent', uid: 201 }, { cardId: 'quarry-brute', uid: 202 },
      { cardId: 'ember-bolt', uid: 203 }, { cardId: 'sproutling', uid: 204 },
    ];
    s.player.board = [
      { uid: 301, cardId: 'flame-acolyte', atk: 3, hp: 2, maxHp: 2, keywords: [], ready: true, justPlayed: false },
      { uid: 302, cardId: 'pyre-warden', atk: 2, hp: 4, maxHp: 4, keywords: ['guard'], ready: true, justPlayed: false },
      { uid: 303, cardId: 'wave-serpent', atk: 3, hp: 3, maxHp: 3, keywords: [], ready: false, justPlayed: true },
    ];
    s.rival.board = [
      { uid: 401, cardId: 'stone-sentinel', atk: 1, hp: 5, maxHp: 5, keywords: ['guard'], ready: true, justPlayed: false },
      { uid: 402, cardId: 'blood-ember', atk: 3, hp: 2, maxHp: 2, keywords: ['drain'], ready: true, justPlayed: false },
    ];
    s.log = ['The Warden plays Blood Ember (3/2).', 'You play Pyre Warden (2/4).', 'Turn 5: your move.'];
    s.player.deck.length = 25;
    s.rival.deck.length = 26;
    if (mode === 'win') { s.phase = 'over'; s.winner = 'player'; s.rival.life = 0; }
    if (mode === 'loss') { s.phase = 'over'; s.winner = 'rival'; s.player.life = 0; }
    return s;
  }
  return null;
}

if (shotMode) {
  const shotState = buildShotState(shotMode);
  if (shotState) state = shotState;
  if (shotMode === 'game' || shotMode === 'win' || shotMode === 'loss') {
    ui.titleShown = false;
    refs.titleOverlay.classList.remove('show');
  }
  if (shotMode === 'title') {
    refs.titleOverlay.classList.add('show');
  }
} else {
  refs.titleOverlay.classList.add('show');
}
if (state.phase === 'over' && state.winner === 'player') playSound('win');
if (state.phase === 'over' && state.winner === 'rival') playSound('lose');
render();
