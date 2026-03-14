// U.S. disability prevalence data mapped to Section 508 Functional Performance Criteria (FPC) codes.
//
// Primary source:
//   U.S. Census Bureau - American Community Survey (ACS) 2022 1-Year Estimates
//   https://www.census.gov/topics/health/disability.html
//   Table: B18101 - Sex by Age by Disability Status (civilian noninstitutionalized population)
//
// Supplemental sources:
//   - CDC National Center on Birth Defects and Developmental Disabilities
//     https://www.cdc.gov/ncbddd/disabilityandhealth/features/disability-prevalence-rural-urban.html
//   - National Institute on Deafness and Other Communication Disorders (NIDCD)
//     https://www.nidcd.nih.gov/health/statistics/quick-statistics-hearing
//   - American Foundation for the Blind (AFB) statistical snapshots
//     https://www.afb.org/research-and-initiatives/statistics
//   - National Eye Institute / NIH color vision deficiency estimates
//     https://www.nei.nih.gov/learn-about-eye-health/eye-conditions-and-diseases/color-blindness
//
// ACS 2022 six disability types (civilian noninstitutionalized population, all ages):
//   Vision difficulty:           8.1 million  (2.4%)
//   Hearing difficulty:         11.9 million  (3.5%)
//   Cognitive difficulty:       15.9 million  (4.7%)
//   Ambulatory difficulty:      19.6 million  (5.8%)
//   Self-care difficulty:        7.6 million  (2.2%)
//   Independent living (18+):   14.8 million  (4.4%)
//
// U.S. resident population (2022 Census estimate): ~335.9 million
//
// Notes on FPC mapping:
//   - WV  (Without Vision): severe/total blindness; subset of ACS vision difficulty.
//         AFB estimates ~3.4 million Americans are blind or have severe visual impairment (1.0%).
//   - LV  (Limited Vision): all vision difficulty including WV; ACS figure (2.4%).
//   - WPC (Without Perception of Color): color vision deficiency (color blindness).
//         NIH/NEI estimates ~8% of males and 0.5% of females are affected, yielding ~4.3% of the population.
//   - WH  (Without Hearing): severe-to-profound deafness (non-functional hearing).
//         NIDCD estimates ~1.1 million Americans have functional deafness (0.33%).
//   - LH  (Limited Hearing): all hearing difficulty including WH; ACS figure (3.5%).
//   - WS  (Without Speech): non-verbal or severe speech impairment.
//         NIDCD estimates ~7.5 million Americans have voice/speech/language disorders;
//         severe non-verbal subset estimated at ~0.5%.
//   - LM  (Limited Manipulation): fine-motor / dexterity disability.
//         Estimated as self-care difficulty subset + tremor/arthritis-based dexterity; ~2.2%.
//   - LRS (Limited Reach and Strength): mobility / ambulatory difficulty; ACS figure (5.8%).
//   - LLCLA (Cognitive/Learning): cognitive difficulty; ACS figure (4.7%).
//
// IMPORTANT: These rates are population-level estimates applied to web traffic counts.
// The resulting "excluded users" figures are rough estimates intended to highlight
// the scale of accessibility barriers, not precise measurements.
//
// Review schedule: This data should be checked annually.
// Current vintage: 2022  |  Next review: 2026-01-01

/** @readonly */
export const CENSUS_DISABILITY_STATS = {
  /** Calendar year of the underlying Census / ACS dataset. */
  vintage_year: 2022,

  /** ISO-8601 date after which this data should be reviewed and potentially updated. */
  next_review_date: '2026-01-01',

  /** Human-readable citation for the primary data source. */
  source: 'U.S. Census Bureau, American Community Survey (ACS) 2022 1-Year Estimates, Table B18101',

  /** Source URL for the primary data. */
  source_url: 'https://www.census.gov/topics/health/disability.html',

  /** U.S. resident population estimate for the vintage year (Census 2022). */
  us_population: 335_900_000,

  /**
   * Disability prevalence rates per Section 508 FPC code.
   * Each entry contains:
   *   - rate: fraction of the U.S. population affected (0-1)
   *   - estimated_population: approximate number of Americans affected
   *   - source_note: brief citation for this specific estimate
   */
  fpc_rates: {
    WV: {
      rate: 0.010,
      estimated_population: 3_400_000,
      source_note: 'AFB: ~3.4 million Americans with severe visual impairment or blindness'
    },
    LV: {
      rate: 0.024,
      estimated_population: 8_100_000,
      source_note: 'ACS 2022: vision difficulty (all severity levels)'
    },
    WPC: {
      rate: 0.043,
      estimated_population: 14_500_000,
      source_note: 'NIH/NEI: ~8% of males and ~0.5% of females have color vision deficiency'
    },
    WH: {
      rate: 0.003,
      estimated_population: 1_100_000,
      source_note: 'NIDCD: ~1.1 million Americans with functional deafness'
    },
    LH: {
      rate: 0.035,
      estimated_population: 11_900_000,
      source_note: 'ACS 2022: hearing difficulty (all severity levels)'
    },
    WS: {
      rate: 0.005,
      estimated_population: 1_700_000,
      source_note: 'NIDCD estimate: severe non-verbal or speech-absent population'
    },
    LM: {
      rate: 0.022,
      estimated_population: 7_600_000,
      source_note: 'ACS 2022: self-care difficulty (fine-motor / dexterity proxy)'
    },
    LRS: {
      rate: 0.058,
      estimated_population: 19_600_000,
      source_note: 'ACS 2022: ambulatory difficulty'
    },
    LLCLA: {
      rate: 0.047,
      estimated_population: 15_900_000,
      source_note: 'ACS 2022: cognitive difficulty'
    }
  }
};

/**
 * Returns true if the census data is considered stale (past its next_review_date).
 * @param {string} [today] - ISO-8601 date string; defaults to current date.
 * @returns {boolean}
 */
export function isCensusDataStale(today) {
  const checkDate = today ?? new Date().toISOString().slice(0, 10);
  return checkDate >= CENSUS_DISABILITY_STATS.next_review_date;
}

/**
 * Returns a plain-object map of FPC code -> prevalence rate, suitable for
 * use in existing prevalence-impact calculations.
 * @returns {Record<string, number>}
 */
export function getFpcPrevalenceRates() {
  return Object.fromEntries(
    Object.entries(CENSUS_DISABILITY_STATS.fpc_rates).map(([code, data]) => [code, data.rate])
  );
}
