# Cursor Rules: YEP Import System

## Overview
This document defines cursor rules for maintaining, updating, and extending the YEP Data Import System. These rules ensure consistency, maintainability, and proper integration with the existing YEP system.

## Core Principles

### 1. **Maintain System Integration**
- Always use existing YEP CRUD functions (`upsertParticipantByEmail`, `createMentor`, etc.)
- Never bypass existing validation schemas
- Preserve security features (SIN hashing, authentication)
- Follow existing error handling patterns

### 2. **Preserve Data Integrity**
- All imports must go through existing validation
- Use proper type conversion and sanitization
- Maintain audit trails and logging
- Handle edge cases gracefully

### 3. **User Experience Consistency**
- Follow existing UI patterns from export system
- Maintain 5-step wizard process
- Use consistent error messaging
- Provide clear progress indicators

## File-Specific Rules

### **`src/lib/import-utils.ts`**

#### **Schema Management**
```typescript
// ✅ CORRECT: Always update TABLE_SCHEMAS when adding new fields
export const TABLE_SCHEMAS = {
  participants: {
    required: ['youthParticipant', 'email', 'region', 'dob', 'canadianStatus'],
    optional: [
      'etransferEmailAddress', 'mailingAddress', 'phoneNumber', 'approved', 
      'contractSigned', 'signedSyllabus', 'availability', 'assignedMentor', 
      'idProvided', 'canadianStatusOther', 'sin', 'sinLast4', 'sinHash',
      'youthProposal', 'proofOfAffiliationWithSCD', 'scagoCounterpart',
      'age', 'citizenshipStatus', 'location', 'projectCategory', 'duties',
      'affiliationWithSCD', 'notes', 'nextSteps', 'interviewed', 
      'interviewNotes', 'recruited', 'fileUrl', 'fileName', 'fileType'
    ],
    types: {
      // Always include type definitions for validation
      youthParticipant: 'string',
      email: 'email',
      // ... other types
    }
  }
};
```

#### **Validation Rules**
```typescript
// ✅ CORRECT: Always validate against schema
export function validateData(data: any[], table: keyof typeof TABLE_SCHEMAS): ImportError[] {
  const schema = TABLE_SCHEMAS[table];
  // Validation logic here
}

// ❌ WRONG: Don't skip validation
export function validateData(data: any[], table: string): ImportError[] {
  // Missing schema validation
}
```

#### **Type Conversion**
```typescript
// ✅ CORRECT: Always provide default values for required fields
export function convertDataTypes(data: any[], table: keyof typeof TABLE_SCHEMAS): any[] {
  return data.map(row => {
    const converted: any = {};
    
    // Convert types
    Object.entries(row).forEach(([key, value]) => {
      const type = schema.types[key as keyof typeof schema.types];
      // Type conversion logic
    });
    
    // ✅ CRITICAL: Add default values for participants
    if (table === 'participants') {
      converted.approved = converted.approved ?? false;
      converted.contractSigned = converted.contractSigned ?? false;
      // ... other defaults
    }
    
    return converted;
  });
}
```

### **`src/app/youth-empowerment/import-actions.ts`**

#### **Server Action Patterns**
```typescript
// ✅ CORRECT: Always use existing CRUD functions
export async function importParticipants(data: any[], options: ImportOptions, mapping: ImportMapping) {
  // Use upsertParticipantByEmail for proper validation and security
  const upsertResult = await upsertParticipantByEmail(participantData);
  
  if (upsertResult.success) {
    if (upsertResult.action === 'created') {
      result.imported++;
    } else if (upsertResult.action === 'updated') {
      result.updated++;
    }
  }
}

// ❌ WRONG: Don't bypass existing functions
export async function importParticipants(data: any[], options: ImportOptions, mapping: ImportMapping) {
  // Direct Firestore operations - bypasses validation and security
  await addDoc(collection(db, 'yep_participants'), participantData);
}
```

#### **Error Handling**
```typescript
// ✅ CORRECT: Comprehensive error handling
try {
  const upsertResult = await upsertParticipantByEmail(participantData);
  
  if (upsertResult.success) {
    // Handle success
  } else {
    result.errors.push({
      row: convertedData.indexOf(participantData) + 1,
      message: `Failed to import participant: ${upsertResult.error}`,
      value: participantData
    });
  }
} catch (error) {
  result.errors.push({
    row: convertedData.indexOf(participantData) + 1,
    message: `Failed to import participant: ${error instanceof Error ? error.message : 'Unknown error'}`,
    value: participantData
  });
}
```

#### **Batch Processing**
```typescript
// ✅ CORRECT: Always use batch processing for performance
const batchSize = options.batchSize || 50;
const batches = [];

for (let i = 0; i < convertedData.length; i += batchSize) {
  batches.push(convertedData.slice(i, i + batchSize));
}

for (const batch of batches) {
  const batchPromises = batch.map(async (item) => {
    // Process each item
  });
  
  await Promise.all(batchPromises);
}
```

### **`src/components/youth-empowerment/import-dialog.tsx`**

#### **State Management**
```typescript
// ✅ CORRECT: Comprehensive state management
const [currentStep, setCurrentStep] = useState<'select' | 'upload' | 'mapping' | 'preview' | 'import'>('select');
const [importOptions, setImportOptions] = useState<ImportOptions>({
  targetTable: 'participants',
  format: 'csv',
  skipDuplicates: true,
  updateExisting: false,
  validateData: true,
  batchSize: 50
});
const [file, setFile] = useState<File | null>(null);
const [parsedData, setParsedData] = useState<any[]>([]);
const [mapping, setMapping] = useState<ImportMapping>({});
const [preview, setPreview] = useState<ImportPreview | null>(null);
const [importResult, setImportResult] = useState<ImportResult | null>(null);
```

#### **File Processing**
```typescript
// ✅ CORRECT: Robust file processing with error handling
const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  setFile(file);
  setImportOptions(prev => ({ 
    ...prev, 
    format: file.name.split('.').pop()?.toLowerCase() as any || 'csv' 
  }));

  try {
    const content = await file.text();
    setFileContent(content);

    // Parse file based on format
    let data: any[] = [];
    if (file.name.endsWith('.csv')) {
      const parsed = parseCSV(content);
      data = parsed.data;
    } else if (file.name.endsWith('.json')) {
      data = parseJSON(content);
    } else {
      throw new Error('Unsupported file format');
    }

    setParsedData(data);

    // Generate mapping suggestions
    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    const suggestions = generateMappingSuggestions(headers, importOptions.targetTable);
    setMapping(suggestions);

    // Generate preview
    const previewData = generateImportPreview(data, importOptions.targetTable, suggestions);
    setPreview(previewData);

    setCurrentStep('mapping');
  } catch (error) {
    toast({
      title: 'File Parse Error',
      description: `Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      variant: 'destructive',
    });
  }
};
```

#### **UI Consistency**
```typescript
// ✅ CORRECT: Follow existing UI patterns
const dataTypes = [
  { 
    id: 'participants', 
    label: 'Participants', 
    icon: Users, 
    description: 'Youth participants and their information',
    requiredFields: ['youthParticipant', 'email', 'region', 'dob', 'canadianStatus'] // Must match schema
  },
  // ... other types
];

// ✅ CORRECT: Comprehensive field mapping options
{['etransferEmailAddress', 'mailingAddress', 'phoneNumber', 'approved', 'contractSigned', 'signedSyllabus', 'availability', 'assignedMentor', 'idProvided', 'canadianStatusOther', 'sin', 'youthProposal', 'proofOfAffiliationWithSCD', 'scagoCounterpart', 'age', 'citizenshipStatus', 'location', 'projectCategory', 'duties', 'affiliationWithSCD', 'notes', 'nextSteps', 'interviewed', 'interviewNotes', 'recruited'].map(field => (
  <SelectItem key={field} value={field}>
    {field} (Optional)
  </SelectItem>
))}
```

## Update Patterns

### **Adding New Data Types**

#### **1. Update Import Utils**
```typescript
// Add to TABLE_SCHEMAS in import-utils.ts
export const TABLE_SCHEMAS = {
  // ... existing schemas
  newDataType: {
    required: ['field1', 'field2'],
    optional: ['field3', 'field4'],
    types: {
      field1: 'string',
      field2: 'email',
      // ... other types
    }
  }
};
```

#### **2. Update Import Actions**
```typescript
// Add new import function in import-actions.ts
export async function importNewDataType(
  data: any[],
  options: ImportOptions,
  mapping: ImportMapping
): Promise<ImportResult> {
  // Implementation following existing patterns
}

// Update main import function
export async function importData(data: any[], options: ImportOptions, mapping: ImportMapping) {
  switch (options.targetTable) {
    // ... existing cases
    case 'newDataType':
      return await importNewDataType(data, options, mapping);
  }
}
```

#### **3. Update Import Dialog**
```typescript
// Add to dataTypes array in import-dialog.tsx
const dataTypes = [
  // ... existing types
  { 
    id: 'newDataType', 
    label: 'New Data Type', 
    icon: NewIcon, 
    description: 'Description of new data type',
    requiredFields: ['field1', 'field2'] // Must match schema
  }
];
```

### **Adding New Fields to Existing Types**

#### **1. Update YEPParticipant Interface**
```typescript
// In src/lib/youth-empowerment.ts
export interface YEPParticipant {
  // ... existing fields
  newField?: string; // Add new optional field
}
```

#### **2. Update Import Schema**
```typescript
// In src/lib/import-utils.ts
export const TABLE_SCHEMAS = {
  participants: {
    required: ['youthParticipant', 'email', 'region', 'dob', 'canadianStatus'],
    optional: [
      // ... existing optional fields
      'newField' // Add new field
    ],
    types: {
      // ... existing types
      newField: 'string' // Add type definition
    }
  }
};
```

#### **3. Update Form Schema**
```typescript
// In src/app/youth-empowerment/actions.ts
const participantSchema = z.object({
  // ... existing fields
  newField: z.string().optional(), // Add to Zod schema
});
```

#### **4. Update Import Dialog**
```typescript
// In src/components/youth-empowerment/import-dialog.tsx
// Add to field mapping options
{['etransferEmailAddress', 'mailingAddress', 'phoneNumber', 'approved', 'contractSigned', 'signedSyllabus', 'availability', 'assignedMentor', 'idProvided', 'canadianStatusOther', 'sin', 'youthProposal', 'proofOfAffiliationWithSCD', 'scagoCounterpart', 'age', 'citizenshipStatus', 'location', 'projectCategory', 'duties', 'affiliationWithSCD', 'notes', 'nextSteps', 'interviewed', 'interviewNotes', 'recruited', 'newField'].map(field => (
  <SelectItem key={field} value={field}>
    {field} (Optional)
  </SelectItem>
))}
```

### **Updating Validation Rules**

#### **1. Update Type Definitions**
```typescript
// In src/lib/import-utils.ts
types: {
  // ... existing types
  newField: 'email', // Change type
  anotherField: 'enum:Option1,Option2,Option3' // Add enum validation
}
```

#### **2. Update Validation Logic**
```typescript
// In src/lib/import-utils.ts
export function validateData(data: any[], table: keyof typeof TABLE_SCHEMAS): ImportError[] {
  // ... existing validation
  
  // Add new validation rules
  if (type.startsWith('enum:')) {
    const allowedValues = type.split(':')[1].split(',');
    if (!allowedValues.includes(value)) {
      errors.push({
        row: index + 1,
        field,
        message: `Value must be one of: ${allowedValues.join(', ')}`,
        value
      });
    }
  }
}
```

### **Performance Optimizations**

#### **1. Batch Size Optimization**
```typescript
// In import-actions.ts
const batchSize = options.batchSize || 50; // Adjust based on system capacity

// For large datasets, consider smaller batches
if (convertedData.length > 1000) {
  batchSize = 25; // Smaller batches for large datasets
}
```

#### **2. Memory Management**
```typescript
// Process data in chunks to avoid memory issues
const CHUNK_SIZE = 1000;
for (let i = 0; i < data.length; i += CHUNK_SIZE) {
  const chunk = data.slice(i, i + CHUNK_SIZE);
  // Process chunk
}
```

## Testing Guidelines

### **Unit Tests**
```typescript
// Test validation functions
describe('validateData', () => {
  it('should validate required fields', () => {
    const data = [{ email: 'test@example.com' }]; // Missing required fields
    const errors = validateData(data, 'participants');
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('youthParticipant');
  });
});

// Test type conversion
describe('convertDataTypes', () => {
  it('should convert string to boolean', () => {
    const data = [{ approved: 'true' }];
    const converted = convertDataTypes(data, 'participants');
    expect(converted[0].approved).toBe(true);
  });
});
```

### **Integration Tests**
```typescript
// Test import process end-to-end
describe('Import Process', () => {
  it('should import participants successfully', async () => {
    const data = [
      {
        youthParticipant: 'John Doe',
        email: 'john@example.com',
        region: 'Ontario',
        dob: '1995-01-01',
        canadianStatus: 'Canadian Citizen'
      }
    ];
    
    const result = await importParticipants(data, options, mapping);
    expect(result.success).toBe(true);
    expect(result.imported).toBe(1);
  });
});
```

## Error Handling Patterns

### **Validation Errors**
```typescript
// ✅ CORRECT: Specific error messages
if (!value || value.toString().trim() === '') {
  errors.push({
    row: index + 1,
    field,
    message: `Required field '${field}' is missing or empty`,
    value: row[field]
  });
}
```

### **Import Errors**
```typescript
// ✅ CORRECT: Comprehensive error handling
try {
  const result = await upsertParticipantByEmail(participantData);
  
  if (result.success) {
    // Handle success
  } else {
    result.errors.push({
      row: convertedData.indexOf(participantData) + 1,
      message: `Failed to import participant: ${result.error}`,
      value: participantData
    });
  }
} catch (error) {
  result.errors.push({
    row: convertedData.indexOf(participantData) + 1,
    message: `Failed to import participant: ${error instanceof Error ? error.message : 'Unknown error'}`,
    value: participantData
  });
}
```

## Security Considerations

### **Data Sanitization**
```typescript
// ✅ CORRECT: Always sanitize input data
const sanitizedData = data.map(row => {
  const sanitized: any = {};
  Object.entries(row).forEach(([key, value]) => {
    // Sanitize string values
    if (typeof value === 'string') {
      sanitized[key] = value.trim().replace(/[<>]/g, '');
    } else {
      sanitized[key] = value;
    }
  });
  return sanitized;
});
```

### **Access Control**
```typescript
// ✅ CORRECT: Always check permissions
export async function importData(data: any[], options: ImportOptions, mapping: ImportMapping) {
  // Check if user has admin permissions
  if (!isAdmin) {
    return {
      success: false,
      message: 'Insufficient permissions',
      errors: [{ row: 0, message: 'Admin access required' }]
    };
  }
  
  // Continue with import
}
```

## Maintenance Checklist

### **Before Making Changes**
- [ ] Review existing YEP interfaces and schemas
- [ ] Check for breaking changes in dependencies
- [ ] Verify integration with existing CRUD functions
- [ ] Test with sample data

### **After Making Changes**
- [ ] Run linting and type checking
- [ ] Test import process with various file formats
- [ ] Verify error handling works correctly
- [ ] Check performance with large datasets
- [ ] Update documentation

### **Regular Maintenance**
- [ ] Review error logs for common issues
- [ ] Update field mappings based on user feedback
- [ ] Optimize batch sizes based on performance metrics
- [ ] Update validation rules as requirements change

---

*These cursor rules ensure the YEP Import System remains maintainable, secure, and consistent with the existing YEP system architecture.*
