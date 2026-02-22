import fs from 'node:fs/promises';

function toRecord(raw, sourceDate) {
  const rawUrl = raw.url ?? raw.page ?? raw.page_url ?? raw.hostname ?? raw.domain;
  const url =
    typeof rawUrl === 'string' && !rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')
      ? `https://${rawUrl}`
      : rawUrl;
  const pageLoadCount =
    raw.page_load_count ?? raw.pageviews ?? raw.views ?? raw.hits ?? raw.page_loads ?? raw.visits ?? null;

  if (!url || typeof url !== 'string') {
    return null;
  }

  const hasPageLoadValue = pageLoadCount !== null && pageLoadCount !== undefined && pageLoadCount !== '';
  const numericCount = hasPageLoadValue ? Number(pageLoadCount) : Number.NaN;
  const normalizedCount = Number.isFinite(numericCount) ? numericCount : null;

  return {
    url,
    page_load_count: normalizedCount,
    source_date: sourceDate
  };
}

export function normalizeDapRecords(rawRecords, { limit, sourceDate }) {
  const warnings = [];
  const excluded = [];

  const normalized = [];
  for (const raw of rawRecords) {
    const record = toRecord(raw, sourceDate);
    if (!record) {
      excluded.push({ reason: 'missing_url', raw });
      continue;
    }

    if (record.page_load_count === null) {
      warnings.push({
        code: 'missing_page_load_count',
        url: record.url,
        message: 'Page load count missing; record retained for scans but excluded from weighted impact metrics.'
      });
    }

    normalized.push(record);
  }

  normalized.sort((a, b) => {
    const left = a.page_load_count ?? -1;
    const right = b.page_load_count ?? -1;
    if (right !== left) {
      return right - left;
    }
    return a.url.localeCompare(b.url);
  });

  return {
    records: normalized.slice(0, limit),
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

function buildDapEndpoint(endpoint, apiKey) {
  const url = new URL(endpoint);

  if (apiKey && !url.searchParams.has('api_key')) {
    url.searchParams.set('api_key', apiKey);
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
  dapApiKey,
  fetchImpl = fetch
}) {
  let rawRecords;
  if (sourceFile) {
    rawRecords = await readDapRecordsFromFile(sourceFile);
  } else {
    const resolvedEndpoint = buildDapEndpoint(endpoint, dapApiKey);
    rawRecords = await fetchDapRecords({ endpoint: resolvedEndpoint, fetchImpl });
  }

  return normalizeDapRecords(rawRecords, { limit, sourceDate });
}
