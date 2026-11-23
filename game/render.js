// Ember Court: everything the player sees. renderAll rebuilds the
// table from the game state on every change, so what is on screen is
// always exactly the state of the rules. Cards are DOM elements, sized
// and coloured to stay readable at thumbnail size: big cost, attack and
// health numbers, a suit glyph and colour that carry the suit without
// the text.
import { CARD_BY_ID, SUITS } from './cards.js';

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function cardElement(def, opts = {}) {
  const suit = SUITS[def.suit];
  const card = el('div', 'card suit-' + def.suit);
  card.style.setProperty('--suit', suit.color);
  card.style.setProperty('--suit-light', suit.light);
  if (opts.small) card.classList.add('small');
  if (opts.selected) card.classList.add('selected');
  if (opts.playable) card.classList.add('playable');
  if (opts.attacker) card.classList.add('attacker');
  if (opts.dim) card.classList.add('dim');
  if (opts.fresh) card.classList.add('dealt');
  if (opts.uid !== undefined) card.dataset.uid = String(opts.uid);
  if (opts.handIndex !== undefined) card.dataset.handIndex = String(opts.handIndex);

  const cost = el('div', 'cost', String(def.cost));
  card.append(cost);
  const glyph = el('div', 'art', suit.glyph);
  card.append(glyph);
  const name = el('div', 'name', def.name);
  card.append(name);
  const kind = el('div', 'kind', def.kind === 'spell' ? 'Spell' : SUITS[def.suit].name);
  card.append(kind);
  if (def.text) card.append(el('div', 'text', def.text));
  if (def.kind === 'creature') {
    const stats = el('div', 'stats');
    stats.append(el('span', 'atk', String(opts.atk ?? def.atk)));
    stats.append(el('span', 'hp', String(opts.hp ?? def.hp)));
    card.append(stats);
    if ((opts.keywords ?? def.keywords).length > 0) {
      card.append(el('div', 'keywords', (opts.keywords ?? def.keywords).join(' · ').toUpperCase()));
    }
    if (opts.ready === false) card.append(el('div', 'sleep', 'RESTING'));
  }
  return card;
}

function heroElement(label, side, isActive) {
  const hero = el('div', 'hero' + (isActive ? ' active' : ''));
  hero.append(el('div', 'hero-name', label));
  const life = el('div', 'life', '♥ ' + side.life);
  life.title = 'Life total';
  hero.append(life);
  const mana = el('div', 'mana');
  for (let i = 0; i < 10; i++) {
    mana.append(el('span', 'pip' + (i < side.mana ? ' filled' : '') + (i < side.manaMax ? '' : ' empty')));
  }
  hero.append(mana);
  hero.append(el('div', 'deck-count', `Deck ${side.deck.length} · Hand ${side.hand.length}`));
  return hero;
}

export function renderAll(state, ui, refs) {
  // Heroes.
  refs.rivalHero.replaceChildren(heroElement('The Warden', state.rival, state.active === 'rival'));
  refs.playerHero.replaceChildren(heroElement('You', state.player, state.active === 'player'));
  refs.rivalHero.querySelector('.hero').dataset.target = 'face-rival';
  refs.playerHero.querySelector('.hero').dataset.target = 'face-player';

  // Rival hand: face-down backs, so the opponent's hand is visible as a
  // row of cards without revealing its values.
  refs.rivalHand.replaceChildren();
  state.rival.hand.forEach(() => {
    const back = el('div', 'card-back');
    back.append(el('span', 'back-glyph', '◆'));
    refs.rivalHand.append(back);
  });
  refs.rivalHand.append(el('div', 'hand-count', `${state.rival.hand.length} cards`));

  // Boards.
  renderBoard(state.rival.board, refs.rivalBoard, ui, false);
  renderBoard(state.player.board, refs.playerBoard, ui, true);

  // Player hand.
  refs.playerHand.replaceChildren();
  state.player.hand.forEach((handCard, i) => {
    const def = CARD_BY_ID[handCard.cardId];
    const affordable = def.cost <= state.player.mana && state.active === 'player' && state.phase === 'playing';
    const cardEl = cardElement(def, {
      handIndex: i,
      selected: ui.selectedHand === i,
      playable: affordable,
      dim: !affordable,
    });
    refs.playerHand.append(cardEl);
  });

  // Turn banner, log and controls.
  refs.turnLabel.textContent = `Turn ${state.turn} · ${state.active === 'player' ? 'Your turn' : "The Warden's turn"}`;
  refs.log.replaceChildren();
  state.log.forEach((line) => refs.log.append(el('div', 'log-line', line)));
  refs.endTurn.disabled = !(state.active === 'player' && state.phase === 'playing');
  refs.hint.textContent = ui.hint;

  // End screens.
  refs.winOverlay.classList.toggle('show', state.phase === 'over' && state.winner === 'player');
  refs.loseOverlay.classList.toggle('show', state.phase === 'over' && state.winner === 'rival');
  if (state.phase === 'over' && state.winner === 'player') {
    refs.winStats.textContent = `The Warden falls on turn ${state.turn}. Your court: ${state.player.life} life left.`;
  }
  if (state.phase === 'over' && state.winner === 'rival') {
    refs.loseStats.textContent = `The Warden wins on turn ${state.turn} with ${state.rival.life} life left.`;
  }
}

function renderBoard(board, container, ui, isPlayer) {
  container.replaceChildren();
  if (board.length === 0) {
    container.append(el('div', 'board-empty', isPlayer ? 'Your side of the table — play a creature here.' : 'The Warden has no creatures out.'));
    return;
  }
  board.forEach((c) => {
    const def = CARD_BY_ID[c.cardId];
    const cardEl = cardElement(def, {
      uid: c.uid,
      atk: c.atk,
      hp: c.hp,
      keywords: c.keywords,
      ready: c.ready,
      attacker: ui.attackerUid === c.uid,
      fresh: c.justPlayed,
    });
    container.append(cardEl);
  });
}
