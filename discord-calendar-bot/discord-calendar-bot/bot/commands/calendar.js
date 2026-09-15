const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { apiGet, apiWrite, CALENDAR_CHOICES, calendarLabel } = require('../lib/api');

const STATUS_CHOICES = [
  { name: 'Upcoming', value: 'upcoming' },
  { name: 'Live', value: 'live' },
  { name: 'Done', value: 'done' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('calendar')
    .setDescription('View or edit the F1 2008 / PF race calendars')
    .addSubcommand(sub =>
      sub.setName('view').setDescription('Show the full calendar')
        .addStringOption(opt => opt.setName('calendar').setDescription('Which calendar').setRequired(true).addChoices(...CALENDAR_CHOICES)))
    .addSubcommand(sub =>
      sub.setName('status').setDescription("Change a round's status (upcoming/live/done)")
        .addStringOption(opt => opt.setName('calendar').setDescription('Which calendar').setRequired(true).addChoices(...CALENDAR_CHOICES))
        .addIntegerOption(opt => opt.setName('round').setDescription('Round number').setRequired(true))
        .addStringOption(opt => opt.setName('status').setDescription('New status').setRequired(true).addChoices(...STATUS_CHOICES)))
    .addSubcommand(sub =>
      sub.setName('edit').setDescription("Edit a round's country and/or flag")
        .addStringOption(opt => opt.setName('calendar').setDescription('Which calendar').setRequired(true).addChoices(...CALENDAR_CHOICES))
        .addIntegerOption(opt => opt.setName('round').setDescription('Round number').setRequired(true))
        .addStringOption(opt => opt.setName('country').setDescription('New country name').setRequired(false))
        .addStringOption(opt => opt.setName('flag').setDescription('New flag emoji').setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('add').setDescription('Add a new round to a calendar')
        .addStringOption(opt => opt.setName('calendar').setDescription('Which calendar').setRequired(true).addChoices(...CALENDAR_CHOICES))
        .addIntegerOption(opt => opt.setName('round').setDescription('Round number').setRequired(true))
        .addStringOption(opt => opt.setName('country').setDescription('Country name').setRequired(true))
        .addStringOption(opt => opt.setName('flag').setDescription('Flag emoji').setRequired(true))
        .addStringOption(opt => opt.setName('status').setDescription('Initial status (default: upcoming)').setRequired(false).addChoices(...STATUS_CHOICES)))
    .addSubcommand(sub =>
      sub.setName('remove').setDescription('Remove a round from a calendar')
        .addStringOption(opt => opt.setName('calendar').setDescription('Which calendar').setRequired(true).addChoices(...CALENDAR_CHOICES))
        .addIntegerOption(opt => opt.setName('round').setDescription('Round number').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const calendar = interaction.options.getString('calendar');

    try {
      if (sub === 'view') {
        const rounds = await apiGet(`/api/calendars/${calendar}/rounds`);
        const embed = new EmbedBuilder()
          .setTitle(`${calendarLabel(calendar)} Calendar`)
          .setDescription(rounds.map(r => `**R${r.rd}** ${r.flag} ${r.country} — \`${r.status}\`${r.date ? ` · ${r.date}` : ''}`).join('\n') || 'No rounds yet.')
          .setColor(calendar === 'f1' ? 0x6D3CE0 : 0x2F5FEA);
        return interaction.reply({ embeds: [embed] });
      }

      if (sub === 'status') {
        const round = interaction.options.getInteger('round');
        const status = interaction.options.getString('status');
        const updated = await apiWrite('PATCH', `/api/calendars/${calendar}/rounds/${round}`, { status });
        return interaction.reply(`Updated **${calendarLabel(calendar)} R${updated.rd}** (${updated.country}) → \`${updated.status}\``);
      }

      if (sub === 'edit') {
        const round = interaction.options.getInteger('round');
        const country = interaction.options.getString('country');
        const flag = interaction.options.getString('flag');
        if (!country && !flag) return interaction.reply({ content: 'Provide at least a country or a flag to change.', ephemeral: true });
        const body = {};
        if (country) body.country = country;
        if (flag) body.flag = flag;
        const updated = await apiWrite('PATCH', `/api/calendars/${calendar}/rounds/${round}`, body);
        return interaction.reply(`Updated **${calendarLabel(calendar)} R${updated.rd}** → ${updated.flag} ${updated.country}`);
      }

      if (sub === 'add') {
        const round = interaction.options.getInteger('round');
        const country = interaction.options.getString('country');
        const flag = interaction.options.getString('flag');
        const status = interaction.options.getString('status') || 'upcoming';
        const created = await apiWrite('POST', `/api/calendars/${calendar}/rounds`, { rd: round, country, flag, status });
        return interaction.reply(`Added **${calendarLabel(calendar)} R${created.rd}** — ${created.flag} ${created.country} (\`${created.status}\`)`);
      }

      if (sub === 'remove') {
        const round = interaction.options.getInteger('round');
        const removed = await apiWrite('DELETE', `/api/calendars/${calendar}/rounds/${round}`);
        return interaction.reply(`Removed **${calendarLabel(calendar)} R${removed.rd}** (${removed.country})`);
      }
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: `Something went wrong: ${err.message}`, ephemeral: true });
    }
  },
};
