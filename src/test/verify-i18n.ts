// Run with: npx tsx src/test/verify-i18n.ts
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  KANNADA_CATALOG, ENGLISH_CATALOG, translateText, formatMinSalaryThreshold, formatSalaryDisplay,
  isIdentifierKey, humaniseKey
} from '../services/i18n';
import { getBotWelcome, getSupportResponse } from '../services/aiSupport';

console.log('--- STARTING VERIFICATION TEST SUITE ---');

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`[PASS] ${msg}`);
    passed++;
  } else {
    console.error(`[FAIL] ${msg}`);
    failed++;
  }
}

// 1. Check Catalog Completeness
const knKeys = Object.keys(KANNADA_CATALOG);
assert(knKeys.length >= 200, `Kannada catalog has extensive entries (count: ${knKeys.length})`);

// 2. Test Parameter Interpolation & Dynamic Rules
const testInterpolate = translateText('Download applications from last {range}', 'kn', { range: '7 ದಿನಗಳು' });
assert(testInterpolate.includes('7 ದಿನಗಳು') && testInterpolate.includes('ಡೌನ್‌ಲೋಡ್'), `Interpolation works properly: "${testInterpolate}"`);

// 3. Test Bot Welcome Messages
const knWelcome = getBotWelcome('kn');
const enWelcome = getBotWelcome('en');
assert(knWelcome.text.includes('ಬೆಂಬಲ ಸಹಾಯಕ'), 'Kannada welcome includes authentic support assistant greeting');
assert(enWelcome.text.includes('Support Assistant'), 'English welcome includes support assistant greeting');
assert((knWelcome.options?.length || 0) >= 4, `Kannada quick suggestions available: ${knWelcome.options?.length}`);
assert(Boolean(knWelcome.options?.[0].includes('ಉದ್ಯೋಗ')), `Quick prompt in Kannada: "${knWelcome.options?.[0]}"`);

// 4. Test Bot Responses in Kannada
const knRespJob = getSupportResponse('ನಾನು ಭಾರಿ ವಾಹನ ಚಾಲಕ ಉದ್ಯೋಗಕ್ಕೆ ಹೇಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಬೇಕು?', 'kn');
assert(knRespJob.text.includes('ಉದ್ಯೋಗ') || knRespJob.text.includes('ಅರ್ಹತೆ'), `Bot responds in authentic Kannada for job query: "${knRespJob.text.slice(0, 50)}..."`);

const knRespDocs = getSupportResponse('ದಾಖಲೆಗಳು ಏನು ಬೇಕು?', 'kn');
assert(knRespDocs.text.includes('ದಾಖಲೆಗಳು') || knRespDocs.text.includes('ಪರವಾನಗಿ'), `Bot responds in authentic Kannada for documents query`);

const knRespFallback = getSupportResponse('random unknown question xyz 123', 'kn');
assert(knRespFallback.text.includes('ಸಂಪರ್ಕ') || knRespFallback.text.includes('ಬೆಂಬಲ'), `Bot returns helpful Kannada fallback`);

// 5. Test Bot Responses in English
const enRespJob = getSupportResponse('How do I apply for truck jobs?', 'en');
assert(enRespJob.text.includes('Heavy Motor Vehicle') || enRespJob.text.includes('Truck'), 'Bot responds in English when in English mode');

// 6. Test Salary Filter Threshold Representation
assert(formatMinSalaryThreshold(0, 'en') === 'Any', 'Salary 0 in English is "Any"');
assert(formatMinSalaryThreshold(0, 'kn') === 'ಯಾವುದಾದರೂ', 'Salary 0 in Kannada is "ಯಾವುದಾದರೂ"');
assert(formatMinSalaryThreshold(14000, 'en') === '₹14,000+/mo', 'Salary 14000 in English is "₹14,000+/mo"');
assert(formatMinSalaryThreshold(14000, 'kn') === '₹14,000+/ತಿಂಗಳು', 'Salary 14000 in Kannada is "₹14,000+/ತಿಂಗಳು"');

// 7. Test Salary Display Range Format
assert(formatSalaryDisplay(15000, 25000, 'en') === '₹15,000 - ₹25,000 / mo', 'Salary range English format');
assert(formatSalaryDisplay(15000, 25000, 'kn') === '₹15,000 - ₹25,000 / ತಿಂಗಳು', 'Salary range Kannada format');

// 8. Identifier keys resolve to English and Kannada, never to the raw key
assert(translateText('superadminPortal', 'en') === 'Superadmin Portal', 'Identifier key resolves to English via ENGLISH_CATALOG');
assert(translateText('superadminPortal', 'kn') === KANNADA_CATALOG['Superadmin Portal'], 'Identifier key resolves to Kannada through its English text');
assert(translateText('validForDays', 'en', { days: 30 }) === 'Valid for 30 days', 'Identifier key interpolates params in English');
assert(translateText('validForDays', 'kn', { days: 30 }).includes('30 ದಿನಗಳ'), 'Identifier key interpolates params in Kannada');
assert(humaniseKey('approveAndPublish') === 'Approve and publish', `Unknown camelCase keys are humanised: "${humaniseKey('approveAndPublish')}"`);
assert(translateText('someFutureKeyName', 'en') === 'Some future key name', 'Unknown identifier key never shows raw in English');
assert(translateText('someFutureKeyName', 'kn') === 'Some future key name', 'Unknown identifier key falls back to English in Kannada');
assert(translateText('Filters ({count})', 'kn', { count: 3 }) === 'ಫಿಲ್ಟರ್‌ಗಳು (3)', 'Placeholder keys translate in Kannada');
assert(translateText('Closed', 'kn') !== translateText('Expired', 'kn'), 'Closed and Expired read differently in Kannada');

// 9. Every Kannada entry keeps the placeholders of its key
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
// Identifier keys carry no placeholders themselves; compare their English text.
const placeholderMismatches = Object.entries(KANNADA_CATALOG)
  .filter(([key, value]) => placeholders(isIdentifierKey(key) ? ENGLISH_CATALOG[key] ?? key : key) !== placeholders(value));
assert(placeholderMismatches.length === 0, `Kannada entries keep their {placeholders}${placeholderMismatches.length ? `: ${placeholderMismatches.map(([k]) => k).join(' | ')}` : ''}`);
const enPlaceholderMismatches = Object.entries(ENGLISH_CATALOG).filter(([key, value]) => {
  const kn = KANNADA_CATALOG[key] ?? KANNADA_CATALOG[value];
  return kn !== undefined && placeholders(kn) !== placeholders(value);
});
assert(enPlaceholderMismatches.length === 0, `English and Kannada texts of identifier keys share placeholders${enPlaceholderMismatches.length ? `: ${enPlaceholderMismatches.map(([k]) => k).join(', ')}` : ''}`);

// 10. Every t('…') literal in src resolves to proper English
const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceFiles: string[] = [];
const walk = (dir: string) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx?|jsx?)$/.test(entry.name) && path.relative(srcDir, full).split(path.sep)[0] !== 'test') sourceFiles.push(full);
  }
};
walk(srcDir);

// t('key'), t("key") and t(`key`) without ${…}; the call may span lines.
const T_CALL = /(?<![\w$.])t\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
const usedKeys = new Map<string, Set<string>>();
for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(T_CALL)) {
    if (match[1] === '`' && match[2].includes('${')) continue;
    const key = match[2].replace(/\\(['"`\\])/g, '$1');
    if (!usedKeys.has(key)) usedKeys.set(key, new Set());
    usedKeys.get(key)!.add(path.relative(srcDir, file).replace(/\\/g, '/'));
  }
}
assert(usedKeys.size > 300, `Found ${usedKeys.size} distinct t('…') keys in ${sourceFiles.length} source files`);

const where = (key: string) => [...(usedKeys.get(key) || [])].join(', ');
const identifierKeys = [...usedKeys.keys()].filter(key => isIdentifierKey(key.trim()));
const missingEnglish = identifierKeys.filter(key => !Object.prototype.hasOwnProperty.call(ENGLISH_CATALOG, key.trim()));
assert(missingEnglish.length === 0, `All ${identifierKeys.length} identifier keys have an ENGLISH_CATALOG entry`);
for (const key of missingEnglish) console.error(`       missing EN: "${key}" (${where(key)})`);

// Single lowercase words ("pending", "loading") are identifiers too unless a catalog knows them.
const bareWords = [...usedKeys.keys()].filter(key => /^[a-z]+$/.test(key.trim())
  && !Object.prototype.hasOwnProperty.call(ENGLISH_CATALOG, key.trim())
  && !Object.prototype.hasOwnProperty.call(KANNADA_CATALOG, key.trim()));
assert(bareWords.length === 0, 'All single-word lowercase keys have a catalog entry');
for (const key of bareWords) console.error(`       missing EN: "${key}" (${where(key)})`);

const rawInEnglish = [...usedKeys.keys()].filter(key => isIdentifierKey(translateText(key, 'en').trim()));
assert(rawInEnglish.length === 0, 'No t() key renders as a raw identifier in English');
for (const key of rawInEnglish) console.error(`       raw in EN: "${key}" (${where(key)})`);

const rawInKannada = [...usedKeys.keys()].filter(key => isIdentifierKey(translateText(key, 'kn').trim()));
assert(rawInKannada.length === 0, 'No t() key renders as a raw identifier in Kannada');
for (const key of rawInKannada) console.error(`       raw in KN: "${key}" (${where(key)})`);

// Informational: keys that fall back to English in Kannada mode.
const englishFallbacks = [...usedKeys.keys()].filter(key => {
  const text = translateText(key, 'kn');
  return text === translateText(key, 'en') && /[A-Za-z]{3,}/.test(text);
});
console.log(`[INFO] ${englishFallbacks.length} of ${usedKeys.size} keys show English in Kannada mode (no Kannada entry yet).`);
if (process.env.I18N_VERBOSE) for (const key of englishFallbacks) console.log(`       EN fallback: "${key}" (${where(key)})`);

console.log(`\nTEST SUMMARY: ${passed} passed, ${failed} failed.`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL I18N VERIFICATION CHECKS PASSED SUCCESSFULLY!');
}
