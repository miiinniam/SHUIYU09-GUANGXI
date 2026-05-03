/**
 * Firebase 配置 + 共享牌堆核心逻辑
 * 水鱼发牌神器 - Firebase Realtime Database 版本
 */

// ===================== Firebase 配置 =====================
// ⚠️ 请替换为你自己的 Firebase 配置
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

function shouldUseMockDatabase() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const mockConfig = /^(YOUR_|example|local)/.test(firebaseConfig.apiKey || '');
  return params.get('mock') === '1' || mockConfig;
}

class MockSnapshot {
  constructor(value) {
    this.value = value;
  }

  exists() {
    return this.value !== undefined && this.value !== null;
  }

  val() {
    return this.exists() ? structuredClone(this.value) : null;
  }
}

class MockRealtimeDatabase {
  constructor() {
    this.storageKey = 'shuiyu_mock_db';
    this.listeners = new Map();
    this.channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('shuiyu_mock_db') : null;
    if (this.channel) {
      this.channel.onmessage = () => this.notifyAll();
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === this.storageKey) this.notifyAll();
      });
    }
  }

  ref(path = '') {
    return new MockRef(this, path);
  }

  async remoteRequest(op, path, value) {
    if (typeof fetch !== 'function' || typeof window === 'undefined' || !window.location?.origin) {
      return { ok: false };
    }
    try {
      const response = await fetch(`${window.location.origin}/__mockdb`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ op, path: this.normalize(path), value })
      });
      if (!response.ok) return { ok: false };
      return await response.json();
    } catch {
      return { ok: false };
    }
  }

  readRoot() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
    } catch {
      return {};
    }
  }

  writeRoot(root) {
    localStorage.setItem(this.storageKey, JSON.stringify(root));
    this.notifyAll();
    this.channel?.postMessage({ type: 'changed' });
  }

  async read(path) {
    const remote = await this.remoteRequest('read', path);
    if (remote.ok) return remote.value ?? null;

    const parts = this.parts(path);
    let node = this.readRoot();
    for (const part of parts) {
      if (node === undefined || node === null) return null;
      node = node[part];
    }
    return node ?? null;
  }

  async set(path, value) {
    const remote = await this.remoteRequest('set', path, value);
    if (remote.ok) {
      await this.notifyAll();
      return;
    }

    const root = this.readRoot();
    this.setIn(root, path, value);
    this.writeRoot(root);
  }

  async update(path, patch) {
    const remote = await this.remoteRequest('update', path, patch);
    if (remote.ok) {
      await this.notifyAll();
      return;
    }

    const root = this.readRoot();
    for (const [key, value] of Object.entries(patch)) {
      const targetPath = this.join(path, key);
      this.setIn(root, targetPath, value);
    }
    this.writeRoot(root);
  }

  async remove(path) {
    const remote = await this.remoteRequest('remove', path);
    if (remote.ok) {
      await this.notifyAll();
      return;
    }

    const root = this.readRoot();
    const parts = this.parts(path);
    const leaf = parts.pop();
    let node = root;
    for (const part of parts) {
      if (!node[part]) return;
      node = node[part];
    }
    if (leaf) delete node[leaf];
    this.writeRoot(root);
  }

  on(path, callback) {
    const normalized = this.normalize(path);
    const callbacks = this.listeners.get(normalized) || new Set();
    callbacks.add(callback);
    this.listeners.set(normalized, callbacks);
    let lastValue = '';
    const emitIfChanged = async () => {
      const value = await this.read(normalized);
      const serialized = JSON.stringify(value);
      if (serialized === lastValue) return;
      lastValue = serialized;
      callback(new MockSnapshot(value));
    };
    emitIfChanged();
    const timer = setInterval(emitIfChanged, 600);
    return timer;
  }

  async notifyAll() {
    for (const [path, callbacks] of this.listeners.entries()) {
      const snapshot = new MockSnapshot(await this.read(path));
      callbacks.forEach((callback) => callback(snapshot));
    }
  }

  setIn(root, path, value) {
    const parts = this.parts(path);
    const leaf = parts.pop();
    let node = root;
    for (const part of parts) {
      if (!node[part] || typeof node[part] !== 'object') node[part] = {};
      node = node[part];
    }
    if (leaf) node[leaf] = structuredClone(value);
  }

  parts(path) {
    return this.normalize(path).split('/').filter(Boolean);
  }

  normalize(path) {
    return String(path || '').replace(/^\/+|\/+$/g, '');
  }

  join(base, key) {
    return [this.normalize(base), this.normalize(key)].filter(Boolean).join('/');
  }
}

class MockRef {
  constructor(database, path) {
    this.database = database;
    this.path = path;
  }

  async set(value) {
    await this.database.set(this.path, value);
  }

  async update(value) {
    await this.database.update(this.path, value);
  }

  async remove() {
    await this.database.remove(this.path);
  }

  async once() {
    return new MockSnapshot(await this.database.read(this.path));
  }

  on(event, callback) {
    if (event !== 'value') throw new Error(`Mock database only supports value listeners, got ${event}`);
    return this.database.on(this.path, callback);
  }
}

// 初始化 Firebase 或本地模拟数据库
const useMockDatabase = shouldUseMockDatabase();
if (useMockDatabase) {
  window.ShuiyuMockMode = true;
} else if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = useMockDatabase ? new MockRealtimeDatabase() : firebase.database();

// ===================== 常量 =====================
const SUITS = ['♠', '♥', '♣', '♦'];
const SUITS_NAME = ['spade', 'heart', 'club', 'diamond'];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const POINT_MAP = { 'A':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':0,'J':0,'Q':0,'K':0 };
const JOKERS = [
  { rank:'大王', suit:'joker', point:0, id:'joker-big', isJoker:true },
  { rank:'小王', suit:'joker', point:0, id:'joker-small', isJoker:true }
];
const FLOWER_CARD = { rank:'花牌', suit:'flower', point:0, id:'flower-card', isFlower:true };

function generatePlayerId() {
  return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

// ===================== 牌堆引擎 =====================
class Deck {
  constructor(isVariant = false) {
    this.isVariant = isVariant;
    this.cards = [];
    this.build();
    this.shuffle();
  }

  build() {
    this.cards = [];
    for (let s = 0; s < SUITS.length; s++) {
      for (let r = 0; r < RANKS.length; r++) {
        this.cards.push({
          suit: SUITS[s], suitName: SUITS_NAME[s],
          rank: RANKS[r], point: POINT_MAP[RANKS[r]],
          id: `${SUITS_NAME[s]}-${RANKS[r]}`, isJoker: false
        });
      }
    }
    if (this.isVariant) this.cards.push(...JOKERS, FLOWER_CARD);
    this.remaining = this.cards.length;
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  deal(count = 1) {
    if (this.cards.length < count) return null;
    const dealt = this.cards.splice(0, count);
    this.remaining = this.cards.length;
    return dealt;
  }

  toJSON() { return { isVariant: this.isVariant, cards: this.cards, remaining: this.remaining }; }

  static fromJSON(json) {
    const d = new Deck(json.isVariant);
    d.cards = json.cards;
    d.remaining = json.remaining;
    return d;
  }
}

// ===================== 点数计算 =====================
class Calculator {
  static isWildCard(card) {
    return Boolean(card?.isJoker || card?.isFlower);
  }

  static point(card) {
    return card?.point;
  }

  static sameRank(c1, c2) {
    return !this.isWildCard(c1) && !this.isWildCard(c2) && c1?.rank === c2?.rank;
  }

  static baoLabel(c1, c2) {
    if (this.isWildCard(c1) && !this.isWildCard(c2)) return c2.rank;
    if (this.isWildCard(c2) && !this.isWildCard(c1)) return c1.rank;
    if (this.sameRank(c1, c2)) return c1.rank;
    return '配';
  }

  static group(cards) {
    if (!cards || cards.length !== 2) return { display: '-', isBao: false, raw: 0 };
    const [c1, c2] = cards;
    const p1 = this.point(c1), p2 = this.point(c2);
    if (this.sameRank(c1, c2) || this.isWildCard(c1) || this.isWildCard(c2)) {
      const label = this.baoLabel(c1, c2);
      return { display: `${label}保`, isBao: true, raw: Math.max(p1, p2), label };
    }
    return { display: `${(p1 + p2) % 10}点`, isBao: false, raw: (p1 + p2) % 10 };
  }

  static rankValue(rank, fallback = 0) {
    const faceValues = { A: 1, J: 11, Q: 12, K: 13 };
    if (Object.hasOwn(faceValues, rank)) return faceValues[rank];
    const value = Number.parseInt(rank, 10);
    return Number.isNaN(value) ? fallback : value;
  }

  static resultScore(result) {
    if (result.isBao) return 100 + this.rankValue(result.label, result.raw);
    return result.raw;
  }

  static normalizeHeadTail(headResult, tailResult) {
    if (this.resultScore(headResult) >= this.resultScore(tailResult)) {
      return { headResult, tailResult };
    }
    return { headResult: tailResult, tailResult: headResult };
  }

  static summary(headResult, tailResult) {
    if (headResult.isBao && !tailResult.isBao) return `${headResult.label}的${tailResult.raw}保`;
    if (!headResult.isBao && tailResult.isBao) return `${tailResult.label}的${headResult.raw}保`;
    return '';
  }

  static shuiyu(head, tail) {
    const originalHead = this.group(head), originalTail = this.group(tail);
    const { headResult: hr, tailResult: tr } = this.normalizeHeadTail(originalHead, originalTail);
    const isShuiyu = hr.isBao && tr.isBao;
    return {
      head: hr, tail: tr, isShuiyu,
      left: hr.display, right: tr.display,
      summary: this.summary(hr, tr),
      center: isShuiyu ? '水鱼！' : ''
    };
  }
}

// ===================== Firebase 共享牌堆核心 =====================

/**
 * 创建房间（云端）
 * @param {string} roomId 4位房间号
 * @param {boolean} isVariant 是否含变牌
 * @param {number} playerCount 玩家数量
 * @param {string} creatorName 创建者昵称
 */
async function createRoom(roomId, isVariant, playerCount, creatorName) {
  const deck = new Deck(isVariant);
  const playerId = generatePlayerId();

  const roomData = {
    roomId,
    isVariant,
    playerCount,
    deck: deck.toJSON(),
    dealer: playerId,
    drinkCount: 0,
    createdAt: Date.now(),
    currentRound: 0,
    status: 'waiting' // waiting | playing
  };

  const playersData = {};
  playersData[playerId] = {
    name: creatorName,
    isDealer: true,
    hand: null,
    head: null,
    tail: null,
    joinedAt: Date.now()
  };

  await db.ref(`rooms/${roomId}`).set({
    ...roomData,
    players: playersData
  });

  return { success: true, roomId, playerId };
}

function queueClearPlayerHands(updates, roomId, players = {}) {
  for (const pid of Object.keys(players)) {
    updates[`rooms/${roomId}/players/${pid}/hand`] = null;
    updates[`rooms/${roomId}/players/${pid}/head`] = [];
    updates[`rooms/${roomId}/players/${pid}/tail`] = [];
  }
}

async function updateRoomVariant(roomId, isVariant) {
  const snap = await db.ref(`rooms/${roomId}`).once('value');
  const room = snap.val();
  if (!room) return { success: false, reason: '房间不存在' };

  const deck = new Deck(isVariant);
  const updates = {
    [`rooms/${roomId}/isVariant`]: isVariant,
    [`rooms/${roomId}/deck`]: deck.toJSON(),
    [`rooms/${roomId}/currentRound`]: (room.currentRound || 0) + 1,
    [`rooms/${roomId}/status`]: 'waiting',
    [`rooms/${roomId}/shuffleBeforeNextDeal`]: false
  };

  queueClearPlayerHands(updates, roomId, room.players);

  await db.ref().update(updates);

  return { success: true, remaining: deck.remaining };
}

/**
 * 加入房间（云端）
 * @param {string} roomId 4位房间号
 * @param {string} playerName 昵称
 */
async function joinRoom(roomId, playerName) {
  const snap = await db.ref(`rooms/${roomId}`).once('value');
  if (!snap.exists()) return { success: false, reason: '房间不存在' };

  const room = snap.val();
  const existingPlayers = room.players ? Object.keys(room.players) : [];

  if (existingPlayers.length >= room.playerCount) {
    return { success: false, reason: '房间已满' };
  }

  const playerId = generatePlayerId();
  await db.ref(`rooms/${roomId}/players/${playerId}`).set({
    name: playerName,
    isDealer: false,
    hand: null,
    head: null,
    tail: null,
    joinedAt: Date.now()
  });

  return { success: true, playerId, room };
}

/**
 * ⭐ 核心：从云端共享牌堆发牌给所有玩家
 * 庄家点击"发牌"时调用此函数
 * @param {string} roomId
 */
async function dealFromSharedDeck(roomId) {
  const roomSnap = await db.ref(`rooms/${roomId}`).once('value');
  if (!roomSnap.exists()) return { success: false, reason: '房间不存在' };

  const room = roomSnap.val();
  const playerIds = room.players ? Object.keys(room.players) : [];

  if (playerIds.length === 0) return { success: false, reason: '房间无玩家' };

  // 水鱼换庄后的下一把，从完整新牌堆重新洗牌发出。
  const deck = room.shuffleBeforeNextDeal ? new Deck(room.isVariant) : Deck.fromJSON(room.deck);
  const cardsNeeded = playerIds.length * 4;

  if (deck.cards.length < cardsNeeded) {
    // 牌不够，提示结束
    await db.ref(`rooms/${roomId}`).update({ status: 'finished' });
    return { success: false, reason: '牌已用尽', remaining: deck.cards.length };
  }

  // 从共享牌堆抽取
  const dealtCards = deck.deal(cardsNeeded);

  // 构建批量写入
  const updates = {};

  // 更新共享牌堆
  updates[`rooms/${roomId}/deck`] = deck.toJSON();
  updates[`rooms/${roomId}/currentRound`] = (room.currentRound || 0) + 1;
  updates[`rooms/${roomId}/status`] = 'playing';
  updates[`rooms/${roomId}/shuffleBeforeNextDeal`] = false;

  // 分配手牌给每个玩家
  for (let i = 0; i < playerIds.length; i++) {
    const pid = playerIds[i];
    const start = i * 4;
    const playerCards = dealtCards.slice(start, start + 4);
    updates[`rooms/${roomId}/players/${pid}/hand`] = playerCards;
    updates[`rooms/${roomId}/players/${pid}/head`] = [];
    updates[`rooms/${roomId}/players/${pid}/tail`] = [];
  }

  await db.ref().update(updates);

  return {
    success: true,
    remaining: deck.remaining,
    playerIds,
    playerHands: Object.fromEntries(
      playerIds.map((pid, i) => [pid, dealtCards.slice(i * 4, (i + 1) * 4)])
    )
  };
}

async function resetSharedDeck(roomId) {
  const roomSnap = await db.ref(`rooms/${roomId}`).once('value');
  if (!roomSnap.exists()) return { success: false, reason: '房间不存在' };

  const room = roomSnap.val();
  const deck = new Deck(room.isVariant);
  const updates = {
    [`rooms/${roomId}/deck`]: deck.toJSON(),
    [`rooms/${roomId}/currentRound`]: (room.currentRound || 0) + 1,
    [`rooms/${roomId}/status`]: 'waiting'
  };

  queueClearPlayerHands(updates, roomId, room.players);

  await db.ref().update(updates);
  return { success: true, remaining: deck.remaining };
}

/**
 * 更新玩家摆牌（头牌/尾牌）
 */
async function updatePlayerHand(roomId, playerId, head, tail) {
  await db.ref(`rooms/${roomId}/players/${playerId}`).update({ head, tail });
}

/**
 * 换庄（仅当前庄家可操作）
 */
async function switchDealer(roomId, newDealerId) {
  const updates = {};

  // 获取所有玩家
  const snap = await db.ref(`rooms/${roomId}/players`).once('value');
  const players = snap.val() || {};

  for (const [pid, data] of Object.entries(players)) {
    updates[`rooms/${roomId}/players/${pid}/isDealer`] = (pid === newDealerId);
  }
  updates[`rooms/${roomId}/dealer`] = newDealerId;

  // 重新洗牌
  const roomSnap = await db.ref(`rooms/${roomId}`).once('value');
  const room = roomSnap.val();
  const deck = new Deck(room.isVariant);
  updates[`rooms/${roomId}/deck`] = deck.toJSON();
  updates[`rooms/${roomId}/currentRound`] = 0;
  updates[`rooms/${roomId}/status`] = 'waiting';

  queueClearPlayerHands(updates, roomId, players);

  await db.ref().update(updates);
}

/**
 * 水鱼触发换庄 + 重置牌堆
 */
async function shuiyuReset(roomId, shuiyuPlayerId) {
  const snap = await db.ref(`rooms/${roomId}`).once('value');
  const room = snap.val();
  if (!room) return;

  const playerIds = Object.keys(room.players || {});
  if (playerIds.length === 0) return;

  const newDealerId = room.players?.[shuiyuPlayerId]
    ? shuiyuPlayerId
    : playerIds[Math.floor(Math.random() * playerIds.length)];

  const updates = {
    [`rooms/${roomId}/dealer`]: newDealerId,
    [`rooms/${roomId}/shuffleBeforeNextDeal`]: true
  };

  for (const pid of playerIds) {
    updates[`rooms/${roomId}/players/${pid}/isDealer`] = (pid === newDealerId);
  }

  await db.ref().update(updates);
}

/**
 * 记酒器
 */
async function updateDrink(roomId, delta) {
  const snap = await db.ref(`rooms/${roomId}`).once('value');
  const room = snap.val();
  const newCount = Math.max(0, (room.drinkCount || 0) + delta);
  await db.ref(`rooms/${roomId}/drinkCount`).set(newCount);
}

/**
 * 离开房间
 */
async function leaveRoom(roomId, playerId) {
  await db.ref(`rooms/${roomId}/players/${playerId}`).remove();
}

/**
 * 监听房间实时变化
 */
function watchRoom(roomId, callback) {
  return db.ref(`rooms/${roomId}`).on('value', snap => {
    if (snap.exists()) {
      callback(snap.val());
    }
  });
}

/**
 * 监听玩家实时变化
 */
function watchPlayers(roomId, callback) {
  return db.ref(`rooms/${roomId}/players`).on('value', snap => {
    callback(snap.exists() ? snap.val() : {});
  });
}

/**
 * 监听手牌实时变化
 */
function watchHand(roomId, playerId, callback) {
  return db.ref(`rooms/${roomId}/players/${playerId}`).on('value', snap => {
    callback(snap.exists() ? snap.val() : null);
  });
}

/**
 * 生成4位房间号
 */
function generateRoomId() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * 监听游戏结束
 */
function watchGameEnd(roomId, callback) {
  return db.ref(`rooms/${roomId}/status`).on('value', snap => {
    if (snap.val() === 'finished') callback();
  });
}

// 导出（兼容模块和全局）
if (typeof window !== 'undefined') {
  window.ShuiyuFirebase = {
    createRoom,
    updateRoomVariant,
    joinRoom,
    dealFromSharedDeck,
    resetSharedDeck,
    updatePlayerHand,
    switchDealer,
    shuiyuReset,
    updateDrink,
    leaveRoom,
    watchRoom,
    watchPlayers,
    watchHand,
    generateRoomId,
    watchGameEnd,
    generatePlayerId,
    Calculator,
    Deck
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createRoom, updateRoomVariant, joinRoom, dealFromSharedDeck, resetSharedDeck, updatePlayerHand,
    switchDealer, shuiyuReset, updateDrink, leaveRoom, watchRoom,
    watchPlayers, watchHand, generateRoomId, watchGameEnd, generatePlayerId, Calculator, Deck };
}
