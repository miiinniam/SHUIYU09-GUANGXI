import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

test('shared deck returns the remaining property instead of a missing method', async () => {
  const source = await readFile(new URL('../firebase-config.js', import.meta.url), 'utf8');

  assert.match(source, /remaining:\s*deck\.remaining/);
  assert.doesNotMatch(source, /deck\.getRemaining\(\)/);
});

test('game page exposes a non-recursive drink counter handler', async () => {
  const source = await readFile(new URL('../game-logic.js', import.meta.url), 'utf8');

  assert.match(source, /async function updateDrinkCount\(delta\)/);
  assert.match(source, /ShuiyuFirebase\.updateDrink\(G\.roomId,\s*delta\)/);
  assert.doesNotMatch(source, /async function updateDrink\(delta\)[\s\S]*?await updateDrink\(G\.roomId,\s*delta\)/);
});

test('game html calls the safe drink counter handler', async () => {
  const source = await readFile(new URL('../game.html', import.meta.url), 'utf8');

  assert.match(source, /updateDrinkCount\(-1\)/);
  assert.match(source, /updateDrinkCount\(1\)/);
  assert.doesNotMatch(source, /onclick="updateDrink\(/);
});

test('source files do not keep unused legacy card styles or drag helpers', async () => {
  const indexSource = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const gameSource = await readFile(new URL('../game.html', import.meta.url), 'utf8');
  const gameLogicSource = await readFile(new URL('../game-logic.js', import.meta.url), 'utf8');
  const firebaseSource = await readFile(new URL('../firebase-config.js', import.meta.url), 'utf8');

  for (const source of [indexSource, gameSource]) {
    assert.doesNotMatch(source, /\.card-face/);
    assert.doesNotMatch(source, /\.deal-card/);
    assert.doesNotMatch(source, /@keyframes deal-in/);
  }
  assert.doesNotMatch(indexSource, /\.poker-card/);
  assert.doesNotMatch(indexSource, /\.drag-ghost|\.drop-active|\.drop-highlight/);
  assert.doesNotMatch(indexSource, /@keyframes glow|@keyframes shuiyu-anim|\.shuiyu-glow|\.shuiyu-flash/);
  assert.doesNotMatch(gameLogicSource, /function findDropZone\(/);
  assert.doesNotMatch(firebaseSource, /key\.includes\('\/'\)\s*\?/);
});

test('firebase config supports localhost mock database mode', async () => {
  const source = await readFile(new URL('../firebase-config.js', import.meta.url), 'utf8');

  assert.match(source, /function shouldUseMockDatabase\(\)/);
  assert.match(source, /class MockRealtimeDatabase/);
  assert.match(source, /new MockRealtimeDatabase\(\)/);
  assert.match(source, /remoteRequest/);
  assert.match(source, /window\.ShuiyuMockMode/);
});

test('localhost mock database supports room, deal, and drink flow', async () => {
  const source = await readFile(new URL('../firebase-config.js', import.meta.url), 'utf8');
  const store = new Map();
  const context = {
    console,
    URLSearchParams,
    structuredClone,
    localStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key)
    },
    window: {
      location: { hostname: 'localhost', search: '' },
      addEventListener() {}
    },
    firebase: {
      apps: [],
      initializeApp() {
        throw new Error('Firebase should not initialize in localhost mock mode');
      },
      database() {
        throw new Error('Firebase database should not be used in localhost mock mode');
      }
    },
    module: { exports: {} }
  };
  context.window.localStorage = context.localStorage;

  vm.runInNewContext(source, context);

  assert.equal(context.window.ShuiyuMockMode, true);

  const created = await context.createRoom('1234', false, 8, '庄家');
  const joined = await context.joinRoom('1234', '闲家');
  const dealt = await context.dealFromSharedDeck('1234');
  await context.updateDrink('1234', 1);
  const room = JSON.parse(store.get('shuiyu_mock_db')).rooms['1234'];

  assert.equal(created.success, true);
  assert.equal(joined.success, true);
  assert.equal(dealt.success, true);
  assert.equal(Object.keys(dealt.playerHands).length, 2);
  assert.equal(room.drinkCount, 1);
});

test('package exposes LAN virtual run command', async () => {
  const source = await readFile(new URL('../package.json', import.meta.url), 'utf8');
  const pkg = JSON.parse(source);

  assert.equal(pkg.scripts.lan, 'node scripts/local-lan-server.mjs');
});

test('game logic supports mobile dealing improvements', async () => {
  const source = await readFile(new URL('../game-logic.js', import.meta.url), 'utf8');

  assert.match(source, /function autoArrangeHand\(cards\)/);
  assert.match(source, /function findShuiyuArrangement\(cards\)/);
  assert.match(source, /function scoreGroup\(cards\)/);
  assert.match(source, /function sameRankCards\(c1, c2\)/);
  assert.doesNotMatch(source, /if \(p1 === p2 \|\| isWildCard\(cards\[0\]\) \|\| isWildCard\(cards\[1\]\)\)/);
  assert.match(source, /function toggleCardReveal\(cardId\)/);
  assert.match(source, /justRevealedCardId/);
  assert.match(source, /card-flip-reveal/);
  assert.match(source, /card-wild-reveal/);
  assert.match(source, /function playShuiyuEffect\(\)/);
  assert.match(source, /playShuiyuEffect\(\)/);
  assert.match(source, /setTimeout\(\(\) => effect\.classList\.add\('hidden'\), 3600\)/);
  assert.match(source, /btn-switch-dealer'\)\.classList\.toggle\('hidden', !isDealer\)/);
  assert.doesNotMatch(source, /btn-switch-dealer'\)\.style\.display/);
  assert.match(source, /res-summary/);
  assert.match(source, /res\.summary/);
  assert.match(source, /showSummaryOnly/);
  assert.match(source, /shuiyuReset\(G\.roomId,\s*G\.playerId\)/);
  assert.match(source, /function isWildCard\(card\)/);
  assert.doesNotMatch(source, /function chooseWildPoint/);
  assert.match(source, /async function doShuffle\(\)/);
  assert.match(source, /async function handleGameVariantChange\(\)/);
  assert.match(source, /updateRoomVariant\(G\.roomId,\s*nextVariant\)/);
  assert.match(source, /in-variant-game/);
  assert.match(source, /G\.revealedCardIds\s*=\s*new Set\(\)/);
  assert.match(source, /syncHandDebounced/);
  assert.match(source, /function findDropIntent\(x,\s*y\)/);
  assert.match(source, /function getCardDropIndex\(zone,\s*x\)/);
  assert.match(source, /handleDrop\(targetDrop\.zoneId,\s*draggedIdx,\s*targetDrop\.insertIndex\)/);
});

test('auto arrangement must choose shuiyu when four cards can make two bao groups', async () => {
  const source = await readFile(new URL('../game-logic.js', import.meta.url), 'utf8');
  const context = {
    document: { getElementById() { return null; }, querySelectorAll() { return []; } },
    setTimeout() {},
    clearTimeout() {},
    console,
    result: null
  };

  vm.runInNewContext(`${source}
    result = autoArrangeHand([
      { id: '10a', rank: '10', point: 0 },
      { id: '7a', rank: '7', point: 7 },
      { id: '10b', rank: '10', point: 0 },
      { id: '7b', rank: '7', point: 7 }
    ]);
  `, context);

  const groups = [
    context.result.head.map(card => card.rank).sort().join(','),
    context.result.tail.map(card => card.rank).sort().join(',')
  ].sort();
  assert.deepEqual(groups, ['10,10', '7,7']);
});

test('each card controls its own reveal state until the next deal', async () => {
  const source = await readFile(new URL('../game-logic.js', import.meta.url), 'utf8');
  const toggleMatch = source.match(/function toggleCardReveal\(cardId\) \{[\s\S]*?\n\}/);
  const toggleSource = toggleMatch?.[0] || '';

  assert.match(source, /function handleCardTap\(card\)[\s\S]*?toggleCardReveal\(card\.id\)/);
  assert.match(toggleSource, /G\.revealedCardIds\.has\(cardId\)[\s\S]*?G\.revealedCardIds\.delete\(cardId\)[\s\S]*?G\.revealedCardIds\.add\(cardId\)/);
  assert.match(source, /function syncCoverStateFromRevealedCards\(\)/);
  assert.doesNotMatch(toggleSource, /G\.cards\.forEach\(card => G\.revealedCardIds\.add\(card\.id\)\)/);
  assert.match(source, /function resetRevealState\(isCovered = true, animateCover = false\)[\s\S]*?G\.isCovered = isCovered/);
  assert.match(source, /animatingCoveredCardIds/);
  assert.match(source, /card-cover-set/);
  assert.match(source, /function setNewHand\(cards, head, tail\)[\s\S]*?resetRevealState\(true\)/);
  assert.match(source, /function dealSignature\(cards = \[\]\)/);
  assert.match(source, /const nextDealSignature = dealSignature\(cards\)/);
  assert.doesNotMatch(source, /const nextSignature = handSignature\(cards, head, tail\)\.split/);
});

test('firebase service supports reshuffling the shared deck', async () => {
  const source = await readFile(new URL('../firebase-config.js', import.meta.url), 'utf8');

  assert.match(source, /async function resetSharedDeck\(roomId\)/);
  assert.match(source, /resetSharedDeck/);
  assert.match(source, /static isWildCard\(card\)/);
  assert.match(source, /isFlower/);
  assert.doesNotMatch(source, /\['J', 'Q', 'K'\]\.includes/);
});

test('game html exposes shuffle controls and compact mobile cards', async () => {
  const source = await readFile(new URL('../game.html', import.meta.url), 'utf8');

  assert.match(source, /btn-shuffle/);
  assert.match(source, /id="in-variant-game"/);
  assert.match(source, /handleGameVariantChange\(\)/);
  assert.match(source, /id="shuiyu-effect"/);
  assert.match(source, /@keyframes card-flip-pop/);
  assert.match(source, /@keyframes wild-burst/);
  assert.match(source, /@keyframes shuiyu-image-pop/);
  assert.match(source, /shuiyu-win-image/);
  assert.match(source, /assets\/shuiyu-win\.png/);
  assert.match(source, /res-summary/);
  assert.match(source, /\.panel/);
  assert.match(source, /primary-btn/);
  assert.match(source, /result-summary/);
  assert.match(source, /player-strip/);
  assert.match(source, /avatar-current/);
  assert.match(source, /card-normal/);
  assert.doesNotMatch(source, /cdn\.tailwindcss\.com/);
  assert.doesNotMatch(source, /modal-wild/);
  assert.match(source, /safe-area-inset-bottom/);
  assert.match(source, /grid-template-rows:\s*auto auto minmax\(142px,\s*1\.55fr\)/);
  assert.match(source, /width:\s*min\(38vw,\s*142px\)/);
  assert.match(source, /height:\s*clamp\(106px,\s*21vh,\s*168px\)/);
  assert.match(source, /#zone-temp/);
  assert.match(source, /@keyframes cover-card-pop/);
});

test('home page uses the premium minimal visual system', async () => {
  const source = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(source, /广西水鱼/);
  assert.match(source, /\.hidden\s*\{\s*display:\s*none\s*!important/);
  assert.match(source, /界面只保留实战需要的操作/);
  assert.match(source, /form-panel/);
  assert.match(source, /room-card/);
  assert.match(source, /primary-btn/);
  assert.match(source, /secondary-btn/);
  assert.doesNotMatch(source, /cdn\.tailwindcss\.com/);
  assert.doesNotMatch(source, /最近游戏|tabbar|logo-seal|glass-card/);
  assert.doesNotMatch(source, /🐟|🏠|🚪|📤|🎮/);
});

test('home page shows join room before create room', async () => {
  const source = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.ok(source.indexOf('id="btn-join"') < source.indexOf('id="btn-create"'));
});

test('variant mode is configured after creating a room', async () => {
  const indexSource = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const firebaseSource = await readFile(new URL('../firebase-config.js', import.meta.url), 'utf8');

  assert.ok(indexSource.indexOf('id="in-variant"') > indexSource.indexOf('id="btn-create"'));
  assert.match(indexSource, /createRoom\(roomId,\s*false,\s*8,\s*name\)/);
  assert.match(indexSource, /async function handleVariantChange\(\)/);
  assert.match(indexSource, /updateRoomVariant\(S\.roomId,\s*S\.isVariant\)/);
  assert.match(firebaseSource, /async function updateRoomVariant\(roomId,\s*isVariant\)/);
  assert.match(firebaseSource, /updateRoomVariant/);
});

test('game variant switch rebuilds the deck and restarts the current game', async () => {
  const source = await readFile(new URL('../firebase-config.js', import.meta.url), 'utf8');
  const store = new Map();
  const context = {
    console,
    URLSearchParams,
    structuredClone,
    localStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key)
    },
    window: {
      location: { hostname: 'localhost', search: '' },
      addEventListener() {}
    },
    firebase: {
      apps: [],
      initializeApp() {},
      database() {}
    },
    module: { exports: {} }
  };
  context.window.localStorage = context.localStorage;
  vm.runInNewContext(source, context);

  const { createRoom, joinRoom, dealFromSharedDeck, updateRoomVariant } = context.module.exports;
  const created = await createRoom('2468', false, 8, '庄家');
  const joined = await joinRoom('2468', '闲家');
  await dealFromSharedDeck('2468');
  const switched = await updateRoomVariant('2468', true);
  const room = JSON.parse(store.get('shuiyu_mock_db')).rooms['2468'];

  assert.equal(created.success, true);
  assert.equal(joined.success, true);
  assert.equal(switched.success, true);
  assert.equal(room.isVariant, true);
  assert.equal(room.deck.cards.length, 55);
  assert.equal(room.deck.remaining, 55);
  assert.equal(room.status, 'waiting');
  assert.equal(room.shuffleBeforeNextDeal, false);
  assert.equal(room.players[created.playerId].hand, null);
  assert.deepEqual(room.players[created.playerId].head, []);
  assert.deepEqual(room.players[joined.playerId].tail, []);
});

test('wild cards are recognized as pair without changing face display', async () => {
  const source = await readFile(new URL('../firebase-config.js', import.meta.url), 'utf8');
  const store = new Map();
  const context = {
    console,
    URLSearchParams,
    structuredClone,
    localStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key)
    },
    window: {
      location: { hostname: 'localhost', search: '' },
      addEventListener() {}
    },
    firebase: {
      apps: [],
      initializeApp() {},
      database() {}
    },
    module: { exports: {} }
  };
  context.window.localStorage = context.localStorage;
  vm.runInNewContext(source, context);

  const { Calculator } = context.module.exports;
  const jokerPair = Calculator.group([
    { rank: '大王', isJoker: true, point: 0 },
    { rank: '8', isJoker: false, point: 8 }
  ]);
  const flowerCardPair = Calculator.group([
    { rank: '花牌', isFlower: true, point: 0 },
    { rank: '8', isJoker: false, point: 8 }
  ]);
  const jqkPair = Calculator.group([
    { rank: 'J', isJoker: false, point: 0 },
    { rank: '8', isJoker: false, point: 8 }
  ]);
  const tenPair = Calculator.group([
    { rank: '10', isJoker: false, point: 0 },
    { rank: '8', isJoker: false, point: 8 }
  ]);
  const tenQueen = Calculator.group([
    { rank: '10', isJoker: false, point: 0 },
    { rank: 'Q', isJoker: false, point: 0 }
  ]);
  const pairOfTens = Calculator.group([
    { rank: '10', isJoker: false, point: 0 },
    { rank: '10', isJoker: false, point: 0 }
  ]);
  const exampleTail = Calculator.group([
    { rank: '4', isJoker: false, point: 4 },
    { rank: '10', isJoker: false, point: 0 }
  ]);
  const tenWithSevenBao = Calculator.shuiyu([
    { rank: '10', isJoker: false, point: 0 },
    { rank: '10', isJoker: false, point: 0 }
  ], [
    { rank: '10', isJoker: false, point: 0 },
    { rank: '7', isJoker: false, point: 7 }
  ]);
  const sevenWithTenBao = Calculator.shuiyu([
    { rank: '10', isJoker: false, point: 0 },
    { rank: '7', isJoker: false, point: 7 }
  ], [
    { rank: '10', isJoker: false, point: 0 },
    { rank: '10', isJoker: false, point: 0 }
  ]);
  const swappedPointOrder = Calculator.shuiyu([
    { rank: '2', isJoker: false, point: 2 },
    { rank: '10', isJoker: false, point: 0 }
  ], [
    { rank: '9', isJoker: false, point: 9 },
    { rank: '10', isJoker: false, point: 0 }
  ]);
  const swappedBaoOrder = Calculator.shuiyu([
    { rank: '7', isJoker: false, point: 7 },
    { rank: '7', isJoker: false, point: 7 }
  ], [
    { rank: '10', isJoker: false, point: 0 },
    { rank: '10', isJoker: false, point: 0 }
  ]);

  assert.equal(jokerPair.display, '8保');
  assert.equal(flowerCardPair.display, '8保');
  assert.equal(jqkPair.display, '8点');
  assert.equal(tenPair.display, '8点');
  assert.equal(tenQueen.display, '0点');
  assert.equal(pairOfTens.display, '10保');
  assert.equal(exampleTail.display, '4点');
  assert.equal(tenWithSevenBao.summary, '10的7保');
  assert.equal(sevenWithTenBao.summary, '10的7保');
  assert.equal(swappedPointOrder.left, '9点');
  assert.equal(swappedPointOrder.right, '2点');
  assert.equal(swappedBaoOrder.left, '10保');
  assert.equal(swappedBaoOrder.right, '7保');
});

test('shuiyu reset transfers dealer to the player who made shuiyu', async () => {
  const source = await readFile(new URL('../firebase-config.js', import.meta.url), 'utf8');
  const store = new Map();
  const context = {
    console,
    URLSearchParams,
    structuredClone,
    localStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key)
    },
    window: {
      location: { hostname: 'localhost', search: '' },
      addEventListener() {}
    },
    firebase: {
      apps: [],
      initializeApp() {},
      database() {}
    },
    module: { exports: {} }
  };
  context.window.localStorage = context.localStorage;
  vm.runInNewContext(source, context);

  const { createRoom, joinRoom, dealFromSharedDeck, shuiyuReset } = context.module.exports;
  const created = await createRoom('5678', true, 8, '庄家');
  const joined = await joinRoom('5678', '水鱼玩家');
  await dealFromSharedDeck('5678');
  const before = JSON.parse(store.get('shuiyu_mock_db')).rooms['5678'];
  await shuiyuReset('5678', joined.playerId);
  const roomAfterReset = JSON.parse(store.get('shuiyu_mock_db')).rooms['5678'];
  await dealFromSharedDeck('5678');
  const room = JSON.parse(store.get('shuiyu_mock_db')).rooms['5678'];

  assert.equal(created.success, true);
  assert.equal(joined.success, true);
  assert.equal(roomAfterReset.dealer, joined.playerId);
  assert.equal(roomAfterReset.players[joined.playerId].isDealer, true);
  assert.equal(roomAfterReset.players[created.playerId].isDealer, false);
  assert.deepEqual(roomAfterReset.players[joined.playerId].hand, before.players[joined.playerId].hand);
  assert.deepEqual(roomAfterReset.players[created.playerId].hand, before.players[created.playerId].hand);
  assert.equal(roomAfterReset.shuffleBeforeNextDeal, true);
  assert.equal(room.deck.remaining, 47);
  assert.equal(room.shuffleBeforeNextDeal, false);
});
