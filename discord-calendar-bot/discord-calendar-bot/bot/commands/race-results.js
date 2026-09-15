const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { apiGet, CALENDAR_CHOICES, calendarLabel } = require('../lib/api');

const ORDINAL = n => (n === 1 ? '🥇' : n === 2 ? '🥈' : n === 3 ? '🥉' : `P${n}`);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('race-results')
    .setDescription('Show recorded finishing order for a round')
    .addStringOption(opt => opt.setName('calendar').setDescription('Which calendar').setRequired(true).addChoices(...CALENDAR_CHOICES))
    .addIntegerOption(opt => opt.setName('round').setDescription('Round number (1-10 for F1, 1-12 for PF)').setRequired(true)),

  async execute(interaction) {
    const calendar = interaction.options.getString('calendar');
    const round = interaction.options.getInteger('round');
    try {
      const entries = await apiGet(`/api/calendars/${calendar}/rounds/${round}/results`);
      const lines = entries.map(e => `${e.position === 'OUT' ? '❌ OUT' : ORDINAL(e.position)} — ${e.name} (${e.team})`);
      const embed = new EmbedBuilder()
        .setTitle(`${calendarLabel(calendar)} — Round ${round} Results`)
        .setDescription(lines.join('\n') || 'No results recorded for this round yet.')
        .setColor(calendar === 'f1' ? 0x6D3CE0 : 0x2F5FEA);
      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: `Something went wrong: ${err.message}`, ephemeral: true });
    }
  },
};
