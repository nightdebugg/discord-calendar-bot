const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { apiWrite, CALENDAR_CHOICES, calendarLabel } = require('../lib/api');

const COLOR = { f1: 0x6D3CE0, pf: 0x2F5FEA };
const STATUS_EMOJI = { upcoming: '📅', live: '🔴', done: '🏁' };

function raceEmbed(calendar, round, title, description) {
  return new EmbedBuilder()
    .setColor(COLOR[calendar])
    .setTitle(title)
    .setDescription(description)
    .addFields(
      { name: 'Round', value: `R${round.rd}`, inline: true },
      { name: 'Location', value: `${round.flag} ${round.country}`, inline: true },
      { name: 'Status', value: `${STATUS_EMOJI[round.status]} ${round.status}`, inline: true },
      ...(round.date ? [{ name: 'Date & Time', value: round.date, inline: false }] : []),
    )
    .setFooter({ text: calendarLabel(calendar) });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('race-event')
    .setDescription('Schedule or end a race event')
    .addSubcommand(sub =>
      sub.setName('schedule').setDescription('Set the date/time for a round and mark it upcoming')
        .addStringOption(opt => opt.setName('calendar').setDescription('Which calendar').setRequired(true).addChoices(...CALENDAR_CHOICES))
        .addIntegerOption(opt => opt.setName('round').setDescription('Round number').setRequired(true))
        .addStringOption(opt => opt.setName('date').setDescription('Date, e.g. 2026-09-20').setRequired(true))
        .addStringOption(opt => opt.setName('time').setDescription('Time, e.g. 18:00 (your server\'s local time)').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('start').setDescription('Mark a round as live right now')
        .addStringOption(opt => opt.setName('calendar').setDescription('Which calendar').setRequired(true).addChoices(...CALENDAR_CHOICES))
        .addIntegerOption(opt => opt.setName('round').setDescription('Round number').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('end').setDescription('End a race — marks it done, the website updates on next load')
        .addStringOption(opt => opt.setName('calendar').setDescription('Which calendar').setRequired(true).addChoices(...CALENDAR_CHOICES))
        .addIntegerOption(opt => opt.setName('round').setDescription('Round number').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const calendar = interaction.options.getString('calendar');
    const round = interaction.options.getInteger('round');

    try {
      if (sub === 'schedule') {
        const date = interaction.options.getString('date');
        const time = interaction.options.getString('time');
        const updated = await apiWrite('PATCH', `/api/calendars/${calendar}/rounds/${round}`, {
          date: `${date} ${time}`,
          status: 'upcoming',
        });
        const embed = raceEmbed(calendar, updated, '📅 Race Scheduled', `**${updated.country}** is set for **${updated.date}**.`);
        return interaction.reply({ embeds: [embed] });
      }

      if (sub === 'start') {
        const updated = await apiWrite('PATCH', `/api/calendars/${calendar}/rounds/${round}`, { status: 'live' });
        const embed = raceEmbed(calendar, updated, '🔴 Race Is LIVE', `**${updated.country}** has gone green. Buckle up!`);
        return interaction.reply({ embeds: [embed] });
      }

      if (sub === 'end') {
        const updated = await apiWrite('PATCH', `/api/calendars/${calendar}/rounds/${round}`, { status: 'done' });
        const embed = raceEmbed(calendar, updated, '🏁 Race Ended', `**${updated.country}** is in the books. The website updates the next time someone loads it.`);
        return interaction.reply({ embeds: [embed] });
      }
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: `Something went wrong: ${err.message}`, ephemeral: true });
    }
  },
};
