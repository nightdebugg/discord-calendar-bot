const { SlashCommandBuilder } = require('discord.js');
const { apiWrite, findDriverByName, CALENDAR_CHOICES, calendarLabel } = require('../lib/api');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('win')
    .setDescription('Give a driver the win (P1) for a round')
    .addStringOption(opt => opt.setName('calendar').setDescription('Which calendar').setRequired(true).addChoices(...CALENDAR_CHOICES))
    .addIntegerOption(opt => opt.setName('round').setDescription('Round number').setRequired(true))
    .addStringOption(opt => opt.setName('driver').setDescription("Driver's name").setRequired(true)),

  async execute(interaction) {
    const calendar = interaction.options.getString('calendar');
    const round = interaction.options.getInteger('round');
    const driverName = interaction.options.getString('driver');

    try {
      const driver = await findDriverByName(calendar, driverName);
      const result = await apiWrite('POST', `/api/calendars/${calendar}/rounds/${round}/win`, { driverNum: driver.num });

      let msg = `🏆 **${result.winner.name}** wins ${calendarLabel(calendar)} Round ${round}! (${result.winner.pts} pts total, ${result.winner.wins} wins)`;
      if (result.replaced) msg += `\n(Replaced the previous P1 holder for that round.)`;
      return interaction.reply(msg);
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: `Something went wrong: ${err.message}`, ephemeral: true });
    }
  },
};
