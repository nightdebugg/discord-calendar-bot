require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();
const DATA_PATH = path.join(__dirname, 'data.json');
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

const VALID_CALENDARS = ['f1', 'pf'];
const VALID_STATUSES = ['upcoming', 'live', 'done'];
const POINTS = { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 };

app.use(cors());
app.use(express.json());

// ---- helpers ----
function readData() { return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8')); }
function writeData(data) { fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2)); }

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

app.get('/api/calendars/:calendar/rounds', validCalendarOr404, (req, res) => {
  res.json(readData()[req.params.calendar].rounds);
});

app.patch('/api/calendars/:calendar/rounds/:rd', requireApiKey, validCalendarOr404, (req, res) => {
  const rd = parseInt(req.params.rd, 10);
  const { flag, country, status, date } = req.body;
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }
  const data = readData();
  const round = data[req.params.calendar].rounds.find(r => r.rd === rd);
  if (!round) return res.status(404).json({ error: `Round ${rd} not found` });

  if (flag !== undefined) round.flag = flag;
  if (country !== undefined) round.country = country;
  if (status !== undefined) round.status = status;
  if (date !== undefined) round.date = date;

  writeData(data);
  res.json(round);
});

app.post('/api/calendars/:calendar/rounds', requireApiKey, validCalendarOr404, (req, res) => {
  const { rd, flag, country, status, date } = req.body;
  if (rd === undefined || !flag || !country) {
    return res.status(400).json({ error: 'rd, flag, and country are required' });
  }
  const data = readData();
  if (data[req.params.calendar].rounds.some(r => r.rd === rd)) {
    return res.status(409).json({ error: `Round ${rd} already exists` });
  }
  const round = { rd, flag, country, status: status || 'upcoming', date: date || null };
  data[req.params.calendar].rounds.push(round);
  data[req.params.calendar].rounds.sort((a, b) => a.rd - b.rd);
  writeData(data);
  res.status(201).json(round);
});

app.delete('/api/calendars/:calendar/rounds/:rd', requireApiKey, validCalendarOr404, (req, res) => {
  const rd = parseInt(req.params.rd, 10);
  const data = readData();
  const idx = data[req.params.calendar].rounds.findIndex(r => r.rd === rd);
  if (idx === -1) return res.status(404).json({ error: `Round ${rd} not found` });
  const [removed] = data[req.params.calendar].rounds.splice(idx, 1);
  writeData(data);
  res.json(removed);
});

// =================== DRIVERS ===================

app.get('/api/calendars/:calendar/drivers', validCalendarOr404, (req, res) => {
  const drivers = [...readData()[req.params.calendar].drivers].sort((a, b) => b.pts - a.pts);
  res.json(drivers);
});

app.patch('/api/calendars/:calendar/drivers/:num', requireApiKey, validCalendarOr404, (req, res) => {
  const data = readData();
  const driver = findDriver(data[req.params.calendar], req.params.num);
  if (!driver) return res.status(404).json({ error: `Driver #${req.params.num} not found` });
  const { name, team, flag } = req.body;
  if (name !== undefined) driver.name = name;
  if (team !== undefined) driver.team = team;
  if (flag !== undefined) driver.flag = flag;
  writeData(data);
  res.json(driver);
});

// =================== PENALTIES ===================

app.get('/api/calendars/:calendar/penalties', validCalendarOr404, (req, res) => {
  const drivers = [...readData()[req.params.calendar].drivers]
    .filter(d => d.penalties > 0)
    .sort((a, b) => b.penalties - a.penalties);
  res.json(drivers);
});

app.post('/api/calendars/:calendar/drivers/:num/penalty', requireApiKey, validCalendarOr404, (req, res) => {
  const { points } = req.body;
  if (typeof points !== 'number') return res.status(400).json({ error: 'points (number) is required' });
  const data = readData();
  const driver = findDriver(data[req.params.calendar], req.params.num);
  if (!driver) return res.status(404).json({ error: `Driver #${req.params.num} not found` });
  driver.penalties = Math.max(0, (driver.penalties || 0) + points);
  writeData(data);
  res.json(driver);
});

// =================== POLES ===================

app.post('/api/calendars/:calendar/drivers/:num/pole', requireApiKey, validCalendarOr404, (req, res) => {
  const data = readData();
  const driver = findDriver(data[req.params.calendar], req.params.num);
  if (!driver) return res.status(404).json({ error: `Driver #${req.params.num} not found` });
  driver.poles = (driver.poles || 0) + 1;
  writeData(data);
  res.json(driver);
});

// =================== RACE RESULTS ===================

app.get('/api/calendars/:calendar/rounds/:rd/results', validCalendarOr404, (req, res) => {
  const rd = req.params.rd;
  const drivers = readData()[req.params.calendar].drivers;
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

// body: { driverNum, position }  position: 1-20 integer or "OUT"
app.post('/api/calendars/:calendar/rounds/:rd/result', requireApiKey, validCalendarOr404, (req, res) => {
  const rd = req.params.rd;
  const { driverNum, position } = req.body;
  const validPos = position === 'OUT' || (Number.isInteger(position) && position >= 1 && position <= 30);
  if (!driverNum || !validPos) {
    return res.status(400).json({ error: 'driverNum and a valid position (1-30 or "OUT") are required' });
  }
  const data = readData();
  const driver = findDriver(data[req.params.calendar], driverNum);
  if (!driver) return res.status(404).json({ error: `Driver #${driverNum} not found` });

  driver.results[rd] = position;
  recomputeDriver(driver);
  writeData(data);
  res.json(driver);
});

// body: { driverNum } -- convenience: sets driver to P1 for the round, clearing any previous P1 holder
app.post('/api/calendars/:calendar/rounds/:rd/win', requireApiKey, validCalendarOr404, (req, res) => {
  const rd = req.params.rd;
  const { driverNum } = req.body;
  if (!driverNum) return res.status(400).json({ error: 'driverNum is required' });

  const data = readData();
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
  writeData(data);
  res.json({ winner: driver, replaced: previousWinner ? previousWinner.num : null });
});

// =================== STATS ===================

app.get('/api/calendars/:calendar/stats', validCalendarOr404, (req, res) => {
  const cal = readData()[req.params.calendar];
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
