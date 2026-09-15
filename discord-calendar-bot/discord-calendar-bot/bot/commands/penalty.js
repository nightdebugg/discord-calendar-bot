const { SlashCommandBuilder } = require('discord.js');
const { apiWrite, findDriverByName, CALENDAR_CHOICES, calendarLabel } = require('../lib/api');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('penalty')
    .setDescription('Give (or remove) penalty points for a driver')
    .addStringOption(opt => opt.setName('calendar').setDescription('Which calendar').setRequired(true).addChoices(...CALENDAR_CHOICES))
    .addStringOption(opt => opt.setName('driver').setDescription("Driver's name").setRequired(true))
    .addIntegerOption(opt => opt.setName('points').setDescription('Points to add (use a negative number to remove points)').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Optional reason').setRequired(false)),

  async execute(interaction) {
    const calendar = interaction.options.getString('calendar');
    const driverName = interaction.options.getString('driver');
    const points = interaction.options.getInteger('points');
    const reason = interaction.options.getString('reason');

    try {
      const driver = await findDriverByName(calendar, driverName);
      const updated = await apiWrite('POST', `/api/calendars/${calendar}/drivers/${driver.num}/penalty`, { points });
      let msg = `⚠️ **${updated.name}** ${points >= 0 ? `+${points}` : points} penalty points → now **${updated.penalties}** total (${calendarLabel(calendar)})`;
      if (reason) msg += `\nReason: ${reason}`;
      return interaction.reply(msg);
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: `Something went wrong: ${err.message}`, ephemeral: true });
    }
  },
};
