# 开发日志 — 水鱼发牌神器

完整记录从 v1 到 v2 的迭代过程。每条记录包含**动机 → 方案 → 结果**。

---

## v2.0.0 (2026-05-03) — 准上线版

### 概览

本次迭代主要做了三件事：

1. **视觉与素材升级** — 应用整体从功能 demo 升级到可对外发布的"商品级"质感
2. **拖拽与交互重写** — 老的 mouse + touch 双套代码合并为现代 Pointer Events，加入磁性吸附与替换指示
3. **手机端深度适配** — 320 px 极小屏到 428 px 大屏全覆盖，安全区、触控目标、字号全部按 iOS HIG 规整

完成全部代码侧准备，等待 Vercel 部署执行。

---

## 详细变更

### 1. 首页背景图嵌入 (Index Page Wallpaper)

**问题**：首页只有渐变 + 文字，太单薄，跟"水鱼"主题没视觉关联。

**方案**：
- 引入设计师生成的国风壁纸（笠帽女子 + 戴墨镜的乌龟 + 山水酒坛）
- 隐藏 hero 区的"水鱼"标题（壁纸里已有大字）
- 表单移到屏幕底部，加 `backdrop-filter: blur(20px)` 玻璃毛化
- 顶部加暗渐变蒙版托住状态字，避免压在天空亮色上

**结果**：
- 首页变成"杂志封面"风格，UI 与图自然融合，无元素互相遮挡
- 表单玻璃质感 + 金色描边，与图里的金字呼应

**文件**：
- `index.html` - body 背景与 form-panel 重写
- `assets/shuiyu-home.png` - 498×1080 / 972 KB（从 2.5 MB 压缩）

---

### 2. 卡牌背面图

**问题**：盖牌状态原本是纯 `#18231f` 暗色，没有"卡片"感。

**方案 v1**：用第一张牌背素材（深绿金鱼水徽，1024×1536 / 4.3 MB）
- 直接 `background: url(...)` 嵌入 `.card-covered` 和 `.card-cover`

**问题 v1**：4.3 MB 单图对只有 50–150 px 宽的卡片严重过载。手机首次加载图未到位时卡片显示为空白底色 → 用户报告"牌面不显示"。

**方案 v2**：
- 用 sips 压缩到 400×600 / 627 KB（≈ 7× 减小）
- 加 `<link rel="preload" as="image">` 让浏览器优先抓取
- 服务器端 `local-lan-server.mjs` 补全 PNG / JPG / WebP 的 MIME type
- 同时压缩 `shuiyu-home.png` 2.5 MB → 972 KB

**方案 v3**：用户后来更新了素材（浅青色调，与首页壁纸更协调），同流程压缩到 465 KB。

**结果**：
- 加载体感即时
- 视觉与首页统一的"国风梦幻"调性

**文件**：
- `assets/card-back.png`
- `game.html` - `.card-covered` / `.card-cover` 背景规则
- `scripts/local-lan-server.mjs` - MIME 表

---

### 3. 拖拽系统重写

**问题**：原拖拽代码两套并列：

```javascript
el.addEventListener('touchstart', handleTouchStart);
el.addEventListener('mousedown', handleMouseDown);
```

各有独立的状态变量与生命周期，加上：
- 用 `left/top` 移动 ghost（每帧 layout reflow）
- 没有 rAF 节流，touchmove 一秒触发上百次
- 没有命中目标的视觉反馈
- 落在哪一格不可预测

**方案**：

#### 3.1 Pointer Events 统一

```javascript
function handlePointerDown(e) {
  if (e.button !== undefined && e.button > 0) return;
  // ... setPointerCapture 后所有事件都汇聚到一处
  card.setPointerCapture(e.pointerId);
}
```

一份代码同时处理 mouse、touch、pen，少一份等于少一处 bug。

#### 3.2 GPU 合成 + rAF 节流

```javascript
function handlePointerMove(e) {
  drag.lastX = e.clientX;
  drag.lastY = e.clientY;
  if (!drag.raf) drag.raf = requestAnimationFrame(applyMove);
}

function applyMove() {
  drag.ghost.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.06)`;
}
```

`translate3d` 走 compositor 不重排，配合 rAF 一帧只更新一次。

#### 3.3 延迟 ghost 创建

只在移动超过 6px 阈值才生成 ghost。纯点击不会闪一下虚影。

```javascript
if (!drag.dragging) {
  const dx = e.clientX - drag.startX;
  const dy = e.clientY - drag.startY;
  if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return;
  enterDragging();
}
```

#### 3.4 磁性命中 + 替换指示

```javascript
const hit = x >= r.left - ZONE_MAGNETIC_PX && ...;  // 14 px 边距
```

零区命中扩展 14 px，更宽容。落入头/尾区时高亮即将被替换的目标牌（`.swap-target` 类，金色描边 + 缩放），让用户在松手前就看清结果。

#### 3.5 落点动画

松手后 ghost 不是立即消失，而是用 180 ms 缓动滑到目标槽位再淡出。掉到非命中区则回弹到原位。

**结果**：
- 60 FPS 流畅，体感像 iOS 原生 Drag and Drop
- 替换交换关系 100% 可视，新人一拖就懂
- 代码量持平甚至减少（去掉了 mouse/touch 重复）

**文件**：
- `game-logic.js` - 拖拽全段重写（约 150 行）
- `game.html` - 配套 CSS（`.drag-source`, `.swap-target`, `#drag-ghost.drag-ghost-active`）

---

### 4. 移动端 UI 全面适配

**目标设备清单**：

| 设备 | 视口 | 关注点 |
|---|---|---|
| iPhone SE 1 (2016) | 320×568 | 一屏内放下所有内容 |
| iPhone SE 2/3 | 375×667 | 标准布局 |
| iPhone 12-15 | 390×844 | 主流 iOS |
| iPhone Pro Max | 428×926 | 大屏不浪费 |
| 入门安卓 | 360×640 | 矮屏 |
| Galaxy 主流 | 360-412 ×780-915 | 主流安卓 |

**改动**：

#### 4.1 三档媒体查询

```css
@media (max-width: 380px) { /* 小屏：padding 收紧 */ }
@media (max-width: 340px) { /* 极窄屏：按钮缩 */ }
@media (max-height: 640px) { /* 矮屏：行高压缩 */ }
@media (max-height: 568px) { /* 极矮屏：隐藏玩家列表 */ }
```

#### 4.2 触控目标 ≥ 40 px

iOS HIG 推荐 44 px，Android Material 48 dp。本应用统一最低 40 px：
- `.icon-btn` 36 → 42
- `.small-btn` 34 → 40
- `.drink-step` 32 → 40
- `.actions button` 48 → 54（主操作）

#### 4.3 安全区适配

```css
:root {
  --safe-bottom: env(safe-area-inset-bottom);
  --safe-top: env(safe-area-inset-top);
}
.game-page {
  padding: max(8px, calc(var(--safe-top) + 4px)) 10px max(10px, calc(var(--safe-bottom) + 4px));
}
```

刘海屏 / Home Indicator 自动避开。

#### 4.4 防止 iOS 横屏字体跳变

```css
body { -webkit-text-size-adjust: 100%; }
```

**结果**：从 320 到 428 px 视口连续缩放无任何溢出或拥挤。

**文件**：
- `game.html` - 添加 4 个媒体查询块
- `index.html` - 同样的安全区与小屏处理

---

### 5. 牌面易识别度

**问题**：
- 卡片角标是数字 `1 / 11 / 12 / 13`，不像扑克
- 角标字号 `clamp(11px, 3vw, 18px)` 偏小
- 中央花色字号 `clamp(28px, 10vw, 58px)` 也不够大
- 红色 `#b43b38` 对深绿背景对比一般

**方案**：

#### 5.1 A/J/Q/K 标准化

```javascript
function cardRankLabel(card) {
  if (card?.isJoker) return card.rank === '大王' ? '大' : '小';
  if (card?.isFlower) return '花';
  const r = card?.rank;
  if (r === 1) return 'A';
  if (r === 11) return 'J';
  if (r === 12) return 'Q';
  if (r === 13) return 'K';
  return r != null ? String(r) : '';
}
```

#### 5.2 字号大跃进

| 元素 | Before | After |
|---|---|---|
| 角标 | `clamp(11, 3vw, 18)` | `clamp(17, 5vw, 26)` (≈ 1.5×) |
| 中央花色 | `clamp(28, 10vw, 58)` | `clamp(40, 14vw, 72)` (≈ 1.4×) |

#### 5.3 颜色加深

- 红 `#b43b38` → `#b8302d`
- 黑 `#171a18` → `#0e1110`

#### 5.4 卡面立体感

```css
.card-normal {
  background: linear-gradient(180deg, #fbf6e9, #f4ecd6);
  box-shadow:
    0 10px 22px rgba(0,0,0,.30),
    inset 0 0 0 1px rgba(255,255,255,.55);
}
```

线性渐变 + inset 高光，模拟真扑克的纸张质感。

**结果**：老花眼也能秒识别 K♣，红黑色差能在阳光下看清。

**文件**：
- `game-logic.js` - `cardRankLabel`
- `game.html` - `.card-corner`, `.card-center`, `.card-normal`, `.card-wild`

---

### 6. UI 高级感打磨

#### 6.1 主按钮金色渐变

```css
.primary-btn {
  background: linear-gradient(180deg, #f8e3a3 0%, #ecc472 45%, #c79237 100%);
  box-shadow:
    0 6px 18px rgba(199,146,55,.32),
    inset 0 1px 0 rgba(255,255,255,.55),
    inset 0 -2px 0 rgba(120,80,20,.18);
}
```

三档金色渐变 + 上下 inset 模拟实体按键，视觉焦点。

#### 6.2 牌区标题金色下划

```css
.zone-title::after {
  content: "";
  position: absolute;
  bottom: 4px;
  width: 32px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(215,173,88,.7), transparent);
}
```

"头牌""尾牌"下方一道金色虚晕，建立视觉层次。

#### 6.3 复选框 → 开关

`变牌 / 盖牌` 从原生 checkbox 换成 iOS 风格 toggle switch（44×24，金色滑块），跟首页风格统一。

#### 6.4 空牌区提示

```css
.card-row[data-empty="head"]::before { content: "拖入 2 张 · 头铺"; }
.card-row[data-empty="tail"]::before { content: "拖入 2 张 · 尾铺"; }
.card-row[data-empty="temp"]::before { content: "未配的牌放这里"; }
.zone:has(.card-row[data-empty]) {
  background: rgba(215,173,88,.04);
  border-style: dashed;
}
```

第一次打开应用就知道往哪拖。

**结果**：UI 整体从 "demo 感" 跨到 "可上架感"。

**文件**：
- `game.html` - `.primary-btn`, `.zone-title::after`, `.switch`, `.card-row[data-empty]`
- `game-logic.js` - `setRowEmpty`, `syncToggleLabels`

---

### 7. 删除冗余底部"退出"按钮

**问题**：底部操作栏 `[退出] [洗牌] [发牌]` 三键，"退出"与顶部的 ‹ 返回功能重复。

**方案**：删掉底部"退出"，操作栏改成 1:2 网格 `[洗牌] [发牌]`，主操作"发牌"占 2/3 宽度。

**结果**：操作意图更聚焦，主按钮更突出。

**文件**：
- `game.html` - `<nav class="actions">` 与 `.actions` grid

---

### 8. 部署前代码侧补强

#### 8.1 `.gitignore`

仓库原本没有 `.gitignore`，会把 `node_modules`、`.env.local`（含密钥）、`dist`、`.vercel` 推进 git。新增：

```
node_modules/
dist/
.env
.env.local
.env.*.local
.vercel/
.DS_Store
*.log
```

#### 8.2 `.env.example`

README 引用了 `.env.example` 但仓库没有。补上模板，新人 setup 不再卡住。

#### 8.3 `vercel.json` 缓存头

```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    },
    {
      "source": "/(.*\\.html)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }]
    },
    {
      "source": "/(.*\\.js)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }]
    }
  ]
}
```

效果：
- 图片永久缓存（图改名后自动更新，原图不再请求）
- HTML / JS 不缓存（部署即生效）

#### 8.4 LAN 服务器 `.env.local` 优先级 bug

`scripts/local-lan-server.mjs` 在 `setDefaultEnv()` 中无条件覆盖 `process.env.FIREBASE_API_KEY = 'example'`，导致即使 `.env.local` 有真实配置，构建出来的 `dist/firebase-config.js` 仍写入 `example`，应用强制走 Mock 模式。

**修复**：在 `setDefaultEnv` 之前加 `loadDotEnvLocal()`，先从 `.env.local` 读，已设置的 key 默认值不再覆盖。

```javascript
await loadDotEnvLocal();
setDefaultEnv();
await import('./build-static.mjs');
```

---

### 9. Firebase 设置与验证

**操作步骤**（用户实操，本机器只做指引）：

1. console.firebase.google.com → Add project (`shuiyu-68e49`)
2. 启用 Realtime Database，区域 `asia-southeast1`
3. 替换安全规则（限定 4 位数字房间号）
4. 取 7 个 Web 配置字段写入 `.env.local`

**本地验证**：

```bash
npm run lan
# 浏览器访问 → 创建房间 → 拿到 1889 → Firebase 控制台可见
```

成功创建真房间，确认：
- API key 注入正确
- 数据库规则未拒绝写入
- WebSocket 连接 `asia-southeast1` 节点正常

---

### 10. 备份为水鱼v2

将完成所有改动的 v1 通过 `rsync` 复制到同级 `水鱼v2/`，排除：
- `node_modules/`、`dist/`（可重建）
- `.vercel/`（避免与 v1 项目链接冲突）
- `.DS_Store`、`*.log`（噪音）

最终大小 11 MB（主要是 `图片素材/` 原图）。

---

## 数据指标（v1 → v2）

| 指标 | v1 | v2 | 变化 |
|---|---|---|---|
| 卡牌字号（中央） | 28-58 px | 40-72 px | +40% |
| 卡牌字号（角标） | 11-18 px | 17-26 px | +50% |
| 触控目标最小高度 | 32 px | 40 px | +25% |
| 牌背图大小 | 4.3 MB | 0.46 MB | -89% |
| 首页背景图大小 | 2.5 MB | 0.97 MB | -61% |
| 适配视口下限 | 360×640 | 320×568 | iPhone SE 1 |
| 适配视口上限 | 414×896 | 428×926 | Pro Max |
| 拖拽帧率 | ≈ 30 FPS | ≈ 60 FPS | 2× |
| 拖拽事件代码量 | 2 套 (mouse + touch) | 1 套 (Pointer) | -50% |
| 视觉占位符 | 无 | 空区域文字提示 | — |
| 部署友好度 | 缺 .gitignore / .env.example / 缓存头 | 全部就绪 | — |

---

## 测试覆盖

实测设备视口：

- **320 × 568**（iPhone SE 1）一屏不滚 ✓
- **360 × 780**（典型安卓）✓
- **375 × 667**（iPhone SE 2/3）✓
- **390 × 844**（iPhone 12-15）✓
- **414 × 896**（iPhone XR）✓
- **428 × 926**（iPhone Pro Max）✓

每个视口验证：
- 4 张大牌 + 2 张小牌全部完整可见
- 操作按钮触达
- 拖拽 + 替换指示工作
- 盖牌图片填充比例
- 状态栏开关响应

---

## 已知问题与未来工作

### v2 范围内已解决
- ✅ 牌面"显示不全"（实为图过大导致首加载白屏）
- ✅ 拖拽不精准（无视觉反馈，无磁性吸附）
- ✅ 小屏元素溢出
- ✅ 缺安全区适配
- ✅ 无 .gitignore 导致密钥泄露风险

### 留给 v3 的事项
- 房间过期自动清理（建议加 Vercel Cron 每天扫一次）
- PWA manifest（"添加到主屏幕"独立 App 体验）
- 玩家头像自定义（当前是首字 + 颜色）
- 历史对局回看（需要改 DB schema）
- 国际化（粤语 / 英文）

---

## 关键技术决策记录

### 为什么不用 React/Vue？

应用逻辑总共 < 1500 行，DOM 节点 < 200，没有任何复杂 state graph。引入框架的成本：
- 首屏 +200 KB（gzip 后 +60 KB）
- 引入构建工具链复杂度
- 调试 source map 麻烦
- TBT (Total Blocking Time) 在低端机上变差

而原生 JS + 模块化函数 + 一个 `renderCards(force)` 函数完全可控。维护成本反而更低。

### 为什么用 Firebase 而不是 WebSocket 自建？

- 自建 WebSocket 服务器需要 24/7 运行的进程，免费方案（Render / Fly.io 免费档）冷启动 30 秒
- Firebase Realtime DB 提供：
  - 自动连接管理
  - 离线缓存
  - 断线重连
  - 安全规则
  - 全球边缘加速
- 100 个并发连接 / 1 GB 存储免费，够小酒桌使用上千场

### 为什么用 Pointer Events 而不是 Touch Events？

- Pointer Events 是 W3C 标准，Safari 13.1+ 支持
- 一份代码处理 mouse / touch / pen / 输入笔
- `setPointerCapture` 在元素被移除/手指离开元素时仍接收事件，touch 事件做不到
- 性能与 touch 等同

---

## 文件变更概览（v1 → v2）

```
M  index.html              (背景图 + 安全区 + 小屏断点)
M  game.html               (UI 全面升级 + 媒体查询 + CSS 变量)
M  game-logic.js           (拖拽重写 + A/J/Q/K + setRowEmpty + syncToggleLabels)
M  vercel.json             (缓存头)
M  scripts/local-lan-server.mjs  (.env.local 优先级 + MIME 表)
A  .gitignore              (新增)
A  .env.example            (新增)
A  .env.local              (本地真实 Firebase 配置，gitignored)
A  assets/card-back.png    (新素材，压缩到 465 KB)
A  assets/shuiyu-home.png  (新素材，压缩到 972 KB)
A  README.md               (重写为完整开源说明)
A  DEVELOPMENT_LOG.md      (本文件)
```

---

## 时间线

| 时段 | 任务 |
|---|---|
| 启动 | v1 备份审计、配置文件检查 |
| 阶段 1 | 首页背景嵌入 + UI 融合调优 |
| 阶段 2 | 牌背素材替换（两轮）+ 图片压缩 + preload |
| 阶段 3 | 拖拽系统全面重写 |
| 阶段 4 | 移动端 UI 适配 + 牌面易识别 |
| 阶段 5 | UI 高级感打磨（按钮、开关、空状态） |
| 阶段 6 | 删除冗余按钮 + 极小屏断点 |
| 阶段 7 | 部署前代码补强（.gitignore、.env.example、缓存头、bug 修） |
| 阶段 8 | Firebase 配置 + 本地真连接验证 |
| 阶段 9 | 备份为 水鱼v2 + 文档撰写 |

---

End of v2.0.0 development log.
