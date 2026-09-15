const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { apiGet, CALENDAR_CHOICES, calendarLabel } = require('../lib/api');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Show season stats: WDC/WCC leaders, most poles, most wins, etc.')
    .addStringOption(opt => opt.setName('calendar').setDescription('Which calendar').setRequired(true).addChoices(...CALENDAR_CHOICES)),

  async execute(interaction) {
    const calendar = interaction.options.getString('calendar');
    try {
      const s = await apiGet(`/api/calendars/${calendar}/stats`);
      const embed = new EmbedBuilder()
        .setTitle(`${calendarLabel(calendar)} — Season Stats`)
        .setColor(calendar === 'f1' ? 0x6D3CE0 : 0x2F5FEA)
        .addFields(
          { name: 'WDC Leader', value: s.wdcLeader ? `${s.wdcLeader.name} — ${s.wdcLeader.pts} pts` : '—', inline: true },
          { name: 'WCC Leader', value: s.wccLeader ? `${s.wccLeader.team} — ${s.wccLeader.pts} pts` : '—', inline: true },
          { name: 'Title Margin', value: s.marginTop2 !== null ? `${s.marginTop2} pts` : '—', inline: true },
          { name: 'Most Wins', value: s.mostWins ? `${s.mostWins.name} (${s.mostWins.wins})` : '—', inline: true },
          { name: 'Most Poles', value: s.mostPoles ? `${s.mostPoles.name} (${s.mostPoles.poles})` : '—', inline: true },
          { name: 'Most Penalized', value: s.mostPenalized ? `${s.mostPenalized.name} (${s.mostPenalized.penalties})` : '—', inline: true },
          { name: 'Retirements (OUT)', value: String(s.retirements), inline: true },
        );
      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: `Something went wrong: ${err.message}`, ephemeral: true });
    }
  },
};
