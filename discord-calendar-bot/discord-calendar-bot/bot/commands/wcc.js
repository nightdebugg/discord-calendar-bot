const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { apiGet, CALENDAR_CHOICES, calendarLabel } = require('../lib/api');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wcc')
    .setDescription("Show the Constructors' Championship standings")
    .addStringOption(opt => opt.setName('calendar').setDescription('Which calendar').setRequired(true).addChoices(...CALENDAR_CHOICES)),

  async execute(interaction) {
    const calendar = interaction.options.getString('calendar');
    try {
      const drivers = await apiGet(`/api/calendars/${calendar}/drivers`);
      const teamPts = {};
      drivers.forEach(d => { teamPts[d.team] = (teamPts[d.team] || 0) + d.pts; });
      const sorted = Object.entries(teamPts).sort((a, b) => b[1] - a[1]);
      const lines = sorted.map(([team, pts], i) => `**${i + 1}.** ${team} — **${pts}** pts`);
      const embed = new EmbedBuilder()
        .setTitle(`${calendarLabel(calendar)} — WCC Standings`)
        .setDescription(lines.join('\n') || 'No results yet.')
        .setColor(calendar === 'f1' ? 0x6D3CE0 : 0x2F5FEA);
      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: `Something went wrong: ${err.message}`, ephemeral: true });
    }
  },
};
