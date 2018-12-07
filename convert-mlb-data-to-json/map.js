const uuid = require('uuid');
const enums = require('../enums');

function enforceArray(item) {
  if (Array.isArray(item)) {
    return item;
  }

  return [item];
}

function makeGameEvent(
  eventType, eventSubType,
  homeTeam, awayTeam,
  inningNumber, inningHalf,
  timestampStart,
  contextualData
) {
  return ({
    id: uuid.v4(),
    eventType,
    eventSubType,
    homeTeam,
    awayTeam,
    inningNumber,
    inningHalf,
    timestampStart,
    contextualData,
  });
}

function map(input) {
  const output = {
    origial: input,
    events: [],
  };

  const unsortedEvents = [];

  const { game } = input;
  if (! game) {
    return output;
  }

  const { inning: innings = [] } = game;
  if (! innings.length) {
    return output;
  }

  for (const inning of innings) {
    const {
      num: inningNumber,
      away_team: awayTeam,
      home_team: homeTeam,
      top,
      bottom,
    } = inning;

    function evaluateInning(half, inningMarker) {
      if (! half) return;

      const {
        action: actions = [],
        atbat: atBats = [],
      } = half;

      for (const action of enforceArray(actions)) {
        const {
          tfs_zulu: timestampStart,
          event: eventSubType,
          player,
        } = action;

        const gameEvent = makeGameEvent(
          enums.ACTION_TYPE,
          eventSubType,
          homeTeam,
          awayTeam,
          inningNumber,
          inningMarker,
          timestampStart,
          {
            player,
          },
        );

        unsortedEvents.push(gameEvent);
      }

      for (const atBat of enforceArray(atBats)) {
        const {
          batter,
          pitcher,
          pitch: pitches = [],
        } = atBat;

        for (const pitch of enforceArray(pitches)) {
          const {
            des: eventSubType,
            tfs_zulu: timestampStart,
          } = pitch;

          const gameEvent = makeGameEvent(
            enums.PITCH_TYPE,
            eventSubType,
            homeTeam,
            awayTeam,
            inningNumber,
            inningMarker,
            timestampStart,
            {
              batter,
              pitcher,
            },
          );

          unsortedEvents.push(gameEvent);
        }
      }
    }

    evaluateInning(top, enums.TOP_OF_INNING);
    evaluateInning(bottom, enums.BOTTOM_OF_INNING);
  }

  output.events = unsortedEvents.sort((a, b) =>
    new Date(a.timestampStart) - new Date(b.timestampStart));

  return output;
}

module.exports = map;
