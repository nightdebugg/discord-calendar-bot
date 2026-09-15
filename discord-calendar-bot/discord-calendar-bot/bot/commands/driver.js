const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { apiGet, findDriverByName, CALENDAR_CHOICES, calendarLabel } = require('../lib/api');

const ORDINAL = n => (n === 1 ? '🥇' : n === 2 ? '🥈' : n === 3 ? '🥉' : `P${n}`);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('driver')
    .setDescription('Show one driver\'s full stat card')
    .addStringOption(opt => opt.setName('calendar').setDescription('Which calendar').setRequired(true).addChoices(...CALENDAR_CHOICES))
    .addStringOption(opt => opt.setName('driver').setDescription("Driver's name").setRequired(true)),

  async execute(interaction) {
    const calendar = interaction.options.getString('calendar');
    const driverName = interaction.options.getString('driver');

    try {
      const [driver, allDrivers, rounds] = await Promise.all([
        findDriverByName(calendar, driverName),
        apiGet(`/api/calendars/${calendar}/drivers`), // sorted by pts desc, gives us standings position
        apiGet(`/api/calendars/${calendar}/rounds`),
      ]);

      const standingsPos = allDrivers.findIndex(d => d.num === driver.num) + 1;

      const raceLines = rounds.map(r => {
        const pos = driver.results[r.rd];
        const shown = pos === undefined ? '—' : pos === 'OUT' ? '❌ OUT' : ORDINAL(pos);
        return `R${r.rd} ${r.flag} ${r.country} — ${shown}`;
      });

      const embed = new EmbedBuilder()
        .setTitle(`${driver.flag} ${driver.name} #${driver.num}`)
        .setDescription(`${driver.team} · ${calendarLabel(calendar)}`)
        .setColor(calendar === 'f1' ? 0x6D3CE0 : 0x2F5FEA)
        .addFields(
          { name: 'Standings', value: `P${standingsPos}`, inline: true },
          { name: 'Points', value: String(driver.pts), inline: true },
          { name: 'Wins', value: String(driver.wins), inline: true },
          { name: 'Poles', value: String(driver.poles), inline: true },
          { name: 'Penalty Points', value: String(driver.penalties), inline: true },
          { name: '\u200b', value: '\u200b', inline: true },
          { name: 'Race by Race', value: raceLines.join('\n') || 'No rounds yet.' },
        );

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: `Something went wrong: ${err.message}`, ephemeral: true });
    }
  },
};
