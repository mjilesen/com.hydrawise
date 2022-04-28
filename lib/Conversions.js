function toDaysMinutes(totalSeconds) {

  if ( totalSeconds > 1000000000  )
    return "-"

  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const days = Math.floor(totalSeconds / (3600 * 24));

  const minutesStr = makeHumanReadable(minutes, 'minute');
  const hoursStr = makeHumanReadable(hours, 'hour');
  const daysStr = makeHumanReadable(days, 'day');

  return `${daysStr}${hoursStr}${minutesStr}`.replace(/,\s*$/, '');
}

function makeHumanReadable(num, singular) {
  return num > 0
    ? num + (num === 1 ? ` ${singular}, ` : ` ${singular}s, `)
    : '';
}

module.exports = {
  toDaysMinutes: toDaysMinutes
};
