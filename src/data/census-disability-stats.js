// U.S. disability prevalence data mapped to Section 508 Functional Performance Criteria (FPC) codes.
//
// Primary source:
//   U.S. Census Bureau - American Community Survey (ACS) 2023 1-Year Estimates
//   https://www.census.gov/topics/health/disability.html
//   Table: B18101 - Sex by Age by Disability Status (civilian noninstitutionalized population)
//   https://data.census.gov/table/ACSDT1Y2023.B18101
//
// FPC reference:
//   Section 508 Functional Performance Criteria (FPC):
//   https://www.section508.gov/develop/mapping-wcag-to-fpc/
//
// Supplemental sources:
//   - CDC Disability and Health Data System (DHDS) - state and national BRFSS-based estimates
//     https://dhds.cdc.gov/
//   - CDC National Center on Birth Defects and Developmental Disabilities
//     https://www.cdc.gov/ncbddd/disabilityandhealth/features/disability-prevalence-rural-urban.html
//   - National Institute on Deafness and Other Communication Disorders (NIDCD)
//     https://www.nidcd.nih.gov/health/statistics/quick-statistics-hearing
//   - American Foundation for the Blind (AFB) statistical snapshots
//     https://www.afb.org/research-and-initiatives/statistics
//   - National Eye Institute / NIH color vision deficiency estimates
//     https://www.nei.nih.gov/learn-about-eye-health/eye-conditions-and-diseases/color-blindness
//
// FPS prevalence estimates (aligned to Section 508 Functional Performance Specification):
//   Without Vision:              3.4 million  (1.0%)  - AFB estimate, severe visual impairment/blindness
//   Limited Vision:              8.1 million  (2.4%)  - ACS + supplemental vision difficulty estimates
//   Without Perception of Color: 14.5 million (4.3%)  - NIH/NEI color vision deficiency
//   Without Hearing:             1.1 million  (0.3%)  - NIDCD functional deafness estimate
//   Limited Hearing:             11.9 million (3.5%)  - NIDCD/ACS hearing difficulty estimates
//   Without Speech:              1.7 million  (0.5%)  - NIDCD severe non-verbal estimate
//   Limited Manipulation:        7.6 million  (2.2%)  - ACS self-care + dexterity estimates
//   Limited Reach and Strength:  19.6 million (5.8%)  - ACS ambulatory difficulty
//   LLCLA:                       15.9 million (4.7%)  - ACS/CDC cognitive difficulty estimates
//
// U.S. resident population (2023 ACS estimate): ~336.5 million
//
// Notes on FPC mapping:
//   - WV  (Without Vision): severe/total blindness; subset of ACS vision difficulty.
//         AFB estimates ~3.4 million Americans are blind or have severe visual impairment (1.0%).
//   - LV  (Limited Vision): all vision difficulty including WV.
//         ACS plus supplemental vision estimates yield ~2.4% of the population (~8.1 million).
//   - WPC (Without Perception of Color): color vision deficiency (color blindness).
//         NIH/NEI estimates ~8% of males and 0.5% of females are affected, yielding ~4.3% of the population.
//   - WH  (Without Hearing): severe-to-profound deafness (non-functional hearing).
//         NIDCD estimates ~1.1 million Americans have functional deafness (0.3%).
//   - LH  (Limited Hearing): all hearing difficulty including WH.
//         NIDCD/ACS combined hearing difficulty estimates yield ~3.5% (~11.9 million).
//   - WS  (Without Speech): non-verbal or severe speech impairment.
//         NIDCD estimates ~7.5 million Americans have voice/speech/language disorders;
//         severe non-verbal subset estimated at ~0.5%.
//   - LM  (Limited Manipulation): fine-motor / dexterity disability.
//         Estimated as self-care difficulty subset + tremor/arthritis-based dexterity; ~2.2%.
//   - LRS (Limited Reach and Strength): mobility / ambulatory difficulty.
//         ACS ambulatory difficulty estimates yield ~5.8% (~19.6 million).
//   - LLCLA (Cognitive/Learning): cognitive difficulty.
//         ACS/CDC combined cognitive and learning disability estimates yield ~4.7% (~15.9 million).
//
// IMPORTANT: These rates are population-level estimates applied to web traffic counts.
// The resulting "excluded users" figures are rough estimates intended to highlight
// the scale of accessibility barriers, not precise measurements.
//
// Review schedule: This data should be checked annually.
// ACS 1-year estimates are typically released each September for the prior calendar year.
// Current vintage: 2023  |  Next review: 2027-01-01

/** @readonly */
export const CENSUS_DISABILITY_STATS = {
  /** Calendar year of the underlying Census / ACS dataset. */
  vintage_year: 2023,

  /** ISO-8601 date after which this data should be reviewed and potentially updated. */
  next_review_date: '2027-01-01',

  /** Human-readable citation for the primary data source. */
  source: 'U.S. Census Bureau, American Community Survey (ACS) 2023 1-Year Estimates, Table B18101',

  /** Source URL for the primary data. Points to the ACS disability topic page. */
  source_url: 'https://www.census.gov/topics/health/disability.html',

  /** Direct URL to the ACS B18101 data table. */
  source_table_url: 'https://data.census.gov/table/ACSDT1Y2023.B18101',

  /** U.S. resident population estimate for the vintage year (ACS 2023). */
  us_population: 336_500_000,

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
      source_note: 'ACS 2023 + supplemental estimates: vision difficulty (all severity levels); ~2.4% of U.S. population'
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
      source_note: 'NIDCD/ACS combined hearing difficulty estimates: ~3.5% of U.S. population'
    },
    WS: {
      rate: 0.005,
      estimated_population: 1_700_000,
      source_note: 'NIDCD estimate: severe non-verbal or speech-absent population'
    },
    LM: {
      rate: 0.022,
      estimated_population: 7_600_000,
      source_note: 'ACS 2023 self-care difficulty + dexterity estimates: ~2.2% of U.S. population'
    },
    LRS: {
      rate: 0.058,
      estimated_population: 19_600_000,
      source_note: 'ACS 2023: ambulatory difficulty; ~5.8% of U.S. population'
    },
    LLCLA: {
      rate: 0.047,
      estimated_population: 15_900_000,
      source_note: 'ACS 2023/CDC combined cognitive and learning disability estimates: ~4.7% of U.S. population'
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
