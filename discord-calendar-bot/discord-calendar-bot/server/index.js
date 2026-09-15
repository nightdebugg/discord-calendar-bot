require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

// Upstash Redis (REST API) — free, and unlike Render's local disk, this actually
// survives restarts/spin-downs. Set these two in your environment variables.
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const DATA_KEY = 'ace-league-calendar-data';

const VALID_CALENDARS = ['f1', 'pf'];
const VALID_STATUSES = ['upcoming', 'live', 'done'];
const POINTS = { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 };

// Seed data — used only the very first time the app runs (when nothing is in Redis yet).
const DEFAULT_DATA = {
  f1: {
    rounds: [
      {"rd":1,"flag":"🇦🇺","country":"Australia","status":"upcoming","date":null},
      {"rd":2,"flag":"🇨🇳","country":"China","status":"upcoming","date":null},
      {"rd":3,"flag":"🇨🇦","country":"Canada","status":"upcoming","date":null},
      {"rd":4,"flag":"🇲🇨","country":"Monaco","status":"upcoming","date":null},
      {"rd":5,"flag":"🇧🇪","country":"Belgium","status":"upcoming","date":null},
      {"rd":6,"flag":"🇭🇺","country":"Hungary","status":"upcoming","date":null},
      {"rd":7,"flag":"🇮🇹","country":"Italy","status":"upcoming","date":null},
      {"rd":8,"flag":"🇸🇬","country":"Singapore","status":"upcoming","date":null},
      {"rd":9,"flag":"🇺🇸","country":"USA","status":"upcoming","date":null},
      {"rd":10,"flag":"🇩🇪","country":"Germany","status":"upcoming","date":null}
    ],
    drivers: [
      {"num":"23","flag":"🇷🇴","name":"Mattix","team":"Ferrari","pts":0,"wins":0,"poles":0,"penalties":0,"results":{}},
      {"num":"95","flag":"🇷🇴","name":"Anroux","team":"McLaren","pts":0,"wins":0,"poles":0,"penalties":0,"results":{}},
      {"num":"28","flag":"🇺🇸","name":"Jountup","team":"Toyota","pts":0,"wins":0,"poles":0,"penalties":0,"results":{}},
      {"num":"6","flag":"🇪🇸","name":"Reisa","team":"Force India","pts":0,"wins":0,"poles":0,"penalties":0,"results":{}},
      {"num":"37","flag":"🇮🇹","name":"Antony","team":"McLaren","pts":0,"wins":0,"poles":0,"penalties":0,"results":{}},
      {"num":"77","flag":"🇧🇬","name":"Martin Hristev","team":"Red Bull","pts":0,"wins":0,"poles":0,"penalties":0,"results":{}},
      {"num":"76","flag":"🇪🇸","name":"robotic ray","team":"Red Bull","pts":0,"wins":0,"poles":0,"penalties":0,"results":{}},
      {"num":"11","flag":"🇵🇱","name":"eric","team":"BMW Sauber","pts":0,"wins":0,"poles":0,"penalties":0,"results":{}},
      {"num":"78","flag":"🇮🇹","name":"Amed Sylla","team":"Williams","pts":0,"wins":0,"poles":0,"penalties":0,"results":{}},
      {"num":"89","flag":"🇬🇧","name":"blue","team":"Toro Rosso","pts":0,"wins":0,"poles":0,"penalties":0,"results":{}},
      {"num":"16","flag":"🇮🇩","name":"Khrom","team":"Renault","pts":0,"wins":0,"poles":0,"penalties":0,"results":{}},
      {"num":"15","flag":"🇷🇸","name":"Cevap","team":"Honda","pts":0,"wins":0,"poles":0,"penalties":0,"results":{}},
      {"num":"13","flag":"🇨🇱","name":"Gamero","team":"Force India","pts":0,"wins":0,"poles":0,"penalties":0,"results":{}},
      {"num":"33","flag":"","name":"BLACK","team":"Ferrari","pts":0,"wins":0,"poles":0,"penalties":0,"results":{}},
      {"num":"99","flag":"🇱🇻","name":"Arman","team":"BMW Sauber","pts":0,"wins":0,"poles":0,"penalties":0,"results":{}}
    ]
  },
  pf: {
    rounds: [
      {"rd":1,"flag":"🇦🇺","country":"Australia","status":"upcoming","date":null},
      {"rd":2,"flag":"🇨🇳","country":"China","status":"upcoming","date":null},
      {"rd":3,"flag":"🇯🇵","country":"Japan","status":"upcoming","date":null},
      {"rd":4,"flag":"🇧🇭","country":"Bahrain","status":"upcoming","date":null},
      {"rd":5,"flag":"🇮🇹","country":"Italy","status":"upcoming","date":null},
      {"rd":6,"flag":"🇸🇬","country":"Singapore","status":"upcoming","date":null},
      {"rd":7,"flag":"🇰🇷","country":"South Korea","status":"upcoming","date":null},
      {"rd":8,"flag":"🇮🇳","country":"India","status":"upcoming","date":null},
      {"rd":9,"flag":"🇲🇽","country":"Mexico","status":"upcoming","date":null},
      {"rd":10,"flag":"🇺🇸","country":"USA","status":"upcoming","date":null},
      {"rd":11,"flag":"🇬🇧","country":"UK","status":"upcoming","date":null},
      {"rd":12,"flag":"🇧🇷","country":"Brazil","status":"upcoming","date":null}
    ],
    drivers: [
      {"num":"11","flag":"🇵🇱","name":"eric","team":"McLaren","pts":0,"wins":0,"poles":0,"penalties":0,"results":{}},
      {"num":"15","flag":"🇷🇸","name":"Cevap","team":"Aston Martin","pts":0,"wins":0,"poles":0,"penalties":0,"results":{}},
      {"num":"47","flag":"🇬🇧","name":"Swept","team":"Aston Martin","pts":0,"wins":0,"poles":0,"penalties":0,"results":{}},
      {"num":"28","flag":"🇺🇸","name":"Jountup","team":"Toro Rosso","pts":0,"wins":0,"poles":0,"penalties":0,"results":{}},
      {"num":"99","flag":"🇬🇧","name":"Jeffz","team":"Red Bull","pts":0,"wins":0,"poles":0,"penalties":0,"results":{}},
      {"num":"78","flag":"🇮🇹","name":"Amed Sylla","team":"McLaren","pts":0,"wins":0,"poles":0,"penalties":0,"results":{}},
      {"num":"96","flag":"🇬🇧","name":"Stellar","team":"Williams","pts":0,"wins":0,"poles":0,"penalties":0,"results":{}},
      {"num":"67","flag":"🇷🇴","name":"Mattix","team":"Sauber","pts":0,"wins":0,"poles":0,"penalties":0,"results":{}},
      {"num":"37","flag":"🇮🇹","name":"Antony","team":"Ferrari","pts":0,"wins":0,"poles":0,"penalties":0,"results":{}},
      {"num":"95","flag":"🇮🇹","name":"Arnoux","team":"Ferrari","pts":0,"wins":0,"poles":0,"penalties":0,"results":{}},
      {"num":"13","flag":"🇨🇱","name":"Gamero","team":"Mercedes","pts":0,"wins":0,"poles":0,"penalties":0,"results":{}},
      {"num":"5","flag":"🇵🇱","name":"Khrom","team":"Manor","pts":0,"wins":0,"poles":0,"penalties":0,"results":{}}
    ]
  }
};

async function readData() {
  const res = await fetch(`${UPSTASH_URL}/get/${DATA_KEY}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
  const json = await res.json();
  if (!json.result) {
    await writeData(DEFAULT_DATA); // first run ever — seed it
    return DEFAULT_DATA;
  }
  return JSON.parse(json.result);
}

async function writeData(data) {
  await fetch(`${UPSTASH_URL}/set/${DATA_KEY}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'text/plain' },
    body: JSON.stringify(data),
  });
}

app.use(cors());
app.use(express.json());

function requireApiKey(req, res, next) {
  if (!API_KEY) return res.status(500).json({ error: 'Server misconfigured: API_KEY not set' });
  if (req.header('x-api-key') !== API_KEY) return res.status(401).json({ error: 'Invalid or missing API key' });
  next();
}

function validCalendarOr404(req, res, next) {
  if (!VALID_CALENDARS.includes(req.params.calendar)) {
    return res.status(404).json({ error: `Unknown calendar "${req.params.calendar}". Use one of: ${VALID_CALENDARS.join(', ')}` });
  }
  next();
}

function pointsForPos(pos) {
  if (pos === 'OUT' || pos === null || pos === undefined) return 0;
  return POINTS[pos] || 0;
}

function findDriver(cal, num) {
  return cal.drivers.find(d => d.num === String(num));
}

function recomputeDriver(driver) {
  const values = Object.values(driver.results);
  driver.pts = values.reduce((sum, v) => sum + pointsForPos(v), 0);
  driver.wins = values.filter(v => v === 1).length;
}

// =================== ROUNDS ===================

app.get('/api/calendars/:calendar/rounds', validCalendarOr404, async (req, res) => {
  const data = await readData();
  res.json(data[req.params.calendar].rounds);
});

app.patch('/api/calendars/:calendar/rounds/:rd', requireApiKey, validCalendarOr404, async (req, res) => {
  const rd = parseInt(req.params.rd, 10);
  const { flag, country, status, date } = req.body;
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }
  const data = await readData();
  const round = data[req.params.calendar].rounds.find(r => r.rd === rd);
  if (!round) return res.status(404).json({ error: `Round ${rd} not found` });

  if (flag !== undefined) round.flag = flag;
  if (country !== undefined) round.country = country;
  if (status !== undefined) round.status = status;
  if (date !== undefined) round.date = date;

  await writeData(data);
  res.json(round);
});

app.post('/api/calendars/:calendar/rounds', requireApiKey, validCalendarOr404, async (req, res) => {
  const { rd, flag, country, status, date } = req.body;
  if (rd === undefined || !flag || !country) {
    return res.status(400).json({ error: 'rd, flag, and country are required' });
  }
  const data = await readData();
  if (data[req.params.calendar].rounds.some(r => r.rd === rd)) {
    return res.status(409).json({ error: `Round ${rd} already exists` });
  }
  const round = { rd, flag, country, status: status || 'upcoming', date: date || null };
  data[req.params.calendar].rounds.push(round);
  data[req.params.calendar].rounds.sort((a, b) => a.rd - b.rd);
  await writeData(data);
  res.status(201).json(round);
});

app.delete('/api/calendars/:calendar/rounds/:rd', requireApiKey, validCalendarOr404, async (req, res) => {
  const rd = parseInt(req.params.rd, 10);
  const data = await readData();
  const idx = data[req.params.calendar].rounds.findIndex(r => r.rd === rd);
  if (idx === -1) return res.status(404).json({ error: `Round ${rd} not found` });
  const [removed] = data[req.params.calendar].rounds.splice(idx, 1);
  await writeData(data);
  res.json(removed);
});

// =================== DRIVERS ===================

app.get('/api/calendars/:calendar/drivers', validCalendarOr404, async (req, res) => {
  const data = await readData();
  const drivers = [...data[req.params.calendar].drivers].sort((a, b) => b.pts - a.pts);
  res.json(drivers);
});

app.patch('/api/calendars/:calendar/drivers/:num', requireApiKey, validCalendarOr404, async (req, res) => {
  const data = await readData();
  const driver = findDriver(data[req.params.calendar], req.params.num);
  if (!driver) return res.status(404).json({ error: `Driver #${req.params.num} not found` });
  const { name, team, flag } = req.body;
  if (name !== undefined) driver.name = name;
  if (team !== undefined) driver.team = team;
  if (flag !== undefined) driver.flag = flag;
  await writeData(data);
  res.json(driver);
});

// =================== PENALTIES ===================

app.get('/api/calendars/:calendar/penalties', validCalendarOr404, async (req, res) => {
  const data = await readData();
  const drivers = [...data[req.params.calendar].drivers]
    .filter(d => d.penalties > 0)
    .sort((a, b) => b.penalties - a.penalties);
  res.json(drivers);
});

app.post('/api/calendars/:calendar/drivers/:num/penalty', requireApiKey, validCalendarOr404, async (req, res) => {
  const { points } = req.body;
  if (typeof points !== 'number') return res.status(400).json({ error: 'points (number) is required' });
  const data = await readData();
  const driver = findDriver(data[req.params.calendar], req.params.num);
  if (!driver) return res.status(404).json({ error: `Driver #${req.params.num} not found` });
  driver.penalties = Math.max(0, (driver.penalties || 0) + points);
  await writeData(data);
  res.json(driver);
});

// =================== POLES ===================

app.post('/api/calendars/:calendar/drivers/:num/pole', requireApiKey, validCalendarOr404, async (req, res) => {
  const data = await readData();
  const driver = findDriver(data[req.params.calendar], req.params.num);
  if (!driver) return res.status(404).json({ error: `Driver #${req.params.num} not found` });
  driver.poles = (driver.poles || 0) + 1;
  await writeData(data);
  res.json(driver);
});

// =================== RACE RESULTS ===================

app.get('/api/calendars/:calendar/rounds/:rd/results', validCalendarOr404, async (req, res) => {
  const rd = req.params.rd;
  const data = await readData();
  const drivers = data[req.params.calendar].drivers;
  const entries = drivers
    .filter(d => d.results[rd] !== undefined)
    .map(d => ({ num: d.num, name: d.name, team: d.team, position: d.results[rd] }));
  entries.sort((a, b) => {
    if (a.position === 'OUT') return 1;
    if (b.position === 'OUT') return -1;
    return a.position - b.position;
  });
  res.json(entries);
});

app.post('/api/calendars/:calendar/rounds/:rd/result', requireApiKey, validCalendarOr404, async (req, res) => {
  const rd = req.params.rd;
  const { driverNum, position } = req.body;
  const validPos = position === 'OUT' || (Number.isInteger(position) && position >= 1 && position <= 30);
  if (!driverNum || !validPos) {
    return res.status(400).json({ error: 'driverNum and a valid position (1-30 or "OUT") are required' });
  }
  const data = await readData();
  const driver = findDriver(data[req.params.calendar], driverNum);
  if (!driver) return res.status(404).json({ error: `Driver #${driverNum} not found` });

  driver.results[rd] = position;
  recomputeDriver(driver);
  await writeData(data);
  res.json(driver);
});

app.post('/api/calendars/:calendar/rounds/:rd/win', requireApiKey, validCalendarOr404, async (req, res) => {
  const rd = req.params.rd;
  const { driverNum } = req.body;
  if (!driverNum) return res.status(400).json({ error: 'driverNum is required' });

  const data = await readData();
  const cal = data[req.params.calendar];
  const driver = findDriver(cal, driverNum);
  if (!driver) return res.status(404).json({ error: `Driver #${driverNum} not found` });

  const previousWinner = cal.drivers.find(d => d.results[rd] === 1 && d.num !== driver.num);
  if (previousWinner) {
    delete previousWinner.results[rd];
    recomputeDriver(previousWinner);
  }

  driver.results[rd] = 1;
  recomputeDriver(driver);
  await writeData(data);
  res.json({ winner: driver, replaced: previousWinner ? previousWinner.num : null });
});

// =================== STATS ===================

app.get('/api/calendars/:calendar/stats', validCalendarOr404, async (req, res) => {
  const data = await readData();
  const cal = data[req.params.calendar];
  const drivers = [...cal.drivers].sort((a, b) => b.pts - a.pts);

  const wdcLeader = drivers[0] && drivers[0].pts > 0 ? drivers[0] : null;
  const margin = drivers[0] && drivers[1] ? drivers[0].pts - drivers[1].pts : null;

  const teamPts = {};
  cal.drivers.forEach(d => { teamPts[d.team] = (teamPts[d.team] || 0) + d.pts; });
  const wccSorted = Object.entries(teamPts).sort((a, b) => b[1] - a[1]);
  const wccLeader = wccSorted.length && wccSorted[0][1] > 0 ? { team: wccSorted[0][0], pts: wccSorted[0][1] } : null;

  const mostWins = [...cal.drivers].sort((a, b) => b.wins - a.wins)[0];
  const mostPoles = [...cal.drivers].sort((a, b) => b.poles - a.poles)[0];
  const mostPenalized = [...cal.drivers].sort((a, b) => b.penalties - a.penalties)[0];

  let retirements = 0;
  cal.drivers.forEach(d => { retirements += Object.values(d.results).filter(v => v === 'OUT').length; });

  res.json({
    wdcLeader: wdcLeader ? { name: wdcLeader.name, pts: wdcLeader.pts } : null,
    wccLeader,
    marginTop2: margin,
    mostWins: mostWins && mostWins.wins > 0 ? { name: mostWins.name, wins: mostWins.wins } : null,
    mostPoles: mostPoles && mostPoles.poles > 0 ? { name: mostPoles.name, poles: mostPoles.poles } : null,
    mostPenalized: mostPenalized && mostPenalized.penalties > 0 ? { name: mostPenalized.name, penalties: mostPenalized.penalties } : null,
    retirements,
  });
});

app.listen(PORT, () => {
  console.log(`Calendar API listening on port ${PORT}`);
});
