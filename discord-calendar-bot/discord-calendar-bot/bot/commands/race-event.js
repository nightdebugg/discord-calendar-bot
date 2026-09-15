const { SlashCommandBuilder } = require('discord.js');
const { apiGet, apiWrite, CALENDAR_CHOICES, calendarLabel } = require('../lib/api');

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
        return interaction.reply(`📅 **${calendarLabel(calendar)} R${updated.rd}** (${updated.country}) scheduled for **${updated.date}**.`);
      }

      if (sub === 'start') {
        const updated = await apiWrite('PATCH', `/api/calendars/${calendar}/rounds/${round}`, { status: 'live' });
        return interaction.reply(`🔴 **${calendarLabel(calendar)} R${updated.rd}** (${updated.country}) is now **LIVE**.`);
      }

      if (sub === 'end') {
        const updated = await apiWrite('PATCH', `/api/calendars/${calendar}/rounds/${round}`, { status: 'done' });
        return interaction.reply(`🏁 **${calendarLabel(calendar)} R${updated.rd}** (${updated.country}) marked **done**. The website will show this next time someone loads the page.`);
      }
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: `Something went wrong: ${err.message}`, ephemeral: true });
    }
  },
};
