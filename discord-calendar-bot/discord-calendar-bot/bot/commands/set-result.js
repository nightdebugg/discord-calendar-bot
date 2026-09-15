const { SlashCommandBuilder } = require('discord.js');
const { apiWrite, findDriverByName, CALENDAR_CHOICES, calendarLabel } = require('../lib/api');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-result')
    .setDescription("Record a driver's finishing position for a round (updates points automatically)")
    .addStringOption(opt => opt.setName('calendar').setDescription('Which calendar').setRequired(true).addChoices(...CALENDAR_CHOICES))
    .addIntegerOption(opt => opt.setName('round').setDescription('Round number').setRequired(true))
    .addStringOption(opt => opt.setName('driver').setDescription("Driver's name").setRequired(true))
    .addStringOption(opt => opt.setName('position').setDescription('Finishing position, e.g. 1, 2, 3... or OUT for a DNF').setRequired(true)),

  async execute(interaction) {
    const calendar = interaction.options.getString('calendar');
    const round = interaction.options.getInteger('round');
    const driverName = interaction.options.getString('driver');
    const positionRaw = interaction.options.getString('position').trim().toUpperCase();

    try {
      const position = positionRaw === 'OUT' ? 'OUT' : parseInt(positionRaw, 10);
      if (position !== 'OUT' && (!Number.isInteger(position) || position < 1)) {
        return interaction.reply({ content: 'Position must be a positive number or "OUT".', ephemeral: true });
      }

      const driver = await findDriverByName(calendar, driverName);
      const updated = await apiWrite('POST', `/api/calendars/${calendar}/rounds/${round}/result`, {
        driverNum: driver.num,
        position,
      });

      return interaction.reply(
        `Set **${updated.name}** to ${position === 'OUT' ? 'OUT' : `P${position}`} in ${calendarLabel(calendar)} Round ${round}. New total: **${updated.pts}** pts.`
      );
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: `Something went wrong: ${err.message}`, ephemeral: true });
    }
  },
};
