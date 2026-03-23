import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDotgovCsv, lookupDomain, hostnameFromUrl } from '../../src/data/dotgov-lookup.js';

const SAMPLE_CSV = `Domain name,Domain type,Organization name,Suborganization name,City,State,Security contact email
cfpb.gov,Federal - Executive,Consumer Financial Protection Bureau,,Washington,DC,security@cfpb.gov
ssa.gov,Federal - Executive,Social Security Administration,,Baltimore,MD,secops@ssa.gov
medicare.gov,Federal - Executive,Centers for Medicare and Medicaid Services,,Baltimore,MD,security@cms.hhs.gov
federalreserve.gov,Federal - Executive,Board of Governors of the Federal Reserve,Federal Reserve Bank,Washington,DC,charles.b.young@frb.gov
"quoted,domain.gov",Federal - Executive,"Organization, With Comma",,City,DC,test@example.gov
`;

test('parseDotgovCsv builds a map from CSV text', () => {
  const map = parseDotgovCsv(SAMPLE_CSV);
  assert.equal(map.size, 5);
  assert.deepEqual(map.get('cfpb.gov'), {
    organization_name: 'Consumer Financial Protection Bureau',
    domain_type: 'Federal - Executive'
  });
  assert.deepEqual(map.get('ssa.gov'), {
    organization_name: 'Social Security Administration',
    domain_type: 'Federal - Executive'
  });
});

test('parseDotgovCsv handles quoted fields with commas', () => {
  const map = parseDotgovCsv(SAMPLE_CSV);
  assert.deepEqual(map.get('quoted,domain.gov'), {
    organization_name: 'Organization, With Comma',
    domain_type: 'Federal - Executive'
  });
});

test('parseDotgovCsv uses lower-case domain keys', () => {
  const csv = `Domain name,Domain type,Organization name\nSSA.GOV,Federal - Executive,Social Security Administration\n`;
  const map = parseDotgovCsv(csv);
  assert.ok(map.has('ssa.gov'), 'Domain key should be lower-cased');
});

test('parseDotgovCsv skips blank lines', () => {
  const csv = `Domain name,Domain type,Organization name\ncfpb.gov,Federal - Executive,CFPB\n\n\nssa.gov,Federal - Executive,SSA\n`;
  const map = parseDotgovCsv(csv);
  assert.equal(map.size, 2);
});

test('lookupDomain returns org info for exact hostname match', () => {
  const map = parseDotgovCsv(SAMPLE_CSV);
  const result = lookupDomain('cfpb.gov', map);
  assert.ok(result, 'Should return a result');
  assert.equal(result.organization_name, 'Consumer Financial Protection Bureau');
});

test('lookupDomain strips www. prefix via apex fallback', () => {
  const map = parseDotgovCsv(SAMPLE_CSV);
  const result = lookupDomain('www.cfpb.gov', map);
  assert.ok(result, 'Should resolve www prefix to apex domain');
  assert.equal(result.organization_name, 'Consumer Financial Protection Bureau');
});

test('lookupDomain resolves subdomain to apex domain', () => {
  const map = parseDotgovCsv(SAMPLE_CSV);
  const result = lookupDomain('data.medicare.gov', map);
  assert.ok(result, 'Should resolve subdomain to apex');
  assert.equal(result.organization_name, 'Centers for Medicare and Medicaid Services');
});

test('lookupDomain returns null for unknown domain', () => {
  const map = parseDotgovCsv(SAMPLE_CSV);
  assert.equal(lookupDomain('unknown.example.com', map), null);
});

test('lookupDomain returns null for null/empty inputs', () => {
  const map = parseDotgovCsv(SAMPLE_CSV);
  assert.equal(lookupDomain(null, map), null);
  assert.equal(lookupDomain('', map), null);
  assert.equal(lookupDomain('cfpb.gov', null), null);
  assert.equal(lookupDomain('cfpb.gov', undefined), null);
});

test('hostnameFromUrl extracts hostname from a full URL', () => {
  assert.equal(hostnameFromUrl('https://www.cfpb.gov/consumer-tools/'), 'www.cfpb.gov');
  assert.equal(hostnameFromUrl('https://ssa.gov/'), 'ssa.gov');
});

test('hostnameFromUrl returns null for invalid URLs', () => {
  assert.equal(hostnameFromUrl('not-a-url'), null);
  assert.equal(hostnameFromUrl(''), null);
  assert.equal(hostnameFromUrl(null), null);
});
