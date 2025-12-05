import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRequiredDirectories,
  hasDynamicSegments,
  extractVariables,
  convertDynamicPathToPlaceholder,
  buildRequiredDirectoriesFromConfig
} from '../dist/constants/requiredDirectories.js';

test('buildRequiredDirectories returns default structure', () => {
  const directories = buildRequiredDirectories('docs');
  assert.ok(directories.length > 0);
  assert.ok(directories.some(dir => dir.includes('docs')));
});

test('hasDynamicSegments detects {FEATURE} pattern', () => {
  assert.equal(hasDynamicSegments('product/features/{FEATURE}'), true);
  assert.equal(hasDynamicSegments('product/features/{FEATURE}/PRD-{FEATURE}.md'), true);
  assert.equal(hasDynamicSegments('product/features'), false);
  assert.equal(hasDynamicSegments(''), false);
});

test('hasDynamicSegments detects various variable patterns', () => {
  assert.equal(hasDynamicSegments('{VAR}'), true);
  assert.equal(hasDynamicSegments('{VAR_NAME}'), true);
  assert.equal(hasDynamicSegments('{VAR-NAME}'), true);
  assert.equal(hasDynamicSegments('{VAR123}'), true);
  assert.equal(hasDynamicSegments('{123VAR}'), true);
  assert.equal(hasDynamicSegments('{var}'), false); // lowercase not matched
  assert.equal(hasDynamicSegments('{Var}'), false); // mixed case not matched
});

test('extractVariables extracts variable names from path', () => {
  const vars1 = extractVariables('product/features/{FEATURE}/PRD-{FEATURE}.md');
  assert.deepEqual(vars1, ['FEATURE']);

  const vars2 = extractVariables('{CATEGORY}/{FEATURE}/{SUB}');
  assert.deepEqual(vars2, ['CATEGORY', 'FEATURE', 'SUB']);

  const vars3 = extractVariables('static/path');
  assert.deepEqual(vars3, []);
});

test('extractVariables removes duplicates', () => {
  const vars = extractVariables('{FEATURE}/{FEATURE}/{FEATURE}');
  assert.deepEqual(vars, ['FEATURE']);
});

test('convertDynamicPathToPlaceholder uses default prefix/suffix', () => {
  const result = convertDynamicPathToPlaceholder('product/features/{FEATURE}');
  assert.equal(result, 'product/features/__FEATURE__');
});

test('convertDynamicPathToPlaceholder handles multiple variables', () => {
  const result = convertDynamicPathToPlaceholder('{CATEGORY}/{FEATURE}/{SUB}');
  assert.equal(result, '__CATEGORY__/__FEATURE__/__SUB__');
});

test('convertDynamicPathToPlaceholder respects custom prefix/suffix', () => {
  const result = convertDynamicPathToPlaceholder('product/{FEATURE}', {
    placeholderPrefix: '[',
    placeholderSuffix: ']'
  });
  assert.equal(result, 'product/[FEATURE]');
});

test('convertDynamicPathToPlaceholder handles path without variables', () => {
  const result = convertDynamicPathToPlaceholder('product/features');
  assert.equal(result, 'product/features');
});

test('buildRequiredDirectoriesFromConfig creates directories from structure', () => {
  const structure = {
    'product': [],
    'product/features': [],
    'architecture': []
  };
  const directories = buildRequiredDirectoriesFromConfig('docs', structure);
  
  assert.ok(directories.includes('docs'));
  assert.ok(directories.some(d => d.endsWith('docs/product')));
  assert.ok(directories.some(d => d.endsWith('docs/product/features')));
  assert.ok(directories.some(d => d.endsWith('docs/architecture')));
});

test('buildRequiredDirectoriesFromConfig converts dynamic paths to placeholders by default', () => {
  const structure = {
    'product': [],
    'product/features/{FEATURE}': []
  };
  const directories = buildRequiredDirectoriesFromConfig('docs', structure);
  
  assert.ok(directories.some(d => d.includes('__FEATURE__')));
  assert.ok(!directories.some(d => d.includes('{FEATURE}')));
});

test('buildRequiredDirectoriesFromConfig skips dynamic paths when createPlaceholders is false', () => {
  const structure = {
    'product': [],
    'product/features/{FEATURE}': []
  };
  const directories = buildRequiredDirectoriesFromConfig('docs', structure, {
    createPlaceholders: false
  });
  
  assert.ok(directories.some(d => d.endsWith('docs/product')));
  assert.ok(!directories.some(d => d.includes('FEATURE')));
});

test('buildRequiredDirectoriesFromConfig respects custom placeholder format', () => {
  const structure = {
    'product/features/{FEATURE}': []
  };
  const directories = buildRequiredDirectoriesFromConfig('docs', structure, {
    createPlaceholders: true,
    placeholderPrefix: '_',
    placeholderSuffix: '_'
  });
  
  assert.ok(directories.some(d => d.includes('_FEATURE_')));
  assert.ok(!directories.some(d => d.includes('__FEATURE__')));
});

test('buildRequiredDirectoriesFromConfig always includes docsRoot', () => {
  const structure = {
    'product': []
  };
  const directories = buildRequiredDirectoriesFromConfig('custom-docs', structure);
  
  assert.ok(directories.includes('custom-docs'));
});

test('buildRequiredDirectoriesFromConfig sorts directories', () => {
  const structure = {
    'zebra': [],
    'alpha': [],
    'middle': []
  };
  const directories = buildRequiredDirectoriesFromConfig('docs', structure);
  
  // Verify sorted order
  const sorted = [...directories].sort();
  assert.deepEqual(directories, sorted);
});

