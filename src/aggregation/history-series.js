function toDateString(value) {
  if (typeof value === 'string') {
    return value;
  }
  const iso = value.toISOString();
  return iso.slice(0, 10);
}

function addDays(date, delta) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + delta);
  return next;
}

function getWindowDays(options) {
  if (Number.isInteger(options.windowDays) && options.windowDays > 0) {
    return options.windowDays;
  }

  const mode = options.trafficWindowMode ?? 'daily';
  const fromMode = options.lookbackByMode?.[mode];
  if (Number.isInteger(fromMode) && fromMode > 0) {
    return fromMode;
  }

  return 31;
}

export function buildHistorySeries(historyRecords = [], options = {}) {
  const trafficWindowMode = options.trafficWindowMode ?? 'daily';
  const windowDays = getWindowDays(options);

  const normalizedRecords = historyRecords
    .filter((record) => typeof record?.run_date === 'string')
    .map((record) => ({ ...record, run_date: record.run_date.slice(0, 10) }));

  const latestRecordDate = normalizedRecords.reduce((latest, record) => {
    if (!latest || record.run_date > latest) {
      return record.run_date;
    }
    return latest;
  }, null);

  const anchorDate = options.runDate ?? latestRecordDate;
  if (!anchorDate) {
    return {
      traffic_window_mode: trafficWindowMode,
      window_days: windowDays,
      start_date: null,
      end_date: null,
      history_series: []
    };
  }

  const dateMap = new Map(normalizedRecords.map((record) => [record.run_date, record]));
  const endDate = new Date(`${anchorDate}T00:00:00.000Z`);
  const startDate = addDays(endDate, -(windowDays - 1));

  const history_series = [];
  for (let offset = 0; offset < windowDays; offset += 1) {
    const current = addDays(startDate, offset);
    const runDate = toDateString(current);
    const record = dateMap.get(runDate);

    if (record) {
      history_series.push(record);
    } else {
      history_series.push({
        run_date: runDate,
        missing: true
      });
    }
  }

  return {
    traffic_window_mode: trafficWindowMode,
    window_days: windowDays,
    start_date: toDateString(startDate),
    end_date: toDateString(endDate),
    history_series
  };
}
