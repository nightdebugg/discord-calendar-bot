require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const commandsPath = path.join(__dirname, 'commands');
const commands = fs.readdirSync(commandsPath)
  .filter(f => f.endsWith('.js'))
  .map(file => require(path.join(commandsPath, file)).data.toJSON());

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Registering ${commands.length} slash command(s)...`);
    // Guild-scoped = instant, good for testing. Switch to Routes.applicationCommands(CLIENT_ID)
    // for global commands (takes up to an hour to propagate, works in every server the bot is in).
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('Commands registered successfully:', commands.map(c => c.name).join(', '));
  } catch (err) {
    console.error(err);
  }
})();
