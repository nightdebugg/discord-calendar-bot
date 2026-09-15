const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { apiGet, CALENDAR_CHOICES, calendarLabel } = require('../lib/api');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('penalties')
    .setDescription('Show total penalty points for every driver')
    .addStringOption(opt => opt.setName('calendar').setDescription('Which calendar').setRequired(true).addChoices(...CALENDAR_CHOICES)),

  async execute(interaction) {
    const calendar = interaction.options.getString('calendar');
    try {
      const drivers = await apiGet(`/api/calendars/${calendar}/penalties`); // already sorted desc, penalties > 0 only
      const lines = drivers.map(d => `${d.flag} **${d.name}** — ${d.penalties} pts`);
      const embed = new EmbedBuilder()
        .setTitle(`${calendarLabel(calendar)} — Penalty Points`)
        .setDescription(lines.join('\n') || 'No penalties recorded.')
        .setColor(calendar === 'f1' ? 0x6D3CE0 : 0x2F5FEA);
      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: `Something went wrong: ${err.message}`, ephemeral: true });
    }
  },
};
