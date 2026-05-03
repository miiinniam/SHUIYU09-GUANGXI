/**
 * 水鱼发牌神器 - 游戏核心逻辑
 */

const G = {
  roomId: null,
  playerId: null,
  room: null,
  myData: null,
  isVariant: false,
  cards: [],
  head: [],
  tail: [],
  isCovered: true,
  revealedCardIds: new Set(),
  justRevealedCardId: null,
  animatingCoveredCardIds: new Set(),
  result: null,
  unwatchRoom: null,
  unwatchMe: null,
  shuiyuShown: false,
  lastRenderSignature: '',
  lastHandSignature: '',
  syncTimer: null
};

function show(id) { document.getElementById(id)?.classList.remove('hidden'); }
function hide(id) { document.getElementById(id)?.classList.add('hidden'); }
function loading(show_) { show_ ? show('loading') : hide('loading'); }

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  el.classList.add('toast-anim');
  setTimeout(() => { el.classList.add('hidden'); el.classList.remove('toast-anim'); }, 2200);
}

function cardPoint(card) {
  return card?.point ?? 0;
}

function isWildCard(card) {
  return Boolean(card?.isJoker || card?.isFlower);
}

function sameRankCards(c1, c2) {
  return !isWildCard(c1) && !isWildCard(c2) && c1?.rank === c2?.rank;
}

function cardRankLabel(card) {
  if (card?.isJoker) return card.rank === '大王' ? '大' : '小';
  if (card?.isFlower) return '花';
  const r = card?.rank;
  if (r === 1 || r === '1' || r === 'A') return 'A';
  if (r === 11 || r === '11' || r === 'J') return 'J';
  if (r === 12 || r === '12' || r === 'Q') return 'Q';
  if (r === 13 || r === '13' || r === 'K') return 'K';
  return r != null ? String(r) : '';
}

function scoreGroup(cards) {
  if (!cards || cards.length !== 2) return -1;
  const p1 = cardPoint(cards[0]);
  const p2 = cardPoint(cards[1]);
  if (sameRankCards(cards[0], cards[1]) || isWildCard(cards[0]) || isWildCard(cards[1])) return 100 + Math.max(p1, p2);
  return (p1 + p2) % 10;
}

function isBaoGroup(cards) {
  return cards?.length === 2 && (sameRankCards(cards[0], cards[1]) || isWildCard(cards[0]) || isWildCard(cards[1]));
}

function findShuiyuArrangement(cards) {
  if (!cards || cards.length !== 4) return null;
  const splits = [
    [[cards[0], cards[1]], [cards[2], cards[3]]],
    [[cards[0], cards[2]], [cards[1], cards[3]]],
    [[cards[0], cards[3]], [cards[1], cards[2]]]
  ];

  for (const [a, b] of splits) {
    if (isBaoGroup(a) && isBaoGroup(b)) {
      return scoreGroup(a) >= scoreGroup(b)
        ? { head: a, tail: b }
        : { head: b, tail: a };
    }
  }
  return null;
}

function autoArrangeHand(cards) {
  if (!cards || cards.length !== 4) return { head: [], tail: [] };
  const shuiyu = findShuiyuArrangement(cards);
  if (shuiyu) return shuiyu;

  const splits = [
    [[cards[0], cards[1]], [cards[2], cards[3]]],
    [[cards[0], cards[2]], [cards[1], cards[3]]],
    [[cards[0], cards[3]], [cards[1], cards[2]]]
  ];

  let best = splits[0];
  let bestDelta = -Infinity;
  for (const [a, b] of splits) {
    const high = scoreGroup(a) >= scoreGroup(b) ? a : b;
    const low = high === a ? b : a;
    const delta = scoreGroup(high) - scoreGroup(low);
    if (delta > bestDelta) {
      bestDelta = delta;
      best = [high, low];
    }
  }

  return { head: best[0], tail: best[1] };
}

function handSignature(cards = [], head = [], tail = []) {
  const ids = (list) => list.map(c => `${c.id}:${cardPoint(c)}`).join(',');
  return `${ids(cards)}|${ids(head)}|${ids(tail)}|${G.isCovered}|${[...G.revealedCardIds].sort().join(',')}`;
}

function dealSignature(cards = []) {
  return cards.map(c => `${c.id}:${cardPoint(c)}`).sort().join(',');
}

function ensureAutoArrangement(me) {
  if (!me?.hand || me.hand.length !== 4) return false;
  const hasServerLayout = (me.head?.length || 0) + (me.tail?.length || 0) > 0;
  if (hasServerLayout) return false;
  const arranged = autoArrangeHand(me.hand);
  G.head = arranged.head;
  G.tail = arranged.tail;
  syncHandDebounced(10);
  return true;
}

function resetRevealState(isCovered = true, animateCover = false) {
  G.isCovered = isCovered;
  G.revealedCardIds = new Set();
  G.justRevealedCardId = null;
  G.animatingCoveredCardIds = animateCover ? new Set(G.cards.map(card => card.id)) : new Set();
  const cover = document.getElementById('in-cover');
  if (cover) cover.checked = isCovered;
}

function resetLocalTable() {
  G.cards = [];
  G.head = [];
  G.tail = [];
  resetRevealState(true);
  G.shuiyuShown = false;
  G.lastHandSignature = '';
  G.lastRenderSignature = '';
}

function setNewHand(cards, head, tail) {
  const nextDealSignature = dealSignature(cards);
  const isNewHand = nextDealSignature !== G.lastHandSignature;
  G.cards = cards || [];
  G.head = head || [];
  G.tail = tail || [];

  if (isNewHand) {
    G.lastHandSignature = nextDealSignature;
    resetRevealState(true);
    G.lastRenderSignature = '';
  }
}

function cardHTML(card, zone, index = 0) {
  if (!card) return '';
  const covered = G.isCovered && !G.revealedCardIds.has(card.id);
  const justRevealed = !covered && G.justRevealedCardId === card.id;
  const justCovered = covered && G.animatingCoveredCardIds.has(card.id);
  const sizeClass = zone === 'temp'
    ? 'card-temp'
    : 'card-large';
  const revealClass = [
    justRevealed ? `card-flip-reveal ${isWildCard(card) ? 'card-wild-reveal' : ''}` : '',
    justCovered ? 'card-cover-set' : ''
  ].filter(Boolean).join(' ');
  const visualClass = covered
    ? 'card-covered'
    : isWildCard(card)
      ? 'card-wild'
      : 'card-normal';
  const red = card.suit === '♥' || card.suit === '♦';
  const colorClass = red ? 'card-red' : 'card-black';
  const suit = card.isJoker ? '王' : card.isFlower ? '花' : card.suit;
  const rank = cardRankLabel(card);
  const wildBadge = isWildCard(card) ? '<div class="wild-badge">配</div>' : '';
  const coverHTML = `
    <div class="card-cover">
      <div class="cover-mark">水</div>
    </div>`;
  const faceHTML = `
    <div class="card-corner ${colorClass}">
      <span>${rank}</span>
      <span>${suit}</span>
    </div>
    ${wildBadge}
    <div class="card-center ${colorClass}">${suit}</div>
    <div class="card-corner bottom ${colorClass}">
      <span>${rank}</span>
      <span>${suit}</span>
    </div>`;

  return `
    <div class="poker-card ${sizeClass} ${visualClass} ${revealClass}"
         data-card-index="${index}" data-card-id="${card.id}" data-zone="${zone}">
      ${covered ? coverHTML : faceHTML}
    </div>
  `;
}

function playShuiyuEffect() {
  const effect = document.getElementById('shuiyu-effect');
  if (!effect) return;
  effect.classList.remove('hidden', 'shuiyu-effect-run');
  void effect.offsetWidth;
  effect.classList.add('shuiyu-effect-run');
  setTimeout(() => effect.classList.add('hidden'), 3600);
}

function renderCards(force = false) {
  const rowTemp = document.getElementById('row-temp');
  const rowHead = document.getElementById('row-head');
  const rowTail = document.getElementById('row-tail');
  if (!rowTemp || !rowHead || !rowTail) return;

  const signature = handSignature(G.cards, G.head, G.tail);
  if (!force && signature === G.lastRenderSignature) return;
  G.lastRenderSignature = signature;

  const inHead = new Set(G.head.map(c => c.id));
  const inTail = new Set(G.tail.map(c => c.id));
  const unassigned = G.cards.filter(c => !inHead.has(c.id) && !inTail.has(c.id));

  rowTemp.innerHTML = unassigned.map(card => cardHTML(card, 'temp', G.cards.findIndex(c => c.id === card.id))).join('');
  rowHead.innerHTML = G.head.map(card => cardHTML(card, 'head', G.cards.findIndex(c => c.id === card.id))).join('');
  rowTail.innerHTML = G.tail.map(card => cardHTML(card, 'tail', G.cards.findIndex(c => c.id === card.id))).join('');

  setRowEmpty(rowHead, G.head.length === 0, 'head');
  setRowEmpty(rowTail, G.tail.length === 0, 'tail');
  setRowEmpty(rowTemp, unassigned.length === 0, 'temp');

  bindDrag();
}

function setRowEmpty(row, isEmpty, kind) {
  if (isEmpty) row.dataset.empty = kind;
  else delete row.dataset.empty;
}

function syncToggleLabels() {
  const variant = document.getElementById('in-variant-game');
  const cover = document.getElementById('in-cover');
  document.getElementById('lbl-variant')?.classList.toggle('on', !!variant?.checked);
  document.getElementById('lbl-cover')?.classList.toggle('on', !!cover?.checked);
}

function refreshResult() {
  const elH = document.getElementById('res-head');
  const elT = document.getElementById('res-tail');
  const elS = document.getElementById('res-shuiyu');
  const elSummary = document.getElementById('res-summary');
  const elC = document.getElementById('msg-covered');
  if (!elH || !elT || !elS || !elSummary || !elC) return;

  const showSummaryOnly = (text) => {
    elH.textContent = '';
    elT.textContent = '';
    elH.classList.add('hidden');
    elT.classList.add('hidden');
    elSummary.textContent = text;
    elSummary.classList.remove('hidden');
  };

  const showSideResults = () => {
    elH.classList.remove('hidden');
    elT.classList.remove('hidden');
    elSummary.classList.add('hidden');
  };

  if (G.isCovered) {
    showSideResults();
    elH.textContent = '?';
    elT.textContent = '?';
    elH.className = 'result-value text-paper/60';
    elT.className = 'result-value text-paper/60';
    elS.classList.add('hidden');
    elSummary.classList.add('hidden');
    elC.classList.remove('hidden');
    return;
  }

  elC.classList.add('hidden');
  if (G.head.length === 2 && G.tail.length === 2) {
    const res = Calculator.shuiyu(G.head, G.tail);
    G.result = res;
    if (res.isShuiyu) {
      elH.textContent = '';
      elT.textContent = '';
      elH.classList.add('hidden');
      elT.classList.add('hidden');
      elSummary.classList.add('hidden');
      elS.classList.remove('hidden');
      elS.classList.add('shuiyu-glow', 'shuiyu-flash');
      setTimeout(() => elS.classList.remove('shuiyu-flash'), 1600);
      if (G.isVariant && !G.shuiyuShown) {
        G.shuiyuShown = true;
        playShuiyuEffect();
        setTimeout(() => {
          shuiyuReset(G.roomId, G.playerId);
          toast('水鱼！该玩家坐庄，等待发牌');
        }, 1600);
      }
    } else {
      elS.classList.add('hidden');
      if (res.summary) {
        showSummaryOnly(res.summary);
      } else {
        showSideResults();
        elH.textContent = res.left;
        elT.textContent = res.right;
        elH.className = 'result-value ' + (res.head.isBao ? 'text-danger' : 'text-paper');
        elT.className = 'result-value ' + (res.tail.isBao ? 'text-danger' : 'text-paper');
        elSummary.classList.add('hidden');
      }
      G.shuiyuShown = false;
    }
  } else {
    showSideResults();
    elH.textContent = '-';
    elT.textContent = '-';
    elH.className = 'result-value text-paper/30';
    elT.className = 'result-value text-paper/30';
    elS.classList.add('hidden');
    elSummary.classList.add('hidden');
  }
}

function refreshUI() {
  if (!G.room) return;
  const isDealer = G.room.dealer === G.playerId;
  document.getElementById('disp-game-room').textContent = '房间 ' + G.room.roomId;
  document.getElementById('disp-my-name').textContent = G.myData?.name || '我';
  const roleEl = document.getElementById('disp-my-role');
  roleEl.textContent = isDealer ? '庄家' : '闲家';
  roleEl.className = 'role-badge' + (isDealer ? ' dealer' : '');
  document.getElementById('disp-drink').textContent = G.room.drinkCount || 0;
  document.getElementById('disp-remaining').textContent = G.room.deck?.cards?.length || 0;
  document.getElementById('btn-switch-dealer').classList.toggle('hidden', !isDealer);
  document.getElementById('btn-deal').disabled = !isDealer;
  document.getElementById('btn-shuffle').disabled = !isDealer;
  const variantToggle = document.getElementById('in-variant-game');
  if (variantToggle) {
    variantToggle.checked = Boolean(G.room.isVariant);
    variantToggle.disabled = !isDealer;
    variantToggle.parentElement?.classList.toggle('opacity-50', !isDealer);
  }
  document.getElementById('deal-label').textContent = isDealer ? '发牌' : '等待庄家';
  document.getElementById('btn-deal').classList.toggle('opacity-50', !isDealer);
  document.getElementById('btn-shuffle').classList.toggle('opacity-50', !isDealer);
  syncToggleLabels();
  renderPlayerStrip();
}

function renderPlayerStrip() {
  const strip = document.getElementById('player-strip');
  if (!strip || !G.room?.players) return;
  strip.innerHTML = Object.entries(G.room.players).map(([pid, player]) => {
    const isMe = pid === G.playerId;
    const isDealer = G.room.dealer === pid;
    const handCount = (player.hand?.length || 0);
    return `
      <div class="player-pill ${isMe ? 'me' : ''}">
        <div class="avatar ${isMe ? 'avatar-current' : ''}">
          ${player.name?.[0] || '?'}
          <span class="online-dot"></span>
          ${isDealer ? '<span class="dealer-dot">庄</span>' : ''}
        </div>
        <div class="player-meta">
          <div class="player-nick">${player.name || '玩家'}</div>
          <div class="player-sub">${isDealer ? '庄家' : '闲家'} · ${handCount}张</div>
        </div>
      </div>
    `;
  }).join('');
}

const DRAG_THRESHOLD_PX = 6;
const ZONE_MAGNETIC_PX = 14;
const ZONES = ['zone-head', 'zone-tail', 'zone-temp'];

let drag = null;

function bindDrag() {
  document.querySelectorAll('.poker-card').forEach(el => {
    el.addEventListener('pointerdown', handlePointerDown);
  });
}

function handlePointerDown(e) {
  if (e.button !== undefined && e.button > 0) return;
  if (drag) return;
  const card = e.currentTarget;
  const idx = parseInt(card.dataset.cardIndex, 10);
  if (Number.isNaN(idx)) return;
  e.preventDefault();
  const rect = card.getBoundingClientRect();
  drag = {
    card,
    idx,
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    offX: e.clientX - rect.left,
    offY: e.clientY - rect.top,
    width: rect.width,
    height: rect.height,
    homeRect: rect,
    lastX: e.clientX,
    lastY: e.clientY,
    ghost: null,
    raf: 0,
    dragging: false,
    swapTarget: null,
  };
  try { card.setPointerCapture(e.pointerId); } catch {}
  card.addEventListener('pointermove', handlePointerMove);
  card.addEventListener('pointerup', handlePointerUp);
  card.addEventListener('pointercancel', handlePointerUp);
}

function handlePointerMove(e) {
  if (!drag || e.pointerId !== drag.pointerId) return;
  drag.lastX = e.clientX;
  drag.lastY = e.clientY;
  if (!drag.dragging) {
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return;
    enterDragging();
  }
  if (!drag.raf) drag.raf = requestAnimationFrame(applyMove);
}

function enterDragging() {
  drag.dragging = true;
  const ghost = drag.card.cloneNode(true);
  ghost.id = 'drag-ghost';
  ghost.classList.add('drag-ghost-active');
  ghost.style.cssText = `position:fixed;left:0;top:0;width:${drag.width}px;height:${drag.height}px;z-index:9999;pointer-events:none;will-change:transform;transform:translate3d(${drag.homeRect.left}px,${drag.homeRect.top}px,0) scale(1);`;
  document.body.appendChild(ghost);
  drag.ghost = ghost;
  drag.card.classList.add('drag-source');
  ZONES.forEach(id => document.getElementById(id)?.classList.add('drop-active'));
}

function applyMove() {
  drag.raf = 0;
  if (!drag || !drag.ghost) return;
  const x = drag.lastX - drag.offX;
  const y = drag.lastY - drag.offY;
  drag.ghost.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.06)`;
  updateDropTarget(drag.lastX, drag.lastY);
}

function updateDropTarget(x, y) {
  let inZone = null;
  for (const id of ZONES) {
    const zone = document.getElementById(id);
    if (!zone) continue;
    const r = zone.getBoundingClientRect();
    const hit = x >= r.left - ZONE_MAGNETIC_PX && x <= r.right + ZONE_MAGNETIC_PX
             && y >= r.top - ZONE_MAGNETIC_PX && y <= r.bottom + ZONE_MAGNETIC_PX;
    zone.classList.toggle('drop-highlight', hit);
    if (hit && !inZone) inZone = zone;
  }
  document.querySelectorAll('.poker-card.swap-target').forEach(el => el.classList.remove('swap-target'));
  drag.swapTarget = null;
  if (inZone && (inZone.id === 'zone-head' || inZone.id === 'zone-tail')) {
    const others = [...inZone.querySelectorAll('.poker-card')].filter(c => c !== drag.card);
    if (others.length >= 2) {
      let best = null, bestDist = Infinity;
      for (const c of others) {
        const r = c.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const d = (cx - x) * (cx - x) + (cy - y) * (cy - y);
        if (d < bestDist) { bestDist = d; best = c; }
      }
      if (best) {
        best.classList.add('swap-target');
        drag.swapTarget = best;
      }
    }
  }
}

function handlePointerUp(e) {
  if (!drag || (e.pointerId !== undefined && e.pointerId !== drag.pointerId)) return;
  const d = drag;
  drag = null;
  if (d.raf) cancelAnimationFrame(d.raf);
  d.card.removeEventListener('pointermove', handlePointerMove);
  d.card.removeEventListener('pointerup', handlePointerUp);
  d.card.removeEventListener('pointercancel', handlePointerUp);
  try { d.card.releasePointerCapture(d.pointerId); } catch {}
  ZONES.forEach(id => document.getElementById(id)?.classList.remove('drop-active', 'drop-highlight'));
  document.querySelectorAll('.poker-card.swap-target').forEach(el => el.classList.remove('swap-target'));
  d.card.classList.remove('drag-source');

  if (!d.dragging) {
    d.ghost?.remove();
    const card = G.cards[d.idx];
    if (card) handleCardTap(card);
    return;
  }

  const x = e.clientX, y = e.clientY;
  const target = findDropIntent(x, y, d);
  if (target && d.idx >= 0) {
    animateGhostTo(d.ghost, computeLandingRect(target, d), () => {
      handleDrop(target.zoneId, d.idx, target.insertIndex);
    });
  } else {
    animateGhostTo(d.ghost, d.homeRect, null, true);
  }
}

function animateGhostTo(ghost, rect, onDone, fadeOut = false) {
  if (!ghost) { onDone?.(); return; }
  const cleanup = () => { ghost.remove(); onDone?.(); };
  if (!rect) { cleanup(); return; }
  ghost.style.transition = 'transform .18s cubic-bezier(.2,.78,.18,1.05), opacity .18s ease';
  ghost.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0) scale(1.0)`;
  if (fadeOut) ghost.style.opacity = '0';
  setTimeout(cleanup, 200);
}

function computeLandingRect(target, d) {
  if (d.swapTarget) return d.swapTarget.getBoundingClientRect();
  const zone = document.getElementById(target.zoneId);
  if (!zone) return null;
  const cards = [...zone.querySelectorAll('.poker-card')].filter(c => c !== d.card);
  if (cards.length === 0) {
    const r = zone.getBoundingClientRect();
    return { left: r.left + (r.width - d.width) / 2, top: r.top + (r.height - d.height) / 2 };
  }
  const slot = cards[Math.min(target.insertIndex, cards.length - 1)];
  const r = slot.getBoundingClientRect();
  if (target.insertIndex >= cards.length) return { left: r.right + 6, top: r.top };
  return { left: r.left, top: r.top };
}

function findDropIntent(x, y, d) {
  for (const id of ZONES) {
    const zone = document.getElementById(id);
    if (!zone) continue;
    const r = zone.getBoundingClientRect();
    const hit = x >= r.left - ZONE_MAGNETIC_PX && x <= r.right + ZONE_MAGNETIC_PX
             && y >= r.top - ZONE_MAGNETIC_PX && y <= r.bottom + ZONE_MAGNETIC_PX;
    if (!hit) continue;
    const insertIndex = (id === 'zone-head' || id === 'zone-tail') && d?.swapTarget
      ? getZoneCardIndex(id, d.swapTarget)
      : getCardDropIndex(zone, x, d?.card);
    return { zoneId: id, insertIndex };
  }
  return null;
}

function getZoneCardIndex(zoneId, cardEl) {
  const list = zoneId === 'zone-head' ? G.head : zoneId === 'zone-tail' ? G.tail : null;
  if (!list) return 0;
  const id = cardEl.dataset.cardId;
  const idx = list.findIndex(c => c.id === id);
  return idx >= 0 ? idx : list.length;
}

function getCardDropIndex(zone, x, excludeEl) {
  const cards = [...zone.querySelectorAll('.poker-card')].filter(card => card !== excludeEl);
  for (let i = 0; i < cards.length; i++) {
    const r = cards[i].getBoundingClientRect();
    if (x < r.left + r.width / 2) return i;
  }
  return cards.length;
}

function handleCardTap(card) {
  toggleCardReveal(card.id);
}

function syncCoverStateFromRevealedCards() {
  const allRevealed = G.cards.length > 0 && G.cards.every(card => G.revealedCardIds.has(card.id));
  G.isCovered = !allRevealed;
  const cover = document.getElementById('in-cover');
  if (cover) cover.checked = G.isCovered;
  syncToggleLabels();
}

function toggleCardReveal(cardId) {
  if (G.revealedCardIds.has(cardId)) {
    G.revealedCardIds.delete(cardId);
    G.justRevealedCardId = null;
    G.animatingCoveredCardIds = new Set([cardId]);
  } else {
    G.revealedCardIds.add(cardId);
    G.justRevealedCardId = cardId;
    G.animatingCoveredCardIds = new Set();
  }
  syncCoverStateFromRevealedCards();
  renderCards(true);
  refreshResult();
  setTimeout(() => {
    if (G.justRevealedCardId === cardId) G.justRevealedCardId = null;
    G.animatingCoveredCardIds.delete(cardId);
  }, 900);
}

function removeFromZones(cardId) {
  const fromHead = G.head.find(c => c.id === cardId);
  const fromTail = G.tail.find(c => c.id === cardId);
  G.head = G.head.filter(c => c.id !== cardId);
  G.tail = G.tail.filter(c => c.id !== cardId);
  return fromHead ? 'head' : fromTail ? 'tail' : 'temp';
}

function handleDrop(zoneId, cardIndex, insertIndex = 2) {
  const card = G.cards[cardIndex];
  if (!card) return;
  const from = removeFromZones(card.id);
  const target = zoneId === 'zone-head' ? G.head : zoneId === 'zone-tail' ? G.tail : null;
  if (target) {
    if (target.length >= 2) {
      const replaceIndex = Math.min(Math.max(insertIndex, 0), target.length - 1);
      const displaced = target.splice(replaceIndex, 1, card)[0];
      if (from === 'head') G.head.push(displaced);
      if (from === 'tail') G.tail.push(displaced);
    } else {
      const targetIndex = Math.min(Math.max(insertIndex, 0), target.length);
      target.splice(targetIndex, 0, card);
    }
  }
  renderCards(true);
  refreshResult();
  syncHandDebounced();
}

async function syncHand() {
  if (!G.roomId || !G.playerId) return;
  await updatePlayerHand(G.roomId, G.playerId, G.head, G.tail);
}

function syncHandDebounced(delay = 180) {
  clearTimeout(G.syncTimer);
  G.syncTimer = setTimeout(syncHand, delay);
}

async function doDeal() {
  if (G.room?.dealer !== G.playerId) return toast('等待庄家发牌');
  loading(true);
  try {
    const res = await dealFromSharedDeck(G.roomId);
    if (res.success) {
      G.shuiyuShown = false;
      resetRevealState(true);
      if (res.remaining < 8) toast('本副牌即将结束，可洗牌');
    } else {
      toast(res.reason === '牌已用尽' ? '牌已用尽，请洗牌' : '发牌失败');
    }
  } catch (e) {
    toast('发牌失败: ' + e.message);
  } finally {
    loading(false);
  }
}

async function doShuffle() {
  if (G.room?.dealer !== G.playerId) return toast('只有庄家可以洗牌');
  if (!confirm('确定重新洗牌？当前手牌会清空。')) return;
  loading(true);
  try {
    await window.ShuiyuFirebase.resetSharedDeck(G.roomId);
    resetLocalTable();
    renderCards(true);
    refreshResult();
    toast('已重新洗牌');
  } catch (e) {
    toast('洗牌失败');
  } finally {
    loading(false);
  }
}

async function handleGameVariantChange() {
  const toggle = document.getElementById('in-variant-game');
  const nextVariant = Boolean(toggle?.checked);
  if (G.room?.dealer !== G.playerId) {
    if (toggle) toggle.checked = Boolean(G.room?.isVariant);
    return toast('只有庄家可以切换变牌');
  }

  loading(true);
  try {
    const res = await window.ShuiyuFirebase.updateRoomVariant(G.roomId, nextVariant);
    if (!res.success) {
      if (toggle) toggle.checked = Boolean(G.room?.isVariant);
      return toast(res.reason || '切换失败');
    }
    resetLocalTable();
    renderCards(true);
    refreshResult();
    toast(nextVariant ? '已开启变牌，重新洗牌' : '已关闭变牌，重新洗牌');
  } catch {
    if (toggle) toggle.checked = Boolean(G.room?.isVariant);
    toast('切换失败');
  } finally {
    loading(false);
  }
}

function showSwitchModal() {
  const players = G.room?.players || {};
  const current = G.room?.dealer;
  const list = document.getElementById('list-players');
  const modal = document.getElementById('modal-switch');
  let selected = null;
  list.innerHTML = Object.entries(players).map(([pid, p]) => `
    <div class="player-item ${pid === current ? 'disabled' : ''}" data-id="${pid}">
      <div class="avatar">${p.name?.[0] || '?'}</div>
      <div><div style="font-weight:900">${p.name || '玩家'}</div>${pid === current ? '<div style="font-size:12px;color:var(--gold-2)">当前庄家</div>' : ''}</div>
    </div>`).join('');
  list.querySelectorAll('.player-item').forEach(item => {
    item.addEventListener('click', () => {
      if (item.dataset.id === current) return;
      selected = item.dataset.id;
      list.querySelectorAll('.player-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
    });
  });
  document.getElementById('btn-confirm-switch').onclick = async () => {
    if (!selected) return toast('请选择一位玩家');
    loading(true);
    modal.classList.add('hidden');
    try {
      await switchDealer(G.roomId, selected);
      toast('换庄成功，已重新洗牌');
    } catch {
      toast('换庄失败');
    } finally {
      loading(false);
    }
  };
  modal.classList.remove('hidden');
}

async function updateDrinkCount(delta) {
  if (!G.roomId) return;
  await window.ShuiyuFirebase.updateDrink(G.roomId, delta);
}

async function exitRoom() {
  if (!confirm('确定退出房间？')) return;
  if (G.roomId && G.playerId) await leaveRoom(G.roomId, G.playerId);
  window.location.href = 'index.html';
}

function applyPlayerData(me) {
  if (!me) return;
  G.myData = me;
  if (!me.hand) {
    setNewHand([], [], []);
    renderCards();
    return;
  }
  setNewHand(me.hand, me.head || [], me.tail || []);
  const arranged = ensureAutoArrangement(me);
  renderCards(arranged);
  refreshResult();
}

async function initGame(roomId, playerId) {
  G.roomId = roomId;
  G.playerId = playerId;
  show('page-game');
  hide('page-home');
  hide('page-setting');

  renderCards(true);
  syncToggleLabels();

  document.getElementById('in-cover').addEventListener('change', e => {
    G.isCovered = e.target.checked;
    if (G.isCovered) {
      resetRevealState(true, true);
    } else {
      G.cards.forEach(card => G.revealedCardIds.add(card.id));
      G.justRevealedCardId = null;
      G.animatingCoveredCardIds = new Set();
    }
    renderCards(true);
    refreshResult();
    if (G.isCovered) {
      setTimeout(() => {
        G.animatingCoveredCardIds = new Set();
      }, 900);
    }
  });

  G.unwatchRoom = watchRoom(roomId, (room) => {
    G.room = room;
    G.isVariant = room.isVariant;
    applyPlayerData(room.players?.[playerId]);
    refreshUI();
    if (room.status === 'finished') toast('本副牌已结束，请洗牌');
  });

  G.unwatchMe = watchHand(roomId, playerId, (data) => {
    applyPlayerData(data);
    refreshUI();
  });
}
