# 🐟 水鱼发牌神器

> 广西水鱼酒桌专用发牌助手 — 一个手机网页打开就能用的多人实时桌游工具

<p align="center">
  <img src="水鱼v2/assets/shuiyu-home.png" alt="水鱼发牌神器" width="280" />
</p>

<p align="center">
  <a href="https://shuiyu.vercel.app"><img src="https://img.shields.io/badge/🔗-在线体验-16A34A?style=for-the-badge" alt="在线体验" /></a>
  <a href="https://github.com/your-username/shuiyu-dealer"><img src="https://img.shields.io/badge/⭐-Star-F59E0B?style=for-the-badge" alt="Star" /></a>
  <a href="https://github.com/your-username/shuiyu-dealer/blob/main/LICENSE"><img src="https://img.shields.io/badge/📄-MIT License-3B82F6?style=for-the-badge" alt="License" /></a>
</p>

---

## ✨ 功能特性

### 🎮 核心玩法

| 功能 | 说明 |
|------|------|
| 🔗 **多人实时同房** | 输入房间号码/同一房间号即可对局，状态毫秒级同步 |
| 🃏 **共享牌堆** | 庄家发牌，所有闲家收到不同的4张手牌，剩余牌堆全房间共享 |
| ✋ **拖拽配牌** | 原生Pointer Events + GPU合成，60 FPS丝滑拖动，磁性吸附目标槽位 |
| 🔄 **盖牌/翻牌** | 手势点击翻牌，开关一键全盖，翻牌带3D翻转动效 |
| 🎯 **变牌模式** | 可开启大小王+花牌作为通配(`配`)参与判保 |
| 🤖 **自动配牌** | 每次发牌后自动按最优组合分头铺/尾铺，可手动调整 |
| 🌟 **水鱼判定** | 双保自动触发"水鱼"金光特效 + 全屏弹窗 |

### 🛠️ 实战工具

| 功能 | 说明 |
|------|------|
| 🍺 **记酒器** | 每位玩家头顶酒杯计数，加减实时同步全房间 |
| 🔄 **换庄** | 一键切换庄家，选择列表带高亮与确认 |
| 🔀 **重新洗牌** | 庄家可一键重置牌堆，所有玩家手牌清空 |
| 📡 **断线重连** | 刷新页面后房间状态自动恢复 |

### 📱 用户体验

| 特性 | 说明 |
|------|------|
| 📐 **响应式适配** | 从320×568 (iPhone SE 1) 到428×926 (iPhone Pro Max) 无缝适配 |
| 🛡️ **安全区适配** | 自动避开刘海、挖孔、Home Indicator |
| 🎨 **金色国风视觉** | 定制牌背、首页壁纸，配合金色渐变按钮的高级感 |
| 🔤 **大字号牌面** | A/J/Q/K标准扑克标识，红黑高对比，老花眼也看得清 |
| 💡 **首次上手提示** | 空牌区文字引导("拖入2张·头铺")，无需文档即懂 |

---

## 🎯 游戏玩法

广西水鱼是流行于广西的酒桌纸牌玩法：

```
📋 规则速览

1️⃣  每人发4张牌，自由分成"头铺"(2张)和"尾铺"(2张)
2️⃣  每铺取两张点数相加，个位数 为该铺点数（10/J/Q/K算0）
3️⃣  同点数对子算"保"，分数为 100 + 较大点数
4️⃣  头铺与尾铺都形成"保"称为"水鱼"，最大牌型
5️⃣  闲家点数小于庄家点数时喝酒，反之庄家喝
6️⃣  含大王/小王/花牌时若开启变牌，可作为万能配对牌
```

---

## 🎨 界面设计

### 设计关键词

| 关键词 | 说明 |
|--------|------|
| 🍺 **酒桌实用** | 不做复杂竞技感，不做多余动画和社交装饰 |
| 📺 **大屏可读** | 牌面、结果、房间号、发牌按钮必须远距离可读 |
| 🎨 **高对比** | 深绿色牌桌背景 + 白色牌面 + 金色水鱼提示 + 红色"保" |
| 👆 **低误触** | 关键操作按钮尺寸大，退出、换庄等高风险操作需要二次确认 |
| 📐 **三段明确** | 游戏主界面必须严格分为头牌区、尾牌区、底部结果栏 |

### 色彩规范

```css
:root {
  /* 背景色系 */
  --bg-primary:      #0D2818;  /* 主背景深绿 - 模拟牌桌，降低刺眼感 */
  --bg-secondary:    #1A472A;  /* 牌桌绿 - 页面主体和弹窗背景 */
  --bg-tertiary:     #2D5A3D;  /* 辅助绿 - 区域边界、按钮悬停、弱提示 */
  
  /* 强调色系 */
  --gold-shuiyu:     #FFD700;  /* 金色水鱼 - "水鱼！"、房间号、重点奖励提示 */
  --red-bao:         #FF4444;  /* 红色保 - 对子结果"保" */
  
  /* 操作色系 */
  --green-action:    #16A34A;  /* 操作绿 - 发牌、确认、创建房间 */
  --blue-action:     #2563EB;  /* 操作蓝 - 加入房间、分享房间号 */
  --red-danger:      #DC2626;  /* 危险红 - 退出、扣酒、取消危险操作 */
  
  /* 牌面色系 */
  --card-white:      #FFFFFF;  /* 白色牌面 - 扑克牌底色 */
}
```

### 字号规范

| 元素 | 字号 | 说明 |
|------|------|------|
| 首页标题 | 36-44px | 粗体，品牌展示 |
| 房间号 | 44-56px | 粗体，增加字距 |
| 游戏结果 | 44-56px | 超粗体，远距离可读 |
| "水鱼！"提示 | 28-40px | 金色粗体，视觉焦点 |
| 扑克牌点数 | Georgia | 衬线字体，增强纸牌识别感 |
| 顶部状态文字 | 12-16px | 紧凑清晰 |

### 界面预览

#### 首页
```
┌────────────────────────────────────┐
│                                    │
│         🐟 水鱼发牌神器              │
│      广西水鱼酒桌专用               │
│                                    │
│    ┌──────────────────────────┐    │
│    │     请输入昵称            │    │
│    └──────────────────────────┘    │
│                                    │
│    ○ 变牌模式 (默认关闭)            │
│                                    │
│    ┌──────────────────────────┐    │
│    │      🏠 创建房间           │    │
│    └──────────────────────────┘    │
│                                    │
│    ┌────┐   ┌──────────────────┐  │
│    │1234│   │   加入房间 →       │  │
│    └────┘   └──────────────────┘  │
│                                    │
│    多人同房间，共用一副牌            │
│                                    │
└────────────────────────────────────┘
```

#### 游戏主界面
```
┌────────────────────────────────────┐
│ 房间 1234  │ 小明 │ 庄家 │ 🍺 3  🔄 │
├────────────────────────────────────┤
│              头牌 (2张)              │
│         ┌─────┐  ┌─────┐          │
│         │  A  │  │  K  │          │
│         │  ♠  │  │  ♥  │          │
│         └─────┘  └─────┘          │
├────────────────────────────────────┤
│              尾牌 (2张)              │
│         ┌─────┐  ┌─────┐          │
│         │  5  │  │  5  │  ← 保！   │
│         │  ♣  │  │  ♦  │          │
│         └─────┘  └─────┘          │
├────────────────────────────────────┤
│              临时区                  │
│    ┌─────┐  ┌─────┐               │
│    │  8  │  │  3  │               │
│    └─────┘  └─────┘               │
├────────────────────────────────────┤
│    剩余: 24张        🔒 全盖牌      │
├────────────────────────────────────┤
│  头铺: -   │  🌟水鱼！🌟  │  尾铺:保 │
├────────────────────────────────────┤
│      🚪 退出      │  🎴 下一局      │
└────────────────────────────────────┘
```

### 布局比例

| 区域 | 高度占比 | 内容 |
|------|----------|------|
| 顶部状态栏 | 8%-10% | 房间号、昵称、角色、换庄、记酒 |
| 头牌区 | 35%-40% | 两张超大头牌 |
| 尾牌区 | 25%-30% | 两张超大尾牌 |
| 临时牌区 | 12%-16% | 未分配的4张牌或剩余待摆牌 |
| 剩余牌/盖牌行 | 4%-6% | 剩余牌数、盖牌开关 |
| 结果栏 | 13%-16% | 头铺结果、水鱼提示、尾铺结果 |
| 操作栏 | 8%-10% | 退出、发牌/下一局 |

---

## 🚀 快速开始

### 1. 在线体验

> 无需安装，手机浏览器直接打开

🔗 **https://shuiyu09.vercel.app/**

```
📱 加入方式：
1. 手机浏览器打开链接
2. 输入昵称
3. 创建房间 / 输入4位房间号加入
```

### 2. 本地开发

```bash
# 克隆项目
git clone https://github.com/your-username/shuiyu-dealer.git
cd shuiyu-dealer

# 安装依赖
npm install

# 复制环境变量配置
cp .env.example .env.local
# 编辑 .env.local，填入 Firebase Web 配置

# 启动本地服务
npm run lan
```

> 💡 **无 Firebase 也能跑**：使用 `FIREBASE_API_KEY=example` 可启用 Mock 模式

---

## 🏗️ 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| **UI** | 原生 HTML5 + CSS3 | CSS Variables + Grid + Flexbox |
| **交互** | 原生 JavaScript | Pointer Events API + requestAnimationFrame |
| **状态同步** | Firebase Realtime Database | Spark 免费档 |
| **构建** | Node.js 自定义脚本 | 无 Webpack/Vite，保持轻量 |
| **托管** | Vercel | Hobby 免费档，全球 CDN |
| **测试** | Node.js 内置 test 模块 | 轻量单元测试 |

> 📦 **为什么不用框架？** 这是一个 < 100 KB 的工具应用，引入 React/Vue 会让首屏体积翻5倍、加载时间翻2倍。原生 JS + 模块化函数足够维护清晰。

---

## 📁 项目结构

```
shuiyu-dealer/
├── index.html              # 首页：创建房间 / 加入房间 / 设置
├── game.html               # 对局页：所有桌面 UI
├── game-logic.js           # 游戏核心 (≈800行)
│   ├── 牌型计算 (cardPoint / scoreGroup / isBaoGroup)
│   ├── 自动分牌 (findShuiyuArrangement / autoArrangeHand)
│   ├── 渲染层 (cardHTML / renderCards / refreshUI)
│   ├── 拖拽系统 (Pointer Events + rAF + 磁性命中)
│   └── 房间生命周期 (initGame / joinRoom / exitRoom)
├── firebase-config.js       # Firebase 抽象层 (≈600行)
│   ├── 真实 Firebase 模式
│   ├── Mock 内存数据库 (开发用)
│   └── 业务 API (createRoom / dealFromSharedDeck / ...)
├── firebase.rules.json     # Realtime Database 安全规则
├── vercel.json             # Vercel 构建/缓存配置
├── package.json            # npm 脚本与依赖
├── assets/                 # 优化后的图片资源
│   ├── card-back.png       # 牌背 (400×600)
│   ├── shuiyu-home.png     # 首页背景
│   └── shuiyu-win.png      # 水鱼弹窗
├── 图片素材/                # 原始素材源文件
├── scripts/
│   ├── build-static.mjs    # 构建：注入 env，复制资源
│   └── local-lan-server.mjs # 局域网服务
├── tests/                  # 单元测试
├── .env.example            # 环境变量模板
└── .env.local              # 本地配置 (gitignore)
```

---

## ⚙️ Firebase 配置

### 1. 创建项目

1. 打开 [Firebase Console](https://console.firebase.google.com)
2. **Add project** → 取名（关闭 Google Analytics）
3. **Build → Realtime Database → Create Database**
   - 区域：`asia-southeast1`
   - 模式：Test mode

### 2. 配置安全规则

将 `firebase.rules.json` 内容粘贴到 **Realtime Database → Rules → Publish**：

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

### 3. 获取 Web 配置

Firebase 项目设置 → Your apps → 点 `</>` 添加 Web App → 复制 `firebaseConfig` 填入 `.env.local`

---

## 🌐 部署

### 部署到 Vercel

```bash
# 方式一：CLI
npm install -g vercel
vercel login
vercel --prod

# 方式二：GitHub + Vercel Dashboard
# 1. push 到 GitHub
# 2. https://vercel.com/new → Import Git Repository
# 3. Framework Preset 选 Other
# 4. 添加环境变量 (7个Firebase字段)
# 5. Deploy
```

---

## 📊 数据库结构

```javascript
{
  "rooms": {
    "1234": {
      "roomId": "1234",
      "isVariant": false,           // 是否开启变牌
      "dealer": "p_lkj9_abc123",    // 庄家 playerId
      "drinkCount": 0,              // 全房酒杯计数
      "createdAt": 1735000000000,
      "currentRound": 3,
      "status": "playing",
      "deck": {
        "cards": [{ "id": "c_4_5", ... }],
        "dealtCount": 12
      },
      "players": {
        "p_lkj9_abc123": {
          "id": "p_lkj9_abc123",
          "name": "小明",
          "isOnline": true,
          "joinedAt": 1735000000000,
          "hand": {
            "cards": [...],  // 4张手牌
            "head": [...],   // 头铺(2张)
            "tail": [...]    // 尾铺(2张)
          },
          "drinkCount": 0
        }
      }
    }
  }
}
```

---

## 📱 移动端兼容

| 设备 | 视口 | 状态 |
|------|------|------|
| iPhone SE 1/5s | 320×568 | 极矮屏断点：隐藏玩家列表 |
| iPhone SE 2/3 | 375×667 | ✅ 标准布局 |
| iPhone 12/13/14 | 390×844 | ✅ 标准布局 |
| iPhone 14 Pro Max | 428×926 | 大屏断点：卡片撑到152px |
| 入门安卓 | 360×640 | 矮屏断点 |
| Galaxy A系 | 360×780 | ✅ 标准布局 |

---

## 🌐 浏览器支持

| 浏览器 | 最低版本 |
|--------|----------|
| Safari (iOS) | 14+ |
| Chrome (Android) | 90+ |
| Edge | 90+ |
| Firefox | 88+ |

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

```bash
# 1. Fork 本仓库
# 2. 创建功能分支
git checkout -b feature/your-feature

# 3. 提交更改
git commit -m "feat: add some feature"

# 4. 推送分支
git push origin feature/your-feature

# 5. 创建 Pull Request
```

### 代码规范

- 函数式优先，避免类（除非状态封装）
- 单文件 < 1000 行，超出考虑拆分
- 不引入运行时依赖（保持纯静态）

---

## 📄 开源协议

MIT License — 自由使用、修改、分发。

> ⚠️ Firebase 与 Vercel 各自的服务条款仍适用。

---

## 🙏 致谢

- [Firebase](https://firebase.google.com/) — 让小项目也能用上专业实时同步
- [Vercel](https://vercel.com/) — 静态托管 + 全球 CDN 零成本
- **广西人民** — 创造了这个让酒桌升级的玩法

---

<p align="center">
  <sub>Made with ❤️ for 广西水鱼爱好者</sub>
</p>
