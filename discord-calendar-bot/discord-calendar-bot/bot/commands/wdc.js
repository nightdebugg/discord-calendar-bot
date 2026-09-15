const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { apiGet, CALENDAR_CHOICES, calendarLabel } = require('../lib/api');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wdc')
    .setDescription("Show the Drivers' Championship standings")
    .addStringOption(opt => opt.setName('calendar').setDescription('Which calendar').setRequired(true).addChoices(...CALENDAR_CHOICES)),

  async execute(interaction) {
    const calendar = interaction.options.getString('calendar');
    try {
      const drivers = await apiGet(`/api/calendars/${calendar}/drivers`); // already sorted by pts desc
      const lines = drivers.map((d, i) =>
        `**${i + 1}.** ${d.flag} ${d.name} (${d.team}) — **${d.pts}** pts${d.wins ? ` · ${d.wins}W` : ''}`
      );
      const embed = new EmbedBuilder()
        .setTitle(`${calendarLabel(calendar)} — WDC Standings`)
        .setDescription(lines.join('\n') || 'No results yet.')
        .setColor(calendar === 'f1' ? 0x6D3CE0 : 0x2F5FEA);
      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: `Something went wrong: ${err.message}`, ephemeral: true });
    }
  },
};
