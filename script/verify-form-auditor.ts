/**
 * Verification script for Form Auditor module
 * Tests basic functionality and outputs results
 */

import { createFormAuditor, HEMNET_REQUIRED_FIELDS, BOOLI_REQUIRED_FIELDS } from '../server/lib/form-auditor';

console.log('=== Form Auditor Verification ===\n');

const auditor = createFormAuditor();

// Test 1: Get current form fields
console.log('1. Current Form Fields:');
const currentFields = auditor.getCurrentFormFields();
console.log(`   Total fields: ${currentFields.length}`);
console.log(`   Sample fields: ${currentFields.slice(0, 5).join(', ')}\n`);

// Test 2: Audit Hemnet compliance
console.log('2. Hemnet Compliance:');
const hemnetReqs = auditor.auditHemnetCompliance();
const hemnetRequired = hemnetReqs.filter(r => r.required);
const hemnetRecommended = hemnetReqs.filter(r => r.recommended && !r.required);
console.log(`   Total requirements: ${hemnetReqs.length}`);
console.log(`   Required fields: ${hemnetRequired.length}`);
console.log(`   Recommended fields: ${hemnetRecommended.length}`);
console.log(`   Required: ${HEMNET_REQUIRED_FIELDS.join(', ')}\n`);

// Test 3: Audit Booli compliance
console.log('3. Booli Compliance:');
const booliReqs = auditor.auditBooliCompliance();
const booliRequired = booliReqs.filter(r => r.required);
const booliRecommended = booliReqs.filter(r => r.recommended && !r.required);
console.log(`   Total requirements: ${booliReqs.length}`);
console.log(`   Required fields: ${booliRequired.length}`);
console.log(`   Recommended fields: ${booliRecommended.length}`);
console.log(`   Required: ${BOOLI_REQUIRED_FIELDS.join(', ')}\n`);

// Test 4: Field mapping
console.log('4. Field Mapping Examples:');
const testMappings = ['totalRooms', 'balconyArea', 'fastighetsbeteckning', 'address'];
testMappings.forEach(field => {
  const mapped = auditor.mapFormFieldToPlatformField(field);
  console.log(`   ${field} -> ${mapped || '(no mapping)'}`);
});

console.log('\n✓ Form Auditor verification complete!');
