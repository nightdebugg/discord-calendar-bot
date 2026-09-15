const API_BASE_URL = process.env.API_BASE_URL;
const API_KEY = process.env.API_KEY;

async function apiGet(path) {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function apiWrite(method, path, body) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

const CALENDAR_CHOICES = [
  { name: 'F1 2008', value: 'f1' },
  { name: 'PF', value: 'pf' },
];

function calendarLabel(value) {
  return CALENDAR_CHOICES.find(c => c.value === value)?.name || value;
}

// Drivers are referenced by name in commands (friendlier than car numbers).
// Looks up a driver by case-insensitive name match against the calendar's roster.
async function findDriverByName(calendar, name) {
  const drivers = await apiGet(`/api/calendars/${calendar}/drivers`);
  const match = drivers.find(d => d.name.toLowerCase() === name.toLowerCase());
  if (!match) {
    const names = drivers.map(d => d.name).join(', ');
    throw new Error(`No driver named "${name}" in ${calendarLabel(calendar)}. Roster: ${names}`);
  }
  return match;
}

module.exports = { apiGet, apiWrite, CALENDAR_CHOICES, calendarLabel, findDriverByName };
