# 水鱼发牌神器 (Shuiyu Dealer)

> 广西水鱼酒桌专用发牌助手 — 一个手机网页打开就能用的多人实时桌游工具，三台手机同房间同步发牌、配牌、判保、记酒。

零原生依赖、零后端代码、纯静态部署。基于 Firebase Realtime Database 实现房间与状态同步，整个应用 < 1 MB，加载即用。

---

## 目录

- [功能特性](#功能特性)
- [游戏玩法](#游戏玩法)
- [在线体验](#在线体验)
- [技术栈](#技术栈)
- [架构总览](#架构总览)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [Firebase 配置](#firebase-配置)
- [本地开发模式](#本地开发模式)
- [构建与部署](#构建与部署)
- [数据库结构](#数据库结构)
- [移动端兼容](#移动端兼容)
- [浏览器支持](#浏览器支持)
- [贡献](#贡献)
- [开源协议](#开源协议)

---

## 功能特性

### 核心玩法
- **多人实时同房**：三台手机连同一房间号即可对局，状态毫秒级同步
- **共享牌堆**：庄家发牌，所有闲家收到不同的 4 张手牌，剩余牌堆全房间共享
- **拖拽配牌**：原生 Pointer Events + GPU 合成，60 FPS 丝滑拖动，磁性吸附目标槽位
- **盖牌 / 翻牌**：手势点击翻牌，开关一键全盖，翻牌带 3D 翻转动效
- **变牌模式**：可开启大小王 + 花牌作为通配 (`配`) 参与判保
- **自动配牌**：每次发牌后自动按最优组合分头铺/尾铺，可手动调整
- **水鱼判定**：双保自动触发"水鱼"金光特效 + 全屏弹窗

### 实战工具
- **记酒器**：每位玩家头顶酒杯计数，加减实时同步全房间
- **换庄**：一键切换庄家，选择列表带高亮与确认
- **重新洗牌**：庄家可一键重置牌堆，所有玩家手牌清空
- **断线重连**：刷新页面后房间状态自动恢复

### 用户体验
- **响应式适配**：从 320×568 (iPhone SE 1) 到 428×926 (iPhone Pro Max) 无缝适配
- **安全区适配**：自动避开刘海、挖孔、Home Indicator
- **金色国风视觉**：定制牌背、首页壁纸，配合金色渐变按钮的高级感
- **大字号牌面**：A/J/Q/K 标准扑克标识，红黑高对比，老花眼也看得清
- **首次上手提示**：空牌区文字引导（"拖入 2 张 · 头铺"），无需文档即懂

---

## 游戏玩法

广西水鱼是流行于广西的酒桌纸牌玩法：

1. 每人发 4 张牌，自由分成"头铺"（2 张）和"尾铺"（2 张）
2. 每铺取两张点数相加，**取个位数**为该铺点数（10、J、Q、K 算 0）
3. 同点数对子算"**保**"，分数为 100 + 较大点数
4. 头铺与尾铺都形成"保"称为"**水鱼**"，最大牌型
5. 闲家点数小于庄家点数时喝酒，反之庄家喝
6. 含 `大王 / 小王 / 花牌` 时若开启变牌，可作为万能配对牌

---

## 在线体验

> 部署到 Vercel 后填入正式链接

- **正式环境**：`https://shuiyu.vercel.app`
- **加入方式**：手机浏览器打开链接 → 输入昵称 → 创建房间 / 输入 4 位房间号加入

---

## 技术栈

| 层 | 技术 |
|---|---|
| **UI** | 原生 HTML5 + CSS3（CSS Variables + Grid + Flexbox） |
| **交互** | 原生 JavaScript（无框架）+ Pointer Events API + requestAnimationFrame |
| **状态同步** | Firebase Realtime Database (Spark 免费档) |
| **构建** | Node.js 自定义脚本（无 Webpack / Vite） |
| **托管** | Vercel 静态部署（Hobby 免费档） |
| **本地开发** | Node.js HTTP 服务器 + Mock Database（无需真实 Firebase） |

**为什么不用框架？** 这是一个 < 100 KB 的工具应用，引入 React/Vue 会让首屏体积翻 5 倍、加载时间翻 2 倍，且没有任何收益。原生 JS + 模块化函数足够维护清晰。

---

## 架构总览

```
┌──────────────────────────────────────┐
│            玩家手机浏览器              │
│  ┌────────────────────────────────┐  │
│  │  index.html  (首页 / 创建房间)  │  │
│  │  game.html   (对局页)           │  │
│  │  game-logic.js (游戏核心 + 拖拽) │  │
│  │  firebase-config.js (DB 抽象层) │  │
│  └────────────────────────────────┘  │
└──────────────┬───────────────────────┘
               │ Firebase JS SDK (websocket)
               ▼
┌──────────────────────────────────────┐
│   Firebase Realtime Database          │
│   ─ rooms/{roomId}/                   │
│     ├─ deck                           │
│     ├─ players/{playerId}/            │
│     ├─ dealer / drinkCount / ...      │
│   规则：4 位数字房间号 + 字段验证      │
└──────────────────────────────────────┘
               ▲
               │ HTTPS
               │
┌──────────────┴───────────────────────┐
│         Vercel CDN (静态托管)          │
│   构建期注入 Firebase 配置             │
│   /assets/* 永久缓存                   │
│   /*.html 不缓存                       │
└──────────────────────────────────────┘
```

**关键设计**：

1. **零业务后端**：所有游戏逻辑（发牌、判保、判分）在客户端运行，Firebase 只做状态广播
2. **共享牌堆**：牌堆挂在 `rooms/{id}/deck`，所有玩家订阅，发牌即原子操作 `cards.splice + push to player.hand`
3. **乐观 UI**：拖拽即时本地渲染，180ms 防抖后写入 Firebase，避免每次拖动一次写入
4. **Mock 数据库**：本地开发时 `firebase-config.js` 检测到 `apiKey === "example"` 自动启用内存版 Mock，可两个标签页对局

---

## 项目结构

```
水鱼v2/
├── index.html              # 首页：创建房间 / 加入房间 / 设置
├── game.html               # 对局页：所有桌面 UI
├── game-logic.js           # 游戏核心 (≈ 800 行)
│   ├─ 牌型计算 (cardPoint / scoreGroup / isBaoGroup)
│   ├─ 自动分牌 (findShuiyuArrangement / autoArrangeHand)
│   ├─ 渲染层 (cardHTML / renderCards / refreshUI)
│   ├─ 拖拽系统 (Pointer Events + rAF + 磁性命中)
│   └─ 房间生命周期 (initGame / joinRoom / exitRoom)
├── firebase-config.js      # Firebase 抽象层 (≈ 600 行)
│   ├─ 真实 Firebase 模式
│   ├─ Mock 内存数据库 (开发用)
│   └─ 业务 API (createRoom / dealFromSharedDeck / ...)
├── firebase.rules.json     # Realtime Database 安全规则
├── vercel.json             # Vercel 构建/缓存配置
├── package.json            # npm 脚本与依赖（仅 Node 内置）
├── assets/                 # 优化后的图片资源
│   ├─ card-back.png        # 牌背 (400×600, 465 KB)
│   ├─ shuiyu-home.png      # 首页背景 (498×1080, 972 KB)
│   └─ shuiyu-win.png       # 抽中水鱼弹窗
├── 图片素材/                # 原始素材源文件 (未压缩)
├── scripts/
│   ├─ build-static.mjs     # 构建：注入 env，复制资源到 dist/
│   └─ local-lan-server.mjs # 局域网服务：build + serve dist + Mock API
├── tests/                  # node:test 单元测试
├── .env.example            # 环境变量模板
└── .env.local              # 本地真实配置（被 .gitignore 排除）
```

---

## 快速开始

### 1. 克隆与安装

```bash
git clone <your-repo-url>
cd shuiyu-dealer
npm install   # 仅装本机开发依赖（生产无依赖）
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
# 用编辑器打开 .env.local，填入 Firebase Web 配置
```

无 Firebase 也能跑（见[本地开发模式](#本地开发模式)）。

### 3. 启动本地服务

```bash
npm run lan
```

输出会列出本机 IP（例如 `http://192.168.1.77:4173`），同 Wi-Fi 下其他手机访问该 URL 即可。

---

## Firebase 配置

### 创建项目

1. 打开 https://console.firebase.google.com
2. **Add project** → 取名（关闭 Google Analytics）
3. **Build → Realtime Database → Create Database**，选区域 `asia-southeast1`，先用 Test mode

### 替换安全规则

将 `firebase.rules.json` 内容粘贴到 Realtime Database → Rules → Publish：

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": "$roomId.matches(/^[0-9]{4}$/)",
        ".write": "$roomId.matches(/^[0-9]{4}$/)",
        ".validate": "newData.hasChildren(['roomId', 'isVariant', 'deck', 'dealer', 'createdAt', 'currentRound', 'status', 'players'])"
      }
    }
  }
}
```

规则逻辑：
- 房间号必须是 4 位数字（`^[0-9]{4}$`）
- 写入时必须包含完整字段（防止脏数据）
- 不需要登录（任何人知道房间号都可以加入）

### 取 Web 配置

Firebase 项目设置 → Your apps → 点 `</>` 添加 Web App → 复制 `firebaseConfig` 的 7 个字段填入 `.env.local`。

> Firebase Web 配置在浏览器可见是设计如此，安全完全由 Database Rules 保证。

---

## 本地开发模式

不想配 Firebase？可以直接用 Mock 模式：

```bash
FIREBASE_API_KEY=example FIREBASE_AUTH_DOMAIN=example.firebaseapp.com FIREBASE_DATABASE_URL=https://example-default-rtdb.firebaseio.com FIREBASE_PROJECT_ID=example FIREBASE_STORAGE_BUCKET=example.appspot.com FIREBASE_MESSAGING_SENDER_ID=123 FIREBASE_APP_ID=app npm run build

npm run preview
```

打开 `http://localhost:4173/index.html`：
- 房间数据写入浏览器 `localStorage`
- 同浏览器开两个标签页可模拟两台手机
- 清空：浏览器控制台 `localStorage.removeItem('shuiyu_mock_db')`

---

## 构建与部署

### 本地构建

```bash
npm run build
# 产物在 dist/，可直接静态托管
```

### 部署到 Vercel

**方式 A：CLI**

```bash
npm install -g vercel@latest
vercel login
vercel link        # 链接到 Vercel 项目
vercel             # 预览部署
vercel --prod      # 正式部署
```

记得在 Vercel Dashboard → Settings → Environment Variables 添加 7 个 Firebase 字段（或用 `vercel env add` 命令）。

**方式 B：GitHub + Vercel Dashboard**

1. push 到 GitHub
2. https://vercel.com/new → Import Git Repository
3. Framework Preset 选 `Other`
4. Environment Variables 填 7 个字段
5. Deploy

`vercel.json` 已配置：
- `/assets/*` → 永久缓存（图片改名后立即更新）
- `*.html`、`*.js` → 不缓存（部署即生效）

---

## 数据库结构

```javascript
{
  "rooms": {
    "1234": {                                  // 4 位房间号
      "roomId": "1234",
      "isVariant": false,                      // 是否开启变牌
      "dealer": "p_lkj9_abc123",               // 庄家 playerId
      "drinkCount": 0,                         // 全房酒杯计数
      "createdAt": 1735000000000,
      "currentRound": 3,                       // 第几轮
      "status": "playing",                     // playing | finished
      "deck": {
        "cards": [{ "id": "c_4_5", ... }],     // 剩余牌堆
        "dealtCount": 12                       // 已发牌数
      },
      "players": {
        "p_lkj9_abc123": {
          "id": "p_lkj9_abc123",
          "name": "玩家1",
          "isOnline": true,
          "joinedAt": 1735000000000,
          "hand": {
            "cards": [...],                    // 4 张手牌
            "head": [...],                     // 头铺 (2 张)
            "tail": [...]                      // 尾铺 (2 张)
          },
          "drinkCount": 0
        }
      }
    }
  }
}
```

---

## 移动端兼容

适配范围（实测覆盖）：

| 设备 | 视口 | 状态 |
|---|---|---|
| iPhone SE 1 / 5s | 320×568 | 极矮屏断点：隐藏玩家列表、压缩行高，一屏不滚 |
| iPhone SE 2/3 | 375×667 | 标准布局 |
| iPhone 12 / 13 / 14 | 390×844 | 标准布局 |
| iPhone 14 Pro Max | 428×926 | 大屏断点：卡片撑到 152 px |
| 入门安卓 | 360×640 | 矮屏断点 |
| Galaxy A 系 | 360×780 | 标准布局 |
| Galaxy S Ultra | 412×915 | 大屏断点 |

**适配技术**：
- `100dvh` + `safe-area-inset-*` 适配刘海与 Home Indicator
- 三档媒体查询：`≤ 340px` 极窄、`≤ 380px` 小屏、`≤ 568/640px` 矮屏
- 所有触控目标 ≥ 40 px（符合 iOS HIG 推荐）
- `touch-action: none` + Pointer Events 统一处理触控/鼠标
- `-webkit-text-size-adjust: 100%` 防止 iOS 横屏字体跳变

---

## 浏览器支持

| 浏览器 | 最低版本 |
|---|---|
| Safari (iOS) | 14+ |
| Chrome (Android) | 90+ |
| Edge | 90+ |
| Firefox | 88+ |

依赖的现代特性：
- Pointer Events
- CSS Grid / `clamp()` / `dvh`
- `BigInt` (Firebase SDK 内部)
- `structuredClone` (Mock DB)

---

## 贡献

欢迎提 issue / PR：

```bash
git checkout -b feature/your-feature
# 改代码
npm test
npm run check    # 跑测试 + 构建
git commit -m "feat: ..."
git push
```

代码风格：
- 函数式优先，避免类（除非状态封装）
- 文件 < 1000 行，超出考虑拆分
- 不引入运行时依赖（保持纯静态）

---

## 开源协议

MIT License — 自由使用、修改、分发。Firebase 与 Vercel 各自的服务条款仍适用。

---

## 致谢

- Firebase Realtime Database — 让小项目也能用上专业实时同步
- Vercel — 静态托管 + 全球 CDN 零成本
- 广西人民 — 创造了这个让酒桌升级的玩法
