# Ace League Calendar Bot

Lets you edit the F1 2008 and PF race calendars on your website with Discord slash commands.

## How it fits together

```
Discord (/calendar ...) → bot/  → server/ API (data.json) ← website/index.html (fetches on load)
```

- `server/` — small Express API. Holds the calendar data in `data.json`. Your website
  reads from it (no auth needed), your bot writes to it (needs a secret API key).
- `bot/` — the Discord bot. Slash command `/calendar` with subcommands: `view`, `status`,
  `edit`, `add`, `remove`.
- `website/index.html` — your uploaded site, lightly modified: the hardcoded `F1_rounds`
  and `PF_rounds` arrays are now fetched from the API on page load instead.

## 1. Deploy the API server

The server needs to run somewhere reachable 24/7 (not your own laptop, or it'll go
offline when you close it). Free options: Railway, Render, Fly.io.

1. Push the `server/` folder to its own GitHub repo (or connect the whole project and
   set the root directory to `server/`).
2. On your host, set environment variables:
   - `API_KEY` — make up a long random string, e.g. `openssl rand -hex 32`
   - `PORT` — most hosts set this automatically, leave it out if so
3. Deploy. You'll get a public URL like `https://your-app.up.railway.app`.

Note: `data.json` lives on disk, so if your host wipes the filesystem on redeploy
(some free tiers do), your calendar edits will reset too. For anything you care about
long-term, swap `data.json` for a real database later — the API shape stays the same.

## 2. Point the website at the deployed API

In `website/index.html`, find this line near the bottom of the `<script>`:

```js
const CALENDAR_API_BASE = 'http://localhost:3000';
```

Change it to your deployed URL:

```js
const CALENDAR_API_BASE = 'https://your-app.up.railway.app';
```

Then upload this `index.html` to wherever your site is hosted, replacing the old one.

## 3. Set up the Discord bot

1. Go to https://discord.com/developers/applications → New Application.
2. Bot tab → Reset Token → copy it (this is `DISCORD_TOKEN`).
3. On the same page, under "Privileged Gateway Intents" you don't need to enable
   anything extra for this bot.
4. General Information tab → copy the "Application ID" (this is `CLIENT_ID`).
5. OAuth2 → URL Generator → check `bot` and `applications.commands` scopes, then under
   Bot Permissions check `Send Messages` and `Use Slash Commands`. Open the generated
   URL to invite the bot to your server.
6. Right-click your Discord server icon → Copy Server ID (enable Developer Mode in
   Discord settings first if you don't see this) — this is `GUILD_ID`.

In `bot/.env` (copy from `bot/.env.example`):

```
DISCORD_TOKEN=...
CLIENT_ID=...
GUILD_ID=...
API_BASE_URL=https://your-app.up.railway.app
API_KEY=<same value you set on the server>
```

Then:

```bash
cd bot
npm install
npm run deploy-commands   # registers /calendar in your server, run again after any command changes
npm start                 # runs the bot
```

For the bot to stay online, host it the same way as the API (Railway/Render both work —
can even be a second service in the same project).

## 4. Using it

### Calendar
- `/calendar view calendar:F1 2008` — list all rounds and their status
- `/calendar status calendar:F1 2008 round:3 status:Live` — mark a round live
- `/calendar edit calendar:PF round:5 country:Spain flag:🇪🇸` — change a round's country/flag
- `/calendar add calendar:F1 2008 round:11 country:Japan flag:🇯🇵` — add a new round
- `/calendar remove calendar:PF round:12` — delete a round

### Race events
- `/race-event schedule calendar:F1 2008 round:3 date:2026-09-20 time:18:00` — set when a round happens
- `/race-event start calendar:F1 2008 round:3` — mark it live
- `/race-event end calendar:F1 2008 round:3` — host ends the race; status → done, website reflects it on next load

### Results & standings
- `/set-result calendar:F1 2008 round:3 driver:Mattix position:2` — record any finishing position (or `OUT` for a DNF); recalculates that driver's points automatically using the standard 25-18-15-12-10-8-6-4-2-1 scale
- `/win calendar:F1 2008 round:3 driver:Mattix` — shortcut for setting P1; automatically clears any previous P1 holder for that round so you can't have two winners
- `/race-results calendar:F1 2008 round:3` — see the recorded finishing order for a round
- `/wdc calendar:F1 2008` — Drivers' Championship standings
- `/wcc calendar:F1 2008` — Constructors' Championship standings (points summed by team)

### Poles & penalties
- `/pole calendar:F1 2008 driver:Mattix` — add a pole position to a driver's tally
- `/penalty calendar:F1 2008 driver:Mattix points:5 reason:Track limits` — add penalty points (use a negative number to remove them)
- `/penalties calendar:F1 2008` — see every driver's total penalty points

### Stats
- `/stats calendar:F1 2008` — WDC/WCC leaders, title margin, most wins, most poles, most penalized, retirement count

All drivers are referenced **by name** (case-insensitive). If a name doesn't match, the
bot replies with the full roster so you can check spelling.

Changes show up on the website next time someone loads the page (it fetches fresh
calendar, driver standings, and stats data each visit — no caching). The "League
Records" cards and driver grid are now driven by real results instead of placeholders.

## Local testing (before deploying anywhere)

```bash
cd server && npm install && cp .env.example .env   # edit .env with a real API_KEY
npm start                                            # runs on http://localhost:3000
```

Then open `website/index.html` directly in your browser (or serve it) — with
`CALENDAR_API_BASE` left as `http://localhost:3000`, it'll pull from your local server.
Run the bot locally too with `API_BASE_URL=http://localhost:3000` in `bot/.env` to test
commands end-to-end before deploying anything.
