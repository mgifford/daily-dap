import fs from 'node:fs/promises';

const LEGACY_COUNT_FIELDS = ['page_load_count', 'pageviews', 'views', 'hits', 'page_loads', 'visits'];
const WINDOW_COUNT_FIELDS = {
  daily: ['page_load_count_daily', ...LEGACY_COUNT_FIELDS],
  rolling_7d: ['page_load_count_rolling_7d', 'rolling_7d_page_load_count', 'pageviews_rolling_7d'],
  rolling_30d: ['page_load_count_rolling_30d', 'rolling_30d_page_load_count', 'pageviews_rolling_30d']
};

function normalizePageLoadCount(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numericCount = Number(value);
  return Number.isFinite(numericCount) ? numericCount : null;
}

function normalizeDateValue(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const trimmed = value.trim();
  const yyyyMmDdMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (yyyyMmDdMatch) {
    return yyyyMmDdMatch[1];
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }

  return parsed.toISOString().slice(0, 10);
}

function formatShiftedDate(dateString, daysToShift) {
  const parsed = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  parsed.setUTCDate(parsed.getUTCDate() + daysToShift);
  return parsed.toISOString().slice(0, 10);
}

function firstDefinedWindowValue(raw, fieldNames) {
  for (const fieldName of fieldNames) {
    const value = normalizePageLoadCount(raw?.[fieldName]);
    if (value !== null) {
      return value;
    }
  }

  return null;
}

function compactWindowCounts(windowCounts) {
  const compacted = Object.fromEntries(
    Object.entries(windowCounts).filter(([, value]) => value !== null)
  );

  return Object.keys(compacted).length > 0 ? compacted : null;
}

function extractWindowCounts(raw) {
  const rawWindowCounts =
    raw?.page_load_by_window && typeof raw.page_load_by_window === 'object'
      ? raw.page_load_by_window
      : {};

  const daily = normalizePageLoadCount(rawWindowCounts.daily) ?? firstDefinedWindowValue(raw, WINDOW_COUNT_FIELDS.daily);
  const rolling7d =
    normalizePageLoadCount(rawWindowCounts.rolling_7d) ?? firstDefinedWindowValue(raw, WINDOW_COUNT_FIELDS.rolling_7d);
  const rolling30d =
    normalizePageLoadCount(rawWindowCounts.rolling_30d) ?? firstDefinedWindowValue(raw, WINDOW_COUNT_FIELDS.rolling_30d);

  return {
    daily,
    rolling_7d: rolling7d,
    rolling_30d: rolling30d
  };
}

function selectWindowCount(windowCounts, trafficWindowMode = 'daily') {
  return windowCounts?.[trafficWindowMode] ?? windowCounts?.daily ?? null;
}

function toRecord(raw, sourceDate) {
  const rawUrl = raw.url ?? raw.page ?? raw.page_url ?? raw.hostname ?? raw.domain;
  const url =
    typeof rawUrl === 'string' && !rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')
      ? `https://${rawUrl}`
      : rawUrl;
  const windowCounts = extractWindowCounts(raw);

  if (!url || typeof url !== 'string') {
    return null;
  }

  return {
    url,
    page_load_count: windowCounts.daily,
    page_load_count_daily: windowCounts.daily,
    page_load_count_rolling_7d: windowCounts.rolling_7d,
    page_load_count_rolling_30d: windowCounts.rolling_30d,
    page_load_by_window: compactWindowCounts(windowCounts),
    source_date: normalizeDateValue(raw.date ?? sourceDate)
  };
}

function computeRollingAverage(history, endDate, days) {
  if (!Array.isArray(history) || !endDate) {
    return null;
  }

  const startDate = formatShiftedDate(endDate, -(days - 1));
  if (!startDate) {
    return null;
  }

  const windowValues = history
    .filter((entry) => typeof entry.source_date === 'string' && entry.source_date >= startDate && entry.source_date <= endDate)
    .map((entry) => entry.page_load_count_daily ?? entry.page_load_count)
    .filter((value) => typeof value === 'number' && Number.isFinite(value));

  if (windowValues.length === 0) {
    return null;
  }

  const average = windowValues.reduce((sum, value) => sum + value, 0) / windowValues.length;
  return Math.round(average * 100) / 100;
}

function buildHistoryByUrl(records) {
  return records.reduce((accumulator, record) => {
    const existing = accumulator.get(record.url) ?? [];
    existing.push(record);
    accumulator.set(record.url, existing);
    return accumulator;
  }, new Map());
}

function resolveEffectiveTargetDate(records, targetDate, warnings) {
  const datedRecords = records.filter((record) => typeof record.source_date === 'string');
  if (datedRecords.length === 0) {
    return null;
  }

  const availableDates = [...new Set(datedRecords.map((record) => record.source_date))].sort();
  const latestDate = availableDates[availableDates.length - 1];
  const normalizedTargetDate = normalizeDateValue(targetDate);

  if (!normalizedTargetDate) {
    return latestDate;
  }

  if (availableDates.includes(normalizedTargetDate)) {
    return normalizedTargetDate;
  }

  warnings.push({
    code: 'target_source_date_unavailable',
    message: `Requested DAP source date ${normalizedTargetDate} was unavailable; using latest available date ${latestDate}.`,
    requested_source_date: normalizedTargetDate,
    fallback_source_date: latestDate
  });
  return latestDate;
}

function hydrateTrafficWindows(record, historyByUrl, effectiveTargetDate, trafficWindowMode) {
  const history = historyByUrl.get(record.url) ?? [];
  const pageLoadCountDaily =
    record.page_load_count_daily ??
    computeRollingAverage(history, effectiveTargetDate ?? record.source_date, 1);
  const pageLoadCountRolling7d =
    record.page_load_count_rolling_7d ??
    computeRollingAverage(history, effectiveTargetDate ?? record.source_date, 7);
  const pageLoadCountRolling30d =
    record.page_load_count_rolling_30d ??
    computeRollingAverage(history, effectiveTargetDate ?? record.source_date, 30);
  const pageLoadByWindow = compactWindowCounts({
    daily: pageLoadCountDaily,
    rolling_7d: pageLoadCountRolling7d,
    rolling_30d: pageLoadCountRolling30d
  });

  return {
    ...record,
    source_date: effectiveTargetDate ?? record.source_date,
    page_load_count_daily: pageLoadCountDaily,
    page_load_count_rolling_7d: pageLoadCountRolling7d,
    page_load_count_rolling_30d: pageLoadCountRolling30d,
    page_load_by_window: pageLoadByWindow,
    page_load_count: selectWindowCount(pageLoadByWindow, trafficWindowMode)
  };
}

export function normalizeDapRecords(rawRecords, { limit, sourceDate, targetDate, trafficWindowMode = 'daily' }) {
  const warnings = [];
  const excluded = [];

  const normalized = [];
  for (const raw of rawRecords) {
    const record = toRecord(raw, sourceDate);
    if (!record) {
      excluded.push({ reason: 'missing_url', raw });
      continue;
    }

    // Skip synthetic DAP placeholder entries such as "(other)" that are not real scannable URLs
    if (/^https?:\/\/\(/.test(record.url)) {
      excluded.push({ reason: 'placeholder_url', raw });
      continue;
    }

    normalized.push(record);
  }

  const effectiveTargetDate = resolveEffectiveTargetDate(normalized, targetDate, warnings);
  const historyByUrl = buildHistoryByUrl(normalized);
  const selectedRecords =
    effectiveTargetDate == null
      ? normalized
      : normalized.filter((record) => record.source_date === effectiveTargetDate);

  const hydratedRecords = selectedRecords.map((record) =>
    hydrateTrafficWindows(record, historyByUrl, effectiveTargetDate, trafficWindowMode)
  );

  for (const record of hydratedRecords) {
    if (record.page_load_count === null) {
      warnings.push({
        code: 'missing_page_load_count',
        url: record.url,
        message: 'Page load count missing for the selected traffic window; record retained for scans but excluded from weighted impact metrics.'
      });
    }
  }

  hydratedRecords.sort((a, b) => {
    const left = a.page_load_count ?? -1;
    const right = b.page_load_count ?? -1;
    if (right !== left) {
      return right - left;
    }
    return a.url.localeCompare(b.url);
  });

  return {
    records: hydratedRecords.slice(0, limit),
    warnings,
    excluded
  };
}

function extractArrayPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload?.data && Array.isArray(payload.data)) {
    return payload.data;
  }

  if (payload?.items && Array.isArray(payload.items)) {
    return payload.items;
  }

  throw new Error('DAP payload did not contain an array of records.');
}

export async function fetchDapRecords({ endpoint, fetchImpl = fetch }) {
  const response = await fetchImpl(endpoint);
  if (!response.ok) {
    throw new Error(`Failed to fetch DAP records (${response.status}) from ${endpoint}`);
  }

  const payload = await response.json();
  return extractArrayPayload(payload);
}

function buildDapEndpoint(endpoint, apiKey, { limit } = {}) {
  const url = new URL(endpoint);

  if (apiKey && !url.searchParams.has('api_key')) {
    url.searchParams.set('api_key', apiKey);
  }

  if (limit != null && !url.searchParams.has('limit')) {
    url.searchParams.set('limit', String(limit));
  }

  return url.toString();
}

export async function readDapRecordsFromFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf-8');
  const payload = JSON.parse(raw);
  return extractArrayPayload(payload);
}

export async function getNormalizedTopPages({
  endpoint,
  sourceFile,
  limit,
  sourceDate,
  targetDate,
  trafficWindowMode,
  dapApiKey,
  fetchImpl = fetch
}) {
  let rawRecords;
  if (sourceFile) {
    rawRecords = await readDapRecordsFromFile(sourceFile);
  } else {
    const resolvedEndpoint = buildDapEndpoint(endpoint, dapApiKey, { limit });
    rawRecords = await fetchDapRecords({ endpoint: resolvedEndpoint, fetchImpl });
  }

  return normalizeDapRecords(rawRecords, { limit, sourceDate, targetDate, trafficWindowMode });
}
