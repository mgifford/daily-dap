// NN/g (Nielsen Norman Group) 10 Usability Heuristics mapped to WCAG 2.x Success Criteria.
//
// Source data from CivicActions accessibility-data-reference:
//   https://github.com/CivicActions/accessibility-data-reference/blob/main/NNg-usability-heuristics-wcag.csv
//
// Additional context:
//   https://rightbadcode.com/aligning-jakob-nielsens-10-usability-heuristics-with-the-wcag-22
//   https://blog.orium.com/usability-and-accessibility-213c3185314f
//
// These heuristics describe fundamental principles of usable interface design.
// Each heuristic maps to one or more WCAG Success Criteria (using the SC number
// without the leading "SC " prefix, e.g. "1.4.3" for SC 1.4.3 Contrast Minimum).

export const NNG_HEURISTICS = [
  {
    id: 1,
    name: 'Visibility of system status',
    url: 'https://www.nngroup.com/articles/visibility-system-status/',
    description: 'The design should always keep users informed about what is going on, through appropriate feedback within reasonable time.',
    wcag_sc: ['1.3.1', '1.3.2', '1.3.3', '1.4.1', '1.4.3', '1.4.6', '1.4.8', '1.4.10', '1.4.11', '1.4.13', '2.2.6', '2.3.3', '2.4.7', '2.5.1', '3.2.5', '3.3.6', '4.1.3'],
  },
  {
    id: 2,
    name: 'Match between system and the real world',
    url: 'https://www.nngroup.com/articles/match-system-real-world/',
    description: 'The design should speak the users\' language. Use words, phrases, and concepts familiar to the user, rather than internal jargon.',
    wcag_sc: ['1.3.6', '2.4.10', '2.5.6', '3.3.6', '4.1.3'],
  },
  {
    id: 3,
    name: 'User control and freedom',
    url: 'https://www.nngroup.com/articles/user-control-and-freedom/',
    description: 'Users often perform actions by mistake. They need a clearly marked "emergency exit" to leave the unwanted action without having to go through an extended process.',
    wcag_sc: ['1.3.3', '1.3.5', '1.3.6', '1.4.2', '1.4.4', '1.4.13', '2.4.10', '3.3.6'],
  },
  {
    id: 4,
    name: 'Consistency and standards',
    url: 'https://www.nngroup.com/articles/consistency-and-standards/',
    description: 'Users should not have to wonder whether different words, situations, or actions mean the same thing. Follow platform and industry conventions.',
    wcag_sc: ['1.3.1', '1.3.2', '1.3.3', '1.3.5', '1.4.13', '2.1.4', '2.4.4', '2.4.6', '2.4.9', '2.4.10', '2.5.1', '2.5.2', '2.5.3', '2.5.4', '2.5.6', '3.1.6', '3.2.5', '3.3.6'],
  },
  {
    id: 5,
    name: 'Error prevention',
    url: 'https://www.nngroup.com/articles/slips/',
    description: 'Good error messages are important, but the best designs carefully prevent problems from occurring in the first place.',
    wcag_sc: ['1.3.1', '1.4.1', '2.2.6', '3.2.5', '3.3.6'],
  },
  {
    id: 6,
    name: 'Recognition rather than recall',
    url: 'https://www.nngroup.com/articles/recognition-and-recall/',
    description: 'Minimize the user\'s memory load by making elements, actions, and options visible. The user should not have to remember information from one part of the interface to another.',
    wcag_sc: ['1.3.1', '1.3.2', '1.3.3', '1.3.5', '1.3.6', '1.4.3', '1.4.6', '1.4.8', '2.2.4', '2.4.2', '2.4.4', '2.4.6', '2.4.7', '2.4.9', '2.4.10', '3.2.5'],
  },
  {
    id: 7,
    name: 'Flexibility and efficiency of use',
    url: 'https://www.nngroup.com/articles/flexibility-efficiency-heuristic/',
    description: 'Shortcuts - hidden from novice users - may speed up the interaction for the expert user such that the design can cater to both inexperienced and experienced users.',
    wcag_sc: ['1.2.9', '1.3.3', '1.3.4', '1.4.2', '1.4.4', '1.4.5', '1.4.7', '1.4.8', '1.4.10', '2.1.4', '2.2.6', '2.4.1', '2.4.4', '2.4.5', '2.4.6', '2.4.7', '2.4.8', '2.4.9', '2.4.10', '2.5.1', '2.5.2', '2.5.3', '2.5.4', '2.5.6', '3.2.5', '3.3.6'],
  },
  {
    id: 8,
    name: 'Aesthetic and minimalist design',
    url: 'https://www.nngroup.com/articles/aesthetic-minimalist-design/',
    description: 'Interfaces should not contain irrelevant or rarely needed information. Every extra unit of information competes with the relevant information and diminishes their relative visibility.',
    wcag_sc: ['1.1.1', '1.3.1', '1.3.2', '1.3.5', '1.3.6', '1.4.1', '1.4.3', '1.4.5', '1.4.6'],
  },
  {
    id: 9,
    name: 'Help users recognize, diagnose, and recover from errors',
    url: 'https://www.nngroup.com/articles/error-message-guidelines/',
    description: 'Error messages should be expressed in plain language (no error codes), precisely indicate the problem, and constructively suggest a solution.',
    wcag_sc: ['1.3.1', '1.3.3', '1.3.5', '1.3.6', '1.4.1', '1.4.3', '1.4.6', '1.4.11', '2.2.6', '3.2.3', '3.2.4', '3.2.5', '3.3.6'],
  },
  {
    id: 10,
    name: 'Help and documentation',
    url: 'https://www.nngroup.com/articles/help-and-documentation/',
    description: 'It\'s best if the system doesn\'t need any additional explanation. However, it may be necessary to provide documentation to help users understand how to complete their tasks.',
    wcag_sc: ['1.1.1', '1.2.9', '1.3.1', '1.3.2', '1.3.5', '1.3.6', '1.4.1', '1.4.3', '1.4.5', '1.4.6', '2.1.4', '2.4.10', '3.3.6'],
  },
];

// Build a reverse lookup: WCAG SC string -> array of heuristic IDs
const _scToHeuristics = new Map();
for (const h of NNG_HEURISTICS) {
  for (const sc of h.wcag_sc) {
    if (!_scToHeuristics.has(sc)) {
      _scToHeuristics.set(sc, []);
    }
    _scToHeuristics.get(sc).push(h.id);
  }
}

/**
 * Returns the array of NN/g heuristic IDs (1-10) associated with a WCAG SC number.
 * Returns an empty array if none found.
 *
 * @param {string} sc - WCAG SC string (e.g. "1.4.3")
 * @returns {number[]}
 */
export function getHeuristicIdsForWcagSc(sc) {
  return _scToHeuristics.get(sc) ?? [];
}

/**
 * Returns the NNG_HEURISTICS entry for a given heuristic ID (1-10), or undefined.
 *
 * @param {number} id - Heuristic ID (1-10)
 * @returns {object|undefined}
 */
export function getHeuristicById(id) {
  return NNG_HEURISTICS.find((h) => h.id === id);
}
