import { KANNADA_CATALOG, translateText, formatMinSalaryThreshold, formatSalaryDisplay } from '../services/i18n';
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

console.log(`\nTEST SUMMARY: ${passed} passed, ${failed} failed.`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL I18N VERIFICATION CHECKS PASSED SUCCESSFULLY!');
}
