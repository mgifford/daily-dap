/**
 * Environmental Conditions Scanner
 *
 * Fetches air quality (AQI) and pollen data for major U.S. metro areas to
 * identify when environmental conditions may create situational disabilities
 * such as reduced vision, irritation, fatigue, or cognitive load.
 *
 * Data sources:
 *   - AirNow API (requires AIRNOW_API_KEY)
 *   - Google Pollen API (requires GOOGLE_MAPS_API_KEY)
 *   - Seasonal pollen estimate fallback (no API key required)
 *
 * This is a heuristic signal, not a scientific exposure model.
 * It does not claim medical accuracy or population exposure percentages.
 */

/**
 * Representative ZIP codes for major U.S. metro areas used for API queries.
 * These are central ZIP codes for each metro area.
 */
export const METRO_LIST = [
  { metro: 'New York', zip: '10001', lat: 40.7128, lon: -74.006 },
  { metro: 'Los Angeles', zip: '90012', lat: 34.0522, lon: -118.2437 },
  { metro: 'Chicago', zip: '60601', lat: 41.8827, lon: -87.6233 },
  { metro: 'Houston', zip: '77002', lat: 29.7604, lon: -95.3698 },
  { metro: 'Phoenix', zip: '85004', lat: 33.4484, lon: -112.074 },
  { metro: 'Philadelphia', zip: '19102', lat: 39.9526, lon: -75.1652 },
  { metro: 'San Antonio', zip: '78205', lat: 29.4241, lon: -98.4936 },
  { metro: 'San Diego', zip: '92101', lat: 32.7157, lon: -117.1611 },
  { metro: 'Dallas', zip: '75201', lat: 32.7767, lon: -96.797 },
  { metro: 'San Jose', zip: '95113', lat: 37.3382, lon: -121.8863 },
  { metro: 'Austin', zip: '78701', lat: 30.2672, lon: -97.7431 },
  { metro: 'Jacksonville', zip: '32202', lat: 30.3322, lon: -81.6557 },
  { metro: 'Fort Worth', zip: '76102', lat: 32.7555, lon: -97.3308 },
  { metro: 'Columbus', zip: '43215', lat: 39.9612, lon: -82.9988 },
  { metro: 'Charlotte', zip: '28202', lat: 35.2271, lon: -80.8431 },
  { metro: 'San Francisco', zip: '94102', lat: 37.7749, lon: -122.4194 },
  { metro: 'Indianapolis', zip: '46204', lat: 39.7684, lon: -86.1581 },
  { metro: 'Seattle', zip: '98101', lat: 47.6062, lon: -122.3321 },
  { metro: 'Denver', zip: '80202', lat: 39.7392, lon: -104.9903 },
  { metro: 'Washington DC', zip: '20001', lat: 38.9072, lon: -77.0369 },
  { metro: 'Boston', zip: '02101', lat: 42.3601, lon: -71.0589 },
  { metro: 'Detroit', zip: '48226', lat: 42.3314, lon: -83.0458 },
  { metro: 'Nashville', zip: '37201', lat: 36.1627, lon: -86.7816 },
  { metro: 'Portland', zip: '97201', lat: 45.5231, lon: -122.6765 },
  { metro: 'Las Vegas', zip: '89101', lat: 36.1699, lon: -115.1398 },
  { metro: 'Baltimore', zip: '21202', lat: 39.2904, lon: -76.6122 },
  { metro: 'Milwaukee', zip: '53202', lat: 43.0389, lon: -87.9065 },
  { metro: 'Albuquerque', zip: '87102', lat: 35.0844, lon: -106.6504 },
  { metro: 'Tucson', zip: '85701', lat: 32.2226, lon: -110.9747 },
  { metro: 'Fresno', zip: '93721', lat: 36.7378, lon: -119.7871 },
  { metro: 'Sacramento', zip: '95814', lat: 38.5816, lon: -121.4944 },
  { metro: 'Atlanta', zip: '30303', lat: 33.749, lon: -84.388 },
  { metro: 'Miami', zip: '33101', lat: 25.7617, lon: -80.1918 },
  { metro: 'Minneapolis', zip: '55401', lat: 44.9778, lon: -93.265 },
  { metro: 'Cleveland', zip: '44113', lat: 41.4993, lon: -81.6944 },
  { metro: 'New Orleans', zip: '70112', lat: 29.9511, lon: -90.0715 },
  { metro: 'Tampa', zip: '33602', lat: 27.9506, lon: -82.4572 },
  { metro: 'St. Louis', zip: '63101', lat: 38.627, lon: -90.1994 },
  { metro: 'Pittsburgh', zip: '15222', lat: 40.4406, lon: -79.9959 },
  { metro: 'Cincinnati', zip: '45202', lat: 39.1031, lon: -84.512 },
  { metro: 'Kansas City', zip: '64105', lat: 39.0997, lon: -94.5786 }
];

/**
 * AQI threshold for "affected" status. Scores >= 101 indicate conditions
 * that are unhealthy for sensitive groups.
 */
export const AQI_AFFECTED_THRESHOLD = 101;

/**
 * Pollen categories that indicate "affected" status.
 * These are the Google Pollen API category codes for high and very high pollen.
 */
export const POLLEN_AFFECTED_CATEGORIES = new Set(['HIGH', 'VERY_HIGH']);

/**
 * Seasonal pollen estimate windows (month ranges, 1-indexed).
 * Used when the Google Pollen API is unavailable.
 */
export const SEASONAL_POLLEN_WINDOWS = {
  TREE: { startMonth: 3, endMonth: 6 },
  GRASS: { startMonth: 5, endMonth: 7 },
  WEED: { startMonth: 8, endMonth: 10 }
};

/**
 * Determine if an AQI value indicates affected status.
 *
 * @param {number|null|undefined} aqi
 * @returns {boolean}
 */
export function isAqiAffected(aqi) {
  return typeof aqi === 'number' && Number.isFinite(aqi) && aqi >= AQI_AFFECTED_THRESHOLD;
}

/**
 * Determine if a pollen category string indicates affected status.
 *
 * @param {string|null|undefined} category
 * @returns {boolean}
 */
export function isPollenAffected(category) {
  return typeof category === 'string' && POLLEN_AFFECTED_CATEGORIES.has(category.toUpperCase());
}

/**
 * Return which pollen types are seasonally active for a given month (1-12).
 * Used as a fallback when live pollen data is unavailable.
 *
 * @param {number} month - 1-indexed month (1 = January)
 * @returns {Array<{type: string, dataType: 'seasonal'}>}
 */
export function getSeasonalPollenTypes(month) {
  const result = [];
  for (const [type, { startMonth, endMonth }] of Object.entries(SEASONAL_POLLEN_WINDOWS)) {
    if (month >= startMonth && month <= endMonth) {
      result.push({ type, dataType: 'seasonal' });
    }
  }
  return result;
}

/**
 * Compute the overall environmental level from total affected signals.
 * Signals = pollutionMetroCount + particleMetroCount + pollenMetroCount.
 *
 * - low: 0-2 total affected signals
 * - moderate: 3-5 total affected signals
 * - high: 6+ total affected signals
 *
 * This is a heuristic, not a scientific model.
 *
 * @param {number} totalSignals
 * @returns {'low'|'moderate'|'high'}
 */
export function computeOverallLevel(totalSignals) {
  if (totalSignals <= 2) return 'low';
  if (totalSignals <= 5) return 'moderate';
  return 'high';
}

/**
 * Parse AirNow API response observations for a single metro into AQI values.
 *
 * @param {Array} observations - Raw array from AirNow API
 * @returns {{ aqi: number|null, pm25Aqi: number|null }}
 */
export function parseAirNowObservations(observations) {
  if (!Array.isArray(observations) || observations.length === 0) {
    return { aqi: null, pm25Aqi: null };
  }

  let maxAqi = null;
  let pm25Aqi = null;

  for (const obs of observations) {
    const aqiValue = typeof obs.AQI === 'number' ? obs.AQI : null;
    if (aqiValue !== null) {
      if (maxAqi === null || aqiValue > maxAqi) {
        maxAqi = aqiValue;
      }
      const paramName = typeof obs.ParameterName === 'string' ? obs.ParameterName.trim() : '';
      if (paramName === 'PM2.5') {
        if (pm25Aqi === null || aqiValue > pm25Aqi) {
          pm25Aqi = aqiValue;
        }
      }
    }
  }

  return { aqi: maxAqi, pm25Aqi };
}

/**
 * Parse Google Pollen API response for a single metro into pollen type results.
 * Returns an array of affected pollen types (HIGH or VERY_HIGH).
 *
 * @param {object} pollenResponse - Raw response from Google Pollen API
 * @returns {Array<{type: string, category: string, dataType: 'forecast'|'current'}>}
 */
export function parsePollenResponse(pollenResponse) {
  if (!pollenResponse || !Array.isArray(pollenResponse.dailyInfo)) {
    return [];
  }

  const firstDay = pollenResponse.dailyInfo[0];
  if (!firstDay || !Array.isArray(firstDay.pollenTypeInfo)) {
    return [];
  }

  const result = [];
  for (const typeInfo of firstDay.pollenTypeInfo) {
    const code = typeInfo?.code;
    const categoryCode = typeInfo?.indexInfo?.code;
    if (code && categoryCode) {
      result.push({
        type: code,
        category: categoryCode,
        dataType: 'forecast'
      });
    }
  }
  return result;
}

/**
 * Fetch AirNow air quality data for a single metro area.
 * Returns null on API failure or missing key.
 *
 * @param {object} metro - Metro object from METRO_LIST
 * @param {string} apiKey - AirNow API key
 * @param {Function} fetchImpl - Fetch implementation (allows injection for testing)
 * @returns {Promise<{aqi: number|null, pm25Aqi: number|null}|null>}
 */
export async function fetchAirNowForMetro(metro, apiKey, fetchImpl = globalThis.fetch) {
  try {
    const url = `https://www.airnowapi.org/aq/observation/zipCode/current/?format=application/json&zipCode=${encodeURIComponent(metro.zip)}&distance=25&API_KEY=${encodeURIComponent(apiKey)}`;
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return parseAirNowObservations(data);
  } catch {
    return null;
  }
}

/**
 * Fetch Google Pollen data for a single metro area.
 * Returns null on API failure or missing key.
 *
 * @param {object} metro - Metro object from METRO_LIST
 * @param {string} apiKey - Google Maps API key
 * @param {Function} fetchImpl - Fetch implementation (allows injection for testing)
 * @returns {Promise<Array<{type: string, category: string, dataType: 'forecast'|'current'}>|null>}
 */
export async function fetchPollenForMetro(metro, apiKey, fetchImpl = globalThis.fetch) {
  try {
    const url = `https://pollen.googleapis.com/v1/forecast:lookup?location.longitude=${encodeURIComponent(metro.lon)}&location.latitude=${encodeURIComponent(metro.lat)}&days=1&key=${encodeURIComponent(apiKey)}`;
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return parsePollenResponse(data);
  } catch {
    return null;
  }
}

/**
 * Build a seasonal pollen entry for a metro using the seasonal estimate fallback.
 * Returns null if no pollen types are in season for the given month.
 *
 * @param {object} metro - Metro object from METRO_LIST
 * @param {number} month - 1-indexed month
 * @returns {{metro: string, pollenTypes: string[], category: 'SEASONAL', dataType: 'seasonal'}|null}
 */
function buildSeasonalPollenEntry(metro, month) {
  const types = getSeasonalPollenTypes(month);
  if (types.length === 0) return null;
  return {
    metro: metro.metro,
    pollenTypes: types.map((t) => t.type),
    category: 'SEASONAL',
    dataType: 'seasonal'
  };
}

/**
 * Gather air quality data for all metros.
 * Returns an array of per-metro results, with null for failures.
 *
 * @param {string} apiKey
 * @param {Function} fetchImpl
 * @returns {Promise<Array<{metro: string, aqi: number|null, pm25Aqi: number|null}|null>>}
 */
async function gatherAirQualityData(apiKey, fetchImpl) {
  const results = await Promise.allSettled(
    METRO_LIST.map((metro) => fetchAirNowForMetro(metro, apiKey, fetchImpl))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled' && result.value !== null) {
      return {
        metro: METRO_LIST[index].metro,
        aqi: result.value.aqi,
        pm25Aqi: result.value.pm25Aqi
      };
    }
    return null;
  });
}

/**
 * Gather pollen data for all metros using Google Pollen API.
 * Returns an array of per-metro results, with null for failures.
 *
 * @param {string} apiKey
 * @param {Function} fetchImpl
 * @returns {Promise<Array<{metro: string, pollenTypes: Array}>|null>}
 */
async function gatherPollenData(apiKey, fetchImpl) {
  const results = await Promise.allSettled(
    METRO_LIST.map((metro) => fetchPollenForMetro(metro, apiKey, fetchImpl))
  );

  const output = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled' && result.value !== null) {
      output.push({
        metro: METRO_LIST[i].metro,
        pollenTypes: result.value
      });
    } else {
      output.push(null);
    }
  }
  return output;
}

/**
 * Main entry point: fetch and aggregate all environmental conditions data.
 *
 * Gracefully degrades:
 *   - If AIRNOW_API_KEY is missing: no air quality data
 *   - If GOOGLE_MAPS_API_KEY is missing: falls back to seasonal pollen estimates
 *   - If APIs fail: falls back to seasonal pollen or marks data unavailable
 *
 * @param {object} options
 * @param {string|undefined} options.airnowApiKey - AirNow API key (optional)
 * @param {string|undefined} options.googleMapsApiKey - Google Maps API key for Pollen API (optional)
 * @param {string|undefined} options.date - Run date string YYYY-MM-DD (used for seasonal fallback)
 * @param {Function} [options.fetchImpl] - Fetch implementation for testing
 * @returns {Promise<object>} environmentalConditions payload
 */
export async function fetchEnvironmentalConditions({
  airnowApiKey,
  googleMapsApiKey,
  date,
  fetchImpl = globalThis.fetch
} = {}) {
  const runDate = date ? new Date(date) : new Date();
  const month = runDate.getUTCMonth() + 1;

  const limitations = [
    'This is a heuristic signal based on metro-level data, not a scientific exposure model.',
    'Air quality data is from AirNow and may not reflect real-time conditions for all metro areas.',
    'Pollen data is from Google Pollen API (forecast-based) when available, otherwise a seasonal estimate is used.',
    'Particle pollution (PM2.5) is used as a proxy for airborne particulates, which may include wildfire smoke, dust, or other sources. Specific causes are not identified.',
    'This feature does not claim medical accuracy or population exposure percentages.'
  ];

  // --- Air Quality (AirNow) ---
  let airQualityResults = [];
  let airQualitySourceNote = 'Air quality data unavailable (AIRNOW_API_KEY not configured).';
  let airQualityFetched = false;

  if (airnowApiKey) {
    try {
      airQualityResults = await gatherAirQualityData(airnowApiKey, fetchImpl);
      airQualityFetched = true;
      const successCount = airQualityResults.filter((r) => r !== null).length;
      airQualitySourceNote = `Air quality data from AirNow API. ${successCount} of ${METRO_LIST.length} metro areas returned data.`;
    } catch {
      airQualitySourceNote = 'Air quality data unavailable (AirNow API request failed).';
    }
  }

  const pollutionAffectedMetros = airQualityResults
    .filter((r) => r !== null && isAqiAffected(r.aqi))
    .map((r) => r.metro);

  const particleAffectedMetros = airQualityResults
    .filter((r) => r !== null && isAqiAffected(r.pm25Aqi))
    .map((r) => r.metro);

  const pollutionMetroCount = pollutionAffectedMetros.length;
  const particleMetroCount = particleAffectedMetros.length;

  // --- Pollen ---
  let pollenProvider = 'unavailable';
  let pollenMetroCount = 0;
  let pollenAffectedMetros = [];
  let pollenSourceNote = 'Pollen data unavailable.';
  let pollenDataFetched = false;

  if (googleMapsApiKey) {
    try {
      const pollenData = await gatherPollenData(googleMapsApiKey, fetchImpl);
      const successfulMetros = pollenData.filter((r) => r !== null).length;

      if (successfulMetros > 0) {
        pollenDataFetched = true;

        const googleAffected = [];
        for (let i = 0; i < pollenData.length; i++) {
          const result = pollenData[i];
          if (result === null) continue;
          const affectedTypes = result.pollenTypes.filter((pt) => isPollenAffected(pt.category));
          if (affectedTypes.length > 0) {
            googleAffected.push({
              metro: result.metro,
              pollenTypes: affectedTypes.map((pt) => pt.type),
              category: affectedTypes[0].category,
              dataType: 'forecast'
            });
          }
        }

        pollenProvider = 'google-pollen';
        pollenAffectedMetros = googleAffected;
        pollenMetroCount = googleAffected.length;
        pollenSourceNote = 'Pollen data from Google Pollen API (forecast-based).';
      }
    } catch {
      pollenDataFetched = false;
    }
  }

  if (!pollenDataFetched) {
    const seasonalTypes = getSeasonalPollenTypes(month);
    if (seasonalTypes.length > 0) {
      pollenProvider = 'seasonal-estimate';
      pollenAffectedMetros = METRO_LIST.map((metro) =>
        buildSeasonalPollenEntry(metro, month)
      ).filter(Boolean);
      pollenMetroCount = pollenAffectedMetros.length;
      pollenSourceNote =
        'Pollen data is a seasonal estimate, not live data. Live Google Pollen data was unavailable.';
    } else {
      pollenProvider = 'seasonal-estimate';
      pollenSourceNote =
        'Pollen data is a seasonal estimate. No pollen types are expected in season for this month.';
    }
  }

  const totalSignals = pollutionMetroCount + particleMetroCount + pollenMetroCount;
  const overallLevel = computeOverallLevel(totalSignals);

  const sourceNotes = [airQualitySourceNote, pollenSourceNote];

  if (particleAffectedMetros.length > 0) {
    sourceNotes.push(
      `Particle pollution (PM2.5 AQI >= ${AQI_AFFECTED_THRESHOLD}) detected in ${particleMetroCount} metro area(s). This may include wildfire smoke, dust, or other airborne particulates.`
    );
  }

  return {
    date: date ?? runDate.toISOString().slice(0, 10),
    overallLevel,
    pollutionMetroCount,
    particleMetroCount,
    affectedMetros: [...new Set([...pollutionAffectedMetros, ...particleAffectedMetros])],
    pollen: {
      provider: pollenProvider,
      pollenMetroCount,
      affectedMetros: pollenAffectedMetros,
      sourceNote: pollenSourceNote,
      limitations: [
        'Pollen conditions are based on Google Pollen API data when available.',
        'When live data is unavailable, a seasonal estimate is used.',
        'This is a situational signal, not a medical or exposure model.',
        'Seasonal estimates apply uniformly across all tracked metro areas regardless of local conditions.'
      ]
    },
    sourceNotes,
    limitations,
    airQualityFetched,
    pollenDataFetched
  };
}
