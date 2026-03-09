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
