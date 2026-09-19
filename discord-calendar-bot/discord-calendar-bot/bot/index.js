const { SlashCommandBuilder } = require('discord.js');
const { apiWrite, findDriverByName, CALENDAR_CHOICES, calendarLabel } = require('../lib/api');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roster')
    .setDescription('Add, rename, or remove a driver')
    .addSubcommand(sub =>
      sub.setName('add').setDescription('Add a new driver to a calendar')
        .addStringOption(opt => opt.setName('calendar').setDescription('Which calendar').setRequired(true).addChoices(...CALENDAR_CHOICES))
        .addStringOption(opt => opt.setName('number').setDescription('Car number, e.g. 44').setRequired(true))
        .addStringOption(opt => opt.setName('name').setDescription("Driver's name").setRequired(true))
        .addStringOption(opt => opt.setName('team').setDescription('Team name').setRequired(true))
        .addStringOption(opt => opt.setName('flag').setDescription('Flag emoji').setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('edit').setDescription("Change a driver's name, team, or flag")
        .addStringOption(opt => opt.setName('calendar').setDescription('Which calendar').setRequired(true).addChoices(...CALENDAR_CHOICES))
        .addStringOption(opt => opt.setName('driver').setDescription('Current driver name').setRequired(true))
        .addStringOption(opt => opt.setName('name').setDescription('New name').setRequired(false))
        .addStringOption(opt => opt.setName('team').setDescription('New team').setRequired(false))
        .addStringOption(opt => opt.setName('flag').setDescription('New flag emoji').setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('remove').setDescription('Remove a driver from a calendar entirely')
        .addStringOption(opt => opt.setName('calendar').setDescription('Which calendar').setRequired(true).addChoices(...CALENDAR_CHOICES))
        .addStringOption(opt => opt.setName('driver').setDescription('Driver name to remove').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const calendar = interaction.options.getString('calendar');

    try {
      if (sub === 'add') {
        const number = interaction.options.getString('number');
        const name = interaction.options.getString('name');
        const team = interaction.options.getString('team');
        const flag = interaction.options.getString('flag') || '';
        const created = await apiWrite('POST', `/api/calendars/${calendar}/drivers`, { num: number, name, team, flag });
        return interaction.reply(`✅ Added **${created.flag} ${created.name}** #${created.num} (${created.team}) to ${calendarLabel(calendar)}.`);
      }

      if (sub === 'edit') {
        const driverName = interaction.options.getString('driver');
        const name = interaction.options.getString('name');
        const team = interaction.options.getString('team');
        const flag = interaction.options.getString('flag');
        if (!name && !team && !flag) {
          return interaction.reply({ content: 'Provide at least one of name, team, or flag to change.', ephemeral: true });
        }
        const driver = await findDriverByName(calendar, driverName);
        const body = {};
        if (name) body.name = name;
        if (team) body.team = team;
        if (flag) body.flag = flag;
        const updated = await apiWrite('PATCH', `/api/calendars/${calendar}/drivers/${driver.num}`, body);
        return interaction.reply(`✅ Updated #${updated.num} → **${updated.flag} ${updated.name}** (${updated.team})`);
      }

      if (sub === 'remove') {
        const driverName = interaction.options.getString('driver');
        const driver = await findDriverByName(calendar, driverName);
        const removed = await apiWrite('DELETE', `/api/calendars/${calendar}/drivers/${driver.num}`);
        return interaction.reply(`🗑️ Removed **${removed.name}** #${removed.num} from ${calendarLabel(calendar)}.`);
      }
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: `Something went wrong: ${err.message}`, ephemeral: true });
    }
  },
};
