require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Client, GatewayIntentBits, Collection } = require('discord.js');

// Render's free tier only offers "Web Service" (not Background Worker), and Web
// Services must bind to a port to be considered healthy. This tiny server exists
// purely to satisfy that check — the Discord bot itself doesn't need it.
const PORT = process.env.PORT || 3001;
http.createServer((req, res) => res.end('Bot is running.')).listen(PORT, () => {
  console.log(`Keep-alive server listening on port ${PORT}`);
});

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// If the Discord connection errors out, log it — discord.js usually auto-reconnects,
// but we don't want a silent failure to leave the bot showing offline forever.
client.on('error', (err) => console.error('Discord client error:', err));
client.on('shardError', (err) => console.error('Shard error:', err));
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));

// Watchdog: every 5 minutes, check the Discord connection is actually alive.
// If it's been down for two checks in a row, exit the process — Render/most hosts
// automatically restart a crashed process, which reconnects cleanly. This catches
// the case where the Node process itself is fine (so pings still succeed) but the
// Discord gateway connection silently died and never came back.
let unhealthyStreak = 0;
setInterval(() => {
  if (client.isReady()) {
    unhealthyStreak = 0;
    return;
  }
  unhealthyStreak++;
  console.warn(`Discord client not ready (streak: ${unhealthyStreak})`);
  if (unhealthyStreak >= 2) {
    console.error('Discord client unhealthy for too long — exiting so the host restarts the process.');
    process.exit(1);
  }
}, 5 * 60 * 1000);

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(err);
    const payload = { content: 'There was an error running that command.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
