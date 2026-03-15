// Mapping from axe rule IDs to Section 508 Functional Performance Criteria (FPC) codes.
//
// Sources:
//   - axeTypes.yaml  (axe rule -> disabilities)
//     https://github.com/CivicActions/accessibility-data-reference/blob/main/axeTypes.yaml
//   - axeType2FPC.yaml  (disabilities -> FPC)
//     https://github.com/CivicActions/accessibility-data-reference/blob/main/axeType2FPC.yaml
//   - mapping-wcag-to-fpc.csv  (WCAG SC -> FPC)
//     https://github.com/CivicActions/accessibility-data-reference/blob/main/mapping-wcag-to-fpc.csv
//   - Section 508 FPC reference:
//     https://www.section508.gov/develop/mapping-wcag-to-fpc/
//   - EN 301 549 v3.2.1 Table B.2:
//     https://www.etsi.org/deliver/etsi_en/301500_301599/301549/03.02.01_60/en_301549v030201p.pdf
//
// Section 508 FPC abbreviations:
//   WV    = Without Vision
//   LV    = Limited Vision
//   WPC   = Without Perception of Color
//   WH    = Without Hearing
//   LH    = Limited Hearing
//   WS    = Without Speech
//   LM    = Limited Manipulation
//   LRS   = Limited Reach and Strength
//   LLCLA = Limited Language, Cognitive, and Learning Abilities

export const FPC_LABELS = {
  WV: 'Without Vision',
  LV: 'Limited Vision',
  WPC: 'Without Perception of Color',
  WH: 'Without Hearing',
  LH: 'Limited Hearing',
  WS: 'Without Speech',
  LM: 'Limited Manipulation',
  LRS: 'Limited Reach and Strength',
  LLCLA: 'Limited Language, Cognitive, and Learning Abilities'
};

// Short human-readable descriptions of each FPC disability category, used in
// accessible tooltips to explain what each icon represents.
export const FPC_DESCRIPTIONS = {
  WV:    'People who are blind or have no functional vision',
  LV:    'People with low vision who need magnification or high contrast',
  WPC:   'People who cannot distinguish certain colors (color blindness)',
  WH:    'People who are deaf and cannot hear audio content',
  LH:    'People with hearing loss who may struggle with audio without accommodations',
  WS:    'People who cannot use speech or voice-based input effectively',
  LM:    'People with limited hand, finger, or fine motor dexterity',
  LRS:   'People with limited reach, strength, or stamina',
  LLCLA: 'People with cognitive, learning, or language differences',
};

// Inline SVG icons representing each FPC disability category.
// Icons use a consistent 24x24 viewBox, stroke-based style.
// Each SVG carries role="img", aria-label, and an inner <title> for full accessibility.
// Icon styles:
//   WV  (Without Vision)                - eye with diagonal slash (no vision at all)
//   LV  (Limited Vision)                - magnifying glass (needs zoom to see)
//   WPC (Without Perception of Color)   - three overlapping circles with slash (color blindness)
//   WH  (Without Hearing)               - headphones with diagonal slash (deaf)
//   LH  (Limited Hearing)               - headphones without slash (hard of hearing)
//   WS  (Without Speech)                - microphone with diagonal slash (speech impairment)
//   LM  (Limited Manipulation)          - mouse pointer cursor (motor difficulty)
//   LRS (Limited Reach and Strength)    - person figure with limited arm reach
//   LLCLA (Limited Language/Cognitive)  - brain outline (cognitive/learning disability)
export const FPC_SVGS = {
  WV: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="disability-icon" role="img" aria-label="Without Vision"><title>Without Vision</title><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
  LV: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="disability-icon" role="img" aria-label="Limited Vision"><title>Limited Vision</title><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`,
  WPC: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="disability-icon" role="img" aria-label="Without Perception of Color"><title>Without Perception of Color</title><circle cx="8" cy="10" r="3"/><circle cx="16" cy="10" r="3"/><circle cx="12" cy="17" r="3"/><line x1="3" y1="3" x2="21" y2="21"/></svg>`,
  WH: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="disability-icon" role="img" aria-label="Without Hearing"><title>Without Hearing</title><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`,
  LH: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="disability-icon" role="img" aria-label="Limited Hearing"><title>Limited Hearing</title><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>`,
  WS: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="disability-icon" role="img" aria-label="Without Speech"><title>Without Speech</title><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
  LM: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="disability-icon" role="img" aria-label="Limited Manipulation"><title>Limited Manipulation</title><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>`,
  LRS: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="disability-icon" role="img" aria-label="Limited Reach and Strength"><title>Limited Reach and Strength</title><circle cx="12" cy="4.5" r="2"/><path d="M9 8h6l-1 5H9z"/><path d="M7.5 10.5c-2 1-3.5 3-3.5 5.5a5.5 5.5 0 0 0 11 0"/><path d="M14 13l2 7"/></svg>`,
  LLCLA: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="disability-icon" role="img" aria-label="Limited Language, Cognitive, and Learning Abilities"><title>Limited Language, Cognitive, and Learning Abilities</title><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-2.14"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.44-2.14"/></svg>`
};

// Map from axe rule ID to an array of Section 508 FPC codes that the rule impacts.
export const AXE_TO_FPC = new Map([
  ['area-alt', ['WV', 'WH', 'LM']],
  ['aria-allowed-attr', ['WV', 'WH', 'LM']],
  ['aria-allowed-role', ['WV', 'WH', 'LM']],
  ['aria-command-name', ['WV', 'WH', 'LM']],
  ['aria-hidden-body', ['WV']],
  ['aria-hidden-focus', ['WV', 'LV', 'WH', 'LM']],
  ['aria-input-field-name', ['WV', 'WH', 'LM']],
  ['aria-required-attr', ['WV', 'WH', 'LM']],
  ['aria-required-children', ['WV', 'WH', 'LM']],
  ['aria-required-parent', ['WV', 'WH', 'LM']],
  ['aria-roledescription', ['WV', 'WH', 'LM']],
  ['aria-roles', ['WV', 'WH', 'LM']],
  ['aria-toggle-field-name', ['WV', 'WH', 'LM']],
  ['aria-valid-attr', ['WV', 'WH', 'LM']],
  ['aria-valid-attr-value', ['WV', 'WH', 'LM']],
  ['autocomplete-valid', ['WV', 'LV', 'WH', 'LM', 'LLCLA']],
  ['avoid-inline-spacing', ['WV', 'LV', 'WH', 'LM', 'LLCLA']],
  ['blink', ['LV', 'LM', 'LLCLA']],
  ['button-name', ['WV', 'WH']],
  ['bypass', ['WV', 'WH']],
  ['color-contrast', ['LV', 'WPC']],
  ['css-orientation-lock', ['LV', 'LM', 'LLCLA']],
  ['definition-list', ['WV', 'WH']],
  ['dlitem', ['WV', 'WH', 'LM']],
  ['document-title', ['WV', 'WH', 'LM']],
  ['duplicate-id', ['WV', 'WH']],
  ['duplicate-id-active', ['WV', 'WH']],
  ['duplicate-id-aria', ['WV', 'WH']],
  ['empty-heading', ['WV', 'WH', 'LM']],
  ['focus-order-semantics', ['WV', 'WH', 'LM']],
  ['form-field-multiple-labels', ['WV', 'LV', 'WH', 'LM']],
  ['frame-tested', ['WV', 'WH']],
  ['frame-title', ['WV', 'WH', 'LM']],
  ['frame-title-unique', ['WV', 'WH', 'LM']],
  ['heading-order', ['WV', 'WH', 'LM']],
  ['hidden-content', ['WV', 'WPC']],
  ['html-has-lang', ['WV', 'WH', 'LLCLA']],
  ['html-lang-valid', ['WV', 'WH', 'LLCLA']],
  ['html-xml-lang-mismatch', ['WV', 'WH', 'LLCLA']],
  ['identical-links-same-purpose', ['WV', 'WH']],
  ['image-alt', ['WV', 'WH']],
  ['image-redundant-alt', ['WV', 'WH']],
  ['input-button-name', ['WV', 'WH']],
  ['input-image-alt', ['WV', 'WH', 'LM']],
  ['label', ['WV', 'LV', 'WH', 'LM']],
  ['label-content-name-mismatch', ['WV', 'LV', 'WH', 'LM']],
  ['label-title-only', ['WV', 'WH', 'LM']],
  ['landmark-banner-is-top-level', ['WV', 'WH']],
  ['landmark-complementary-is-top-level', ['WV', 'WH', 'LM']],
  ['landmark-contentinfo-is-top-level', ['WV', 'WH']],
  ['landmark-main-is-top-level', ['WV', 'WH', 'LM']],
  ['landmark-no-duplicate-banner', ['WV', 'WH']],
  ['landmark-no-duplicate-contentinfo', ['WV', 'WH']],
  ['landmark-no-duplicate-main', ['WV', 'WH', 'LM']],
  ['landmark-one-main', ['WV', 'WH', 'LM']],
  ['landmark-unique', ['WV', 'WH']],
  ['link-in-text-block', ['LV', 'WPC']],
  ['link-name', ['WV', 'WH', 'LM']],
  ['list', ['WV', 'WH']],
  ['listitem', ['WV', 'WH', 'LM']],
  ['marquee', ['LV', 'LM', 'LLCLA']],
  ['meta-refresh', ['WV', 'WH', 'LM']],
  ['meta-viewport', ['LV']],
  ['meta-viewport-large', ['LV']],
  ['no-autoplay-audio', ['WV', 'WH', 'LLCLA']],
  ['object-alt', ['WV', 'WH']],
  ['p-as-heading', ['WV', 'WH', 'LM']],
  ['page-has-heading-one', ['WV', 'LV', 'WH']],
  ['region', ['WV', 'WH', 'LM']],
  ['role-img-alt', ['WV', 'WH']],
  ['scope-attr-valid', ['WV', 'WH', 'LM']],
  ['scrollable-region-focusable', ['WV', 'WH', 'LM']],
  ['server-side-image-map', ['WV', 'WH', 'LM']],
  ['skip-link', ['WV', 'WH', 'LM']],
  ['svg-img-alt', ['WV', 'WH', 'LM']],
  ['table-duplicate-name', ['WV', 'WH']],
  ['table-fake-caption', ['WV', 'WH']],
  ['tabindex', ['WV', 'WH', 'LM']],
  ['target-size', ['LM', 'LRS']],
  ['td-has-header', ['WV', 'WH']],
  ['td-headers-attr', ['WV', 'WH']],
  ['th-has-data-cells', ['WV', 'WH']],
  ['valid-lang', ['WV', 'WH', 'LLCLA']]
]);
