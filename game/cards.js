// Ember Court: every card in the game. Four courts, told apart by
// colour and shape as well as by name: Ember (red flame), Tide (blue
// wave), Grove (green leaf) and Stone (amber diamond). A card is a plain
// definition; a card in play is an instance built from it in rules.js.
export const SUITS = {
  ember: { name: 'Ember', glyph: '▲', color: '#e5482f', light: '#ff7a59' },
  tide: { name: 'Tide', glyph: '●', color: '#2f7de5', light: '#6aa8ff' },
  grove: { name: 'Grove', glyph: '✦', color: '#3d9b4f', light: '#6cc47f' },
  stone: { name: 'Stone', glyph: '◆', color: '#c98a2d', light: '#e5b15c' },
};

// Keywords: charge (attack the turn it is played), guard (must be
// attacked before anything else), drain (its controller heals for the
// damage it deals in combat).
export const CARDS = [
  { id: 'cinder-imp', name: 'Cinder Imp', suit: 'ember', kind: 'creature', cost: 1, atk: 2, hp: 1, keywords: [], text: 'Quick and careless.' },
  { id: 'flame-acolyte', name: 'Flame Acolyte', suit: 'ember', kind: 'creature', cost: 2, atk: 3, hp: 2, keywords: [], text: 'She tends the court fire.' },
  { id: 'pyre-warden', name: 'Pyre Warden', suit: 'ember', kind: 'creature', cost: 3, atk: 2, hp: 4, keywords: ['guard'], text: 'Guard. The fire stands in the way.' },
  { id: 'blood-ember', name: 'Blood Ember', suit: 'ember', kind: 'creature', cost: 3, atk: 3, hp: 2, keywords: ['drain'], text: 'Drain. Its wounds feed its court.' },
  { id: 'ember-drake', name: 'Ember Drake', suit: 'ember', kind: 'creature', cost: 4, atk: 5, hp: 4, keywords: ['charge'], text: 'Charge. It arrives already burning.' },
  { id: 'ember-bolt', name: 'Ember Bolt', suit: 'ember', kind: 'spell', cost: 2, atk: 0, hp: 0, keywords: [], text: 'Deal 3 damage to any target.', target: 'any', effect: { damage: 3 } },
  { id: 'tidecaller', name: 'Tidecaller', suit: 'tide', kind: 'creature', cost: 2, atk: 2, hp: 3, keywords: [], text: 'The tide answers when called.' },
  { id: 'leech-eel', name: 'Leech Eel', suit: 'tide', kind: 'creature', cost: 3, atk: 2, hp: 3, keywords: ['drain'], text: 'Drain. It drinks the fight.' },
  { id: 'tidal-shield', name: 'Tidal Shield', suit: 'tide', kind: 'creature', cost: 2, atk: 1, hp: 4, keywords: ['guard'], text: 'Guard. A wall that flows.' },
  { id: 'wave-serpent', name: 'Wave Serpent', suit: 'tide', kind: 'creature', cost: 3, atk: 3, hp: 3, keywords: [], text: 'It crests over the table.' },
  { id: 'deep-leviathan', name: 'Deep Leviathan', suit: 'tide', kind: 'creature', cost: 6, atk: 6, hp: 6, keywords: [], text: 'The whole sea, in one card.' },
  { id: 'tide-mend', name: 'Tide Mend', suit: 'tide', kind: 'spell', cost: 2, atk: 0, hp: 0, keywords: [], text: 'Restore 5 life to your court.', target: 'self', effect: { heal: 5 } },
  { id: 'sproutling', name: 'Sproutling', suit: 'grove', kind: 'creature', cost: 1, atk: 1, hp: 2, keywords: [], text: 'Small roots, deep patience.' },
  { id: 'thorn-archer', name: 'Thorn Archer', suit: 'grove', kind: 'creature', cost: 2, atk: 3, hp: 1, keywords: ['charge'], text: 'Charge. Thorns fly first.' },
  { id: 'grove-guardian', name: 'Grove Guardian', suit: 'grove', kind: 'creature', cost: 4, atk: 3, hp: 5, keywords: ['guard'], text: 'Guard. The forest closes ranks.' },
  { id: 'ancient-oak', name: 'Ancient Oak', suit: 'grove', kind: 'creature', cost: 5, atk: 2, hp: 7, keywords: ['guard'], text: 'Guard. Older than the court itself.' },
  { id: 'grove-call', name: 'Grove Call', suit: 'grove', kind: 'spell', cost: 2, atk: 0, hp: 0, keywords: [], text: 'Draw 2 cards.', target: 'self', effect: { draw: 2 } },
  { id: 'thorn-volley', name: 'Thorn Volley', suit: 'grove', kind: 'spell', cost: 3, atk: 0, hp: 0, keywords: [], text: 'Deal 2 damage to an enemy creature.', target: 'creature', effect: { damage: 2 } },
  { id: 'pebble-golem', name: 'Pebble Golem', suit: 'stone', kind: 'creature', cost: 2, atk: 2, hp: 3, keywords: [], text: 'It was a mountain, once.' },
  { id: 'stone-sentinel', name: 'Stone Sentinel', suit: 'stone', kind: 'creature', cost: 3, atk: 1, hp: 5, keywords: ['guard'], text: 'Guard. It does not move. Ever.' },
  { id: 'quarry-brute', name: 'Quarry Brute', suit: 'stone', kind: 'creature', cost: 4, atk: 4, hp: 3, keywords: [], text: 'It carries the whole quarry.' },
  { id: 'mountain-king', name: 'Mountain King', suit: 'stone', kind: 'creature', cost: 6, atk: 5, hp: 7, keywords: [], text: 'The court bows to stone.' },
  { id: 'stone-ward', name: 'Stone Ward', suit: 'stone', kind: 'spell', cost: 1, atk: 0, hp: 0, keywords: [], text: 'Give one of your creatures +3 health and Guard.', target: 'ally', effect: { buffHp: 3, guard: true } },
  { id: 'quake', name: 'Quake', suit: 'stone', kind: 'spell', cost: 4, atk: 0, hp: 0, keywords: [], text: 'Deal 2 damage to all enemy creatures.', target: 'all-enemies', effect: { damage: 2 } },
];

export const CARD_BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c]));

// Thirty cards: two of most, one of each six-cost finisher.
export const DECK_RECIPE = [
  'cinder-imp', 'cinder-imp', 'flame-acolyte', 'flame-acolyte',
  'pyre-warden', 'pyre-warden', 'blood-ember', 'ember-drake',
  'ember-bolt', 'ember-bolt', 'tidecaller', 'tidecaller',
  'leech-eel', 'tidal-shield', 'tidal-shield', 'wave-serpent',
  'wave-serpent', 'deep-leviathan', 'tide-mend', 'sproutling',
  'sproutling', 'thorn-archer', 'grove-guardian', 'ancient-oak',
  'grove-call', 'thorn-volley', 'pebble-golem', 'stone-sentinel',
  'quarry-brute', 'mountain-king',
];

// Deterministic shuffleable random source, so a seeded game replays
// exactly the same way.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(array, rng) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
