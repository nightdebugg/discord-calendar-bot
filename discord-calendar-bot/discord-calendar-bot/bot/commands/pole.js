const { SlashCommandBuilder } = require('discord.js');
const { apiWrite, findDriverByName, CALENDAR_CHOICES, calendarLabel } = require('../lib/api');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pole')
    .setDescription('Credit a driver with a pole position (adds to their pole count)')
    .addStringOption(opt => opt.setName('calendar').setDescription('Which calendar').setRequired(true).addChoices(...CALENDAR_CHOICES))
    .addStringOption(opt => opt.setName('driver').setDescription("Driver's name").setRequired(true)),

  async execute(interaction) {
    const calendar = interaction.options.getString('calendar');
    const driverName = interaction.options.getString('driver');
    try {
      const driver = await findDriverByName(calendar, driverName);
      const updated = await apiWrite('POST', `/api/calendars/${calendar}/drivers/${driver.num}/pole`);
      return interaction.reply(`🏁 **${updated.name}** now has **${updated.poles}** pole(s) in ${calendarLabel(calendar)}.`);
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: `Something went wrong: ${err.message}`, ephemeral: true });
    }
  },
};
