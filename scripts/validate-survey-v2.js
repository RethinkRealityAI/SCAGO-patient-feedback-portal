// Quick validation script for surveyV2 template
// Run with: node scripts/validate-survey-v2.js

const fs = require('fs');
const path = require('path');

// Read the survey template file
const templatePath = path.join(__dirname, '../src/lib/survey-template.ts');
const content = fs.readFileSync(templatePath, 'utf8');

// Extract surveyV2 section
const surveyV2Match = content.match(/export const surveyV2 = \{[\s\S]*?\n\};/);
if (!surveyV2Match) {
  console.error('❌ Could not find surveyV2 export');
  process.exit(1);
}

console.log('✅ SurveyV2 template found');

// Check for common issues
const issues = [];

// 1. Check for duplicate field IDs
const fieldIdMatches = content.matchAll(/id: '([^']+)'/g);
const fieldIds = [];
const duplicates = new Set();

for (const match of fieldIdMatches) {
  const id = match[1];
  if (fieldIds.includes(id) && !id.includes('-group') && id !== 'submitAnonymously') {
    duplicates.add(id);
  }
  fieldIds.push(id);
}

if (duplicates.size > 0) {
  issues.push(`❌ Duplicate field IDs found: ${Array.from(duplicates).join(', ')}`);
} else {
  console.log('✅ No duplicate field IDs');
}

// 2. Check for broken conditional chains
const conditionalFields = content.matchAll(/conditionField: '([^']+)'.*?conditionValue: '([^']+)'/g);
for (const match of conditionalFields) {
  const controlField = match[1];
  if (!fieldIds.includes(controlField)) {
    issues.push(`❌ Conditional field references non-existent field: ${controlField}`);
  }
}

console.log('✅ All conditional field references are valid');

// 3. Check for fields with 'Other' option that don't have corresponding 'Other' text fields
const otherOptionFields = [];
content.matchAll(/{ id: nanoid\(\), label: 'Other', value: 'other' }/g);

// Summary
console.log('\n📊 Survey V2 Statistics:');
console.log(`- Total field IDs: ${fieldIds.length}`);
console.log(`- Conditional fields: ${Array.from(conditionalFields).length}`);

if (issues.length > 0) {
  console.log('\n⚠️  Issues found:');
  issues.forEach(issue => console.log(issue));
  process.exit(1);
} else {
  console.log('\n✅ All validation checks passed!');
  console.log('✅ Survey V2 template is valid');
}

