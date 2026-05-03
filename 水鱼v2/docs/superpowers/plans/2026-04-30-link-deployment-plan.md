# Link-Ready Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Shuiyu dealing assistant usable from a public HTTPS link, so players can open the app on their phones and share realtime rooms.

**Architecture:** Keep the current app as a lightweight static H5 app hosted on Vercel. Use Firebase Realtime Database as the shared room/deck backend. Add a small build step that copies static assets into `dist/` and injects Firebase public config from environment variables for deployment.

**Tech Stack:** Static HTML/CSS/JS, Firebase Realtime Database browser SDK, Vercel static hosting, Node.js build script.

---

## File Structure

- Modify `firebase-config.js`: fix deployment config handling, shared deck return value, and expose the service functions under a namespaced object.
- Modify `game-logic.js`: fix the drink counter name collision, remove references to missing button IDs, and keep runtime behavior compatible with the existing HTML.
- Modify `index.html`: keep current static shell and make sure it uses the deployable Firebase config file.
- Modify `game.html`: align button handlers and IDs with `game-logic.js`.
- Create `package.json`: define local preview and build commands.
- Create `scripts/build-static.mjs`: copy deployable static files into `dist/` and inject Firebase config from environment variables.
- Create `vercel.json`: tell Vercel to publish `dist/`.
- Create `.gitignore`: keep local secrets and build output out of git.
- Create `.env.example`: document required Firebase public config keys.
- Create `firebase.rules.json`: provide safe starter Realtime Database rules for rooms.
- Create `README.md`: document setup, local run, Firebase setup, and Vercel deployment.

## Phase 1: Make Current App Actually Deployable

### Task 1: Add Project Scripts

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "shuiyu-dealer",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node scripts/build-static.mjs",
    "preview": "npx serve dist",
    "check": "npm run build"
  },
  "devDependencies": {
    "serve": "^14.2.4"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```gitignore
node_modules/
dist/
.env
.env.local
.env.*.local
.vercel/
```

- [ ] **Step 3: Create `.env.example`**

```bash
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_DATABASE_URL=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
```

- [ ] **Step 4: Run the script check**

Run: `npm run check`

Expected before Task 2: fails because `scripts/build-static.mjs` does not exist.

### Task 2: Add Static Build Pipeline

**Files:**
- Create: `scripts/build-static.mjs`
- Modify: `firebase-config.js`

- [ ] **Step 1: Create `scripts/build-static.mjs`**

```js
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');

const required = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_DATABASE_URL',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing Firebase env vars: ${missing.join(', ')}`);
}

await mkdir(dist, { recursive: true });

for (const file of ['index.html', 'game.html', 'game-logic.js']) {
  await copyFile(path.join(root, file), path.join(dist, file));
}

const source = await readFile(path.join(root, 'firebase-config.js'), 'utf8');
const config = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const built = source.replace(
  /const firebaseConfig = \{[\s\S]*?\};/,
  `const firebaseConfig = ${JSON.stringify(config, null, 2)};`
);

await writeFile(path.join(dist, 'firebase-config.js'), built);
```

- [ ] **Step 2: Keep `firebase-config.js` placeholders locally**

Keep the placeholder object in source control:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

- [ ] **Step 3: Run build without env vars**

Run: `npm run build`

Expected: fails with `Missing Firebase env vars`.

- [ ] **Step 4: Run build with env vars**

Run after filling `.env.local` manually or exporting vars in the shell:

```bash
FIREBASE_API_KEY=example FIREBASE_AUTH_DOMAIN=example.firebaseapp.com FIREBASE_DATABASE_URL=https://example.firebaseio.com FIREBASE_PROJECT_ID=example FIREBASE_STORAGE_BUCKET=example.appspot.com FIREBASE_MESSAGING_SENDER_ID=123 FIREBASE_APP_ID=app npm run build
```

Expected: `dist/index.html`, `dist/game.html`, `dist/game-logic.js`, and `dist/firebase-config.js` exist.

### Task 3: Fix Runtime Bugs Blocking Real Use

**Files:**
- Modify: `firebase-config.js`
- Modify: `game-logic.js`
- Modify: `game.html`

- [ ] **Step 1: Fix shared deck remaining count**

In `firebase-config.js`, replace:

```js
remaining: deck.getRemaining(),
```

with:

```js
remaining: deck.remaining,
```

- [ ] **Step 2: Namespace Firebase service functions**

At the end of `firebase-config.js`, before the module export block, add:

```js
window.ShuiyuFirebase = {
  createRoom,
  joinRoom,
  dealFromSharedDeck,
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
  Calculator,
  Deck
};
```

- [ ] **Step 3: Rename the game-page drink handler**

In `game-logic.js`, replace:

```js
async function updateDrink(delta) {
  if (!G.roomId) return;
  await updateDrink(G.roomId, delta);
}
```

with:

```js
async function updateDrinkCount(delta) {
  if (!G.roomId) return;
  await window.ShuiyuFirebase.updateDrink(G.roomId, delta);
}
```

- [ ] **Step 4: Update drink button calls in `game.html`**

Replace:

```html
<button onclick="updateDrink(-1)"
<button onclick="updateDrink(1)"
```

with:

```html
<button onclick="updateDrinkCount(-1)"
<button onclick="updateDrinkCount(1)"
```

- [ ] **Step 5: Remove missing ID event bindings**

In `game-logic.js`, remove these lines from `initGame` because the HTML already uses inline handlers and these IDs do not exist:

```js
document.getElementById('btn-drink-plus').addEventListener('click', () => updateDrink(1));
document.getElementById('btn-drink-minus').addEventListener('click', () => updateDrink(-1));
document.getElementById('btn-exit').addEventListener('click', exitRoom);
```

- [ ] **Step 6: Fix missing cancel button lookup**

In `game-logic.js`, replace:

```js
document.getElementById('btn-cancel-switch').onclick = () => modal.classList.add('hidden');
```

with either a real ID in `game.html`:

```html
<button id="btn-cancel-switch" onclick="document.getElementById('modal-switch').classList.add('hidden')"
```

or a guarded lookup:

```js
document.getElementById('btn-cancel-switch')?.addEventListener('click', () => modal.classList.add('hidden'));
```

- [ ] **Step 7: Build again**

Run: `npm run build` with Firebase env vars.

Expected: build succeeds and generated files exist in `dist/`.

## Phase 2: Configure Firebase for Public Rooms

### Task 4: Create Realtime Database Rules

**Files:**
- Create: `firebase.rules.json`
- Modify: `README.md`

- [ ] **Step 1: Add starter database rules**

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

- [ ] **Step 2: Document Firebase setup in `README.md`**

Add:

```md
## Firebase Setup

1. Create a Firebase project.
2. Enable Realtime Database.
3. Create the database in a region close to users.
4. Apply `firebase.rules.json` in the Firebase console.
5. Copy the web app config values into Vercel environment variables.

The Firebase browser config is public by design. Security depends on Realtime Database rules, not hiding the web config.
```

- [ ] **Step 3: Manual verification**

In Firebase console, create a test room through the app and confirm data appears under `rooms/{roomId}`.

Expected: room data appears, players can join by the same 4-digit room ID.

## Phase 3: Deploy to Vercel

### Task 5: Add Vercel Configuration

**Files:**
- Create: `vercel.json`
- Modify: `README.md`

- [ ] **Step 1: Create `vercel.json`**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": null
}
```

- [ ] **Step 2: Add deployment docs**

Add to `README.md`:

```md
## Deploy

1. Install dependencies:
   `npm install`
2. Link the project:
   `vercel link`
3. Add the Firebase environment variables in Vercel:
   - `FIREBASE_API_KEY`
   - `FIREBASE_AUTH_DOMAIN`
   - `FIREBASE_DATABASE_URL`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_STORAGE_BUCKET`
   - `FIREBASE_MESSAGING_SENDER_ID`
   - `FIREBASE_APP_ID`
4. Deploy preview:
   `vercel`
5. Deploy production:
   `vercel --prod`
```

- [ ] **Step 3: Preview deploy**

Run: `vercel`

Expected: Vercel returns a preview URL.

- [ ] **Step 4: Production deploy**

Run: `vercel --prod`

Expected: Vercel returns a production URL like `https://<project>.vercel.app`.

## Phase 4: End-to-End Phone Test

### Task 6: Verify Link-Based Usage

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Open production URL on phone A**

Expected: homepage loads over HTTPS.

- [ ] **Step 2: Create a room on phone A**

Expected: app shows a 4-digit room number.

- [ ] **Step 3: Open the same URL on phone B**

Expected: homepage loads.

- [ ] **Step 4: Join the room from phone B**

Expected: phone B enters the same room.

- [ ] **Step 5: Deal from the dealer phone**

Expected: both phones receive different 4-card hands from the shared deck.

- [ ] **Step 6: Drag cards into head and tail**

Expected: bottom results update. Pairs show only `保`; double pair shows `水鱼！`.

- [ ] **Step 7: Test drink counter**

Expected: pressing `+` or `-` on one phone updates the number on the other phone.

- [ ] **Step 8: Test refresh recovery**

Expected: refreshing either phone keeps the room state and current hand.

- [ ] **Step 9: Record known limitations**

Add to `README.md`:

```md
## Current Limitations

- Rooms use a 4-digit code and are writable by anyone who knows the code.
- There is no login yet.
- Old rooms are not automatically cleaned up yet.
- Firebase usage should be monitored if the app is shared widely.
```

## Phase 5: Recommended Hardening After First Link Works

### Task 7: Reduce Abuse and Stale Data

**Files:**
- Modify: `firebase-config.js`
- Modify: `firebase.rules.json`
- Modify: `README.md`

- [ ] **Step 1: Add room expiration**

When creating a room, add:

```js
expiresAt: Date.now() + 1000 * 60 * 60 * 8
```

- [ ] **Step 2: Add app-side expired room check**

In `joinRoom`, after loading `room`, add:

```js
if (room.expiresAt && Date.now() > room.expiresAt) {
  return { success: false, reason: '房间已过期' };
}
```

- [ ] **Step 3: Tighten validation later**

After first production verification, replace permissive write rules with field-specific validation for `rooms`, `players`, `deck`, and `drinkCount`.

Expected: public link still works, but stale rooms and obvious malformed writes are reduced.

## Execution Order

1. Phase 1: make app buildable and fix runtime blockers.
2. Phase 2: create Firebase project and rules.
3. Phase 3: deploy to Vercel and get a public link.
4. Phase 4: test with two phones.
5. Phase 5: harden after the first usable link works.

## Self-Review

- The plan covers static hosting, realtime backend, environment config, deployment, and phone verification.
- The fastest usable link path is Vercel + Firebase, matching the current codebase.
- The known runtime blockers found in the current files are explicitly included before deployment.
- The plan avoids hiding Firebase public config as a security measure and instead calls out database rules as the security boundary.
