# Import System Cursor Rules

## Overview
These rules guide development and maintenance of the YEP Data Import System. Follow these patterns to ensure consistency, maintainability, and proper integration with the existing system.

## Core Architecture Rules

### 1. Import System Structure
```
src/
├── lib/
│   └── import-utils.ts          # Core import utilities and types
├── app/
│   └── youth-empowerment/
│       ├── import-actions.ts   # Server-side import processing
│       └── import-current-participants.ts  # Legacy importer
└── components/
    └── youth-empowerment/
        └── import-dialog.tsx   # Import UI component
```

### 2. File Organization Rules
- **Import utilities**: All parsing, validation, and mapping logic in `import-utils.ts`
- **Server actions**: All server-side processing in `import-actions.ts`
- **UI components**: All import-related UI in `import-dialog.tsx`
- **Types**: Import-related types in `import-utils.ts`

## Type Safety Rules

### 1. Import Types
```typescript
// Always use these core types
export interface ImportOptions {
  targetTable: 'participants' | 'mentors' | 'workshops' | 'attendance' | 'meetings';
  format: 'csv' | 'json' | 'xlsx';
  skipDuplicates: boolean;
  updateExisting: boolean;
  validateData: boolean;
  batchSize: number;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  skipped: number;
  errors: ImportError[];
  message: string;
}

export interface ImportMapping {
  [csvColumn: string]: string; // Maps CSV column names to database field names
}
```

### 2. Type Validation Rules
- **Never use `any`** for import data - use proper typing
- **Always validate** data against schemas before processing
- **Use discriminated unions** for different import types
- **Prefer interfaces** over types for import objects

### 3. Error Handling Types
```typescript
export interface ImportError {
  row: number;
  field?: string;
  message: string;
  value?: any;
}
```

## Data Processing Rules

### 1. Parsing Functions
```typescript
// CSV Parsing - Always handle edge cases
export function parseCSV(content: string): { headers: string[]; data: any[] } {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return { headers: [], data: [] };
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const data = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
  
  return { headers, data };
}
```

### 2. Validation Rules
```typescript
// Always validate against schema
export function validateData(data: any[], table: keyof typeof TABLE_SCHEMAS): ImportError[] {
  const schema = TABLE_SCHEMAS[table];
  const errors: ImportError[] = [];
  
  data.forEach((row, index) => {
    // Check required fields
    schema.required.forEach(field => {
      if (!row[field] || row[field].toString().trim() === '') {
        errors.push({
          row: index + 1,
          field,
          message: `Required field '${field}' is missing or empty`,
          value: row[field]
        });
      }
    });
    
    // Validate field types
    Object.entries(schema.types).forEach(([field, type]) => {
      const value = row[field];
      if (value === undefined || value === null || value === '') return;
      
      // Type-specific validation
      switch (type) {
        case 'email':
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors.push({
              row: index + 1,
              field,
              message: `Invalid email format`,
              value
            });
          }
          break;
        // ... other type validations
      }
    });
  });
  
  return errors;
}
```

### 3. Type Conversion Rules
```typescript
// Always convert types safely
export function convertDataTypes(data: any[], table: keyof typeof TABLE_SCHEMAS): any[] {
  const schema = TABLE_SCHEMAS[table];
  
  return data.map(row => {
    const converted: any = {};
    
    Object.entries(row).forEach(([key, value]) => {
      const type = schema.types[key as keyof typeof schema.types];
      
      if (type === 'number') {
        converted[key] = value ? Number(value) : null;
      } else if (type === 'boolean') {
        converted[key] = ['true', '1', 'yes'].includes(String(value).toLowerCase());
      } else if (type === 'date') {
        converted[key] = value ? new Date(String(value)).toISOString().split('T')[0] : null;
      } else {
        converted[key] = value;
      }
    });
    
    // Add default values for required fields
    if (table === 'participants') {
      converted.approved = converted.approved ?? false;
      converted.contractSigned = converted.contractSigned ?? false;
      converted.signedSyllabus = converted.signedSyllabus ?? false;
      // ... more defaults
    }
    
    return converted;
  });
}
```

## Server Action Rules

### 1. Import Action Structure
```typescript
// Always use this pattern for import actions
export async function importParticipants(
  data: any[],
  options: ImportOptions,
  mapping: ImportMapping
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    message: ''
  };

  try {
    // 1. Map CSV columns to database fields
    const mappedData = data.map(row => {
      const mapped: any = {};
      Object.entries(mapping).forEach(([csvColumn, dbField]) => {
        if (row[csvColumn] !== undefined) {
          mapped[dbField] = row[csvColumn];
        }
      });
      return mapped;
    });

    // 2. Validate data
    if (options.validateData) {
      const validationErrors = validateData(mappedData, 'participants');
      if (validationErrors.length > 0) {
        result.errors = validationErrors;
        result.message = `Validation failed with ${validationErrors.length} errors`;
        return result;
      }
    }

    // 3. Convert data types
    const convertedData = convertDataTypes(mappedData, 'participants');

    // 4. Process in batches
    const batchSize = options.batchSize || 50;
    const batches = [];
    
    for (let i = 0; i < convertedData.length; i += batchSize) {
      batches.push(convertedData.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (participantData) => {
        try {
          // Use existing CRUD functions for consistency
          const upsertResult = await upsertParticipantByEmail(participantData);
          
          if (upsertResult.success) {
            if (upsertResult.action === 'created') {
              result.imported++;
            } else if (upsertResult.action === 'updated') {
              result.updated++;
            }
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
      });

      await Promise.all(batchPromises);
    }

    result.success = true;
    result.message = `Successfully imported ${result.imported} participants, updated ${result.updated}, skipped ${result.skipped}`;
    
  } catch (error) {
    result.message = `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.errors.push({
      row: 0,
      message: result.message
    });
  }

  return result;
}
```

### 2. CRUD Integration Rules
- **Always use existing CRUD functions** (e.g., `upsertParticipantByEmail`)
- **Never bypass validation** by directly manipulating Firestore
- **Maintain data consistency** with existing system
- **Use proper error handling** for all operations

### 3. Batch Processing Rules
```typescript
// Always process in configurable batches
const batchSize = options.batchSize || 50;
if (convertedData.length > 1000) {
  batchSize = Math.min(batchSize, 25); // Smaller batches for large datasets
}

// Process batches sequentially to avoid overwhelming the database
for (const batch of batches) {
  const batchPromises = batch.map(async (data) => {
    // Process individual record
  });
  
  await Promise.all(batchPromises);
}
```

## UI Component Rules

### 1. Import Dialog Structure
```typescript
// Always use this 5-step structure
const [currentStep, setCurrentStep] = useState<'select' | 'upload' | 'mapping' | 'preview' | 'import'>('select');

// Step 1: Select Table
// Step 2: Upload File
// Step 3: Field Mapping
// Step 4: Preview
// Step 5: Import Results
```

### 2. State Management Rules
```typescript
// Always manage these states
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

### 3. Field Mapping Rules
```typescript
// Always provide comprehensive field options
const fieldOptions = [
  // Required fields first
  ...selectedDataType?.requiredFields.map(field => (
    <SelectItem key={field} value={field}>
      {field} (Required)
    </SelectItem>
  )),
  // Optional fields
  ...['etransferEmailAddress', 'mailingAddress', 'phoneNumber', 'approved', 
      'contractSigned', 'signedSyllabus', 'availability', 'assignedMentor', 
      'idProvided', 'canadianStatusOther', 'sin', 'youthProposal', 
      'proofOfAffiliationWithSCD', 'scagoCounterpart', 'age', 'citizenshipStatus', 
      'location', 'projectCategory', 'duties', 'affiliationWithSCD', 'notes', 
      'nextSteps', 'interviewed', 'interviewNotes', 'recruited'].map(field => (
    <SelectItem key={field} value={field}>
      {field} (Optional)
    </SelectItem>
  ))
];
```

## Schema Definition Rules

### 1. Table Schema Structure
```typescript
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
      youthParticipant: 'string',
      email: 'email',
      region: 'string',
      dob: 'date',
      age: 'number',
      approved: 'boolean',
      contractSigned: 'boolean',
      signedSyllabus: 'boolean',
      idProvided: 'boolean',
      proofOfAffiliationWithSCD: 'boolean',
      interviewed: 'boolean',
      recruited: 'boolean',
      canadianStatus: 'enum:Canadian Citizen,Permanent Resident,Other'
    }
  },
  // ... other schemas
};
```

### 2. Field Type Rules
- **string**: Basic text fields
- **email**: Email validation required
- **number**: Numeric values
- **boolean**: true/false, 1/0, yes/no
- **date**: ISO date format
- **enum**: Comma-separated allowed values

## Error Handling Rules

### 1. Validation Error Patterns
```typescript
// Always provide detailed error information
interface ImportError {
  row: number;           // Row number for user reference
  field?: string;       // Field name if applicable
  message: string;      // Human-readable error message
  value?: any;          // The problematic value
}
```

### 2. Error Display Rules
```typescript
// Always show errors in user-friendly format
{importResult.errors.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg text-destructive">Import Errors</CardTitle>
      <CardDescription>
        {importResult.errors.length} errors occurred during import
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {importResult.errors.slice(0, 10).map((error, index) => (
          <div key={index} className="text-sm p-2 bg-destructive/10 rounded">
            <span className="font-medium">Row {error.row}:</span> {error.message}
          </div>
        ))}
        {importResult.errors.length > 10 && (
          <p className="text-sm text-muted-foreground">
            ... and {importResult.errors.length - 10} more errors
          </p>
        )}
      </div>
    </CardContent>
  </Card>
)}
```

## Security Rules

### 1. Data Sanitization
```typescript
// Always sanitize input data
const sanitizedData = data.map(row => {
  const sanitized: any = {};
  Object.entries(row).forEach(([key, value]) => {
    // Remove potentially dangerous characters
    sanitized[key] = String(value).trim().replace(/[<>]/g, '');
  });
  return sanitized;
});
```

### 2. Authentication Rules
- **Admin-only access** for import functionality
- **Role-based permissions** for different import types
- **Audit logging** for all import operations

### 3. Data Privacy Rules
- **SIN hashing** for sensitive data
- **Secure file handling** for uploads
- **Data retention policies** for import logs

## Performance Rules

### 1. Batch Processing
```typescript
// Always use configurable batch sizes
const batchSize = options.batchSize || 50;
if (convertedData.length > 1000) {
  batchSize = Math.min(batchSize, 25); // Smaller batches for large datasets
}
```

### 2. Memory Management
```typescript
// Process large datasets in chunks
for (let i = 0; i < data.length; i += batchSize) {
  const batch = data.slice(i, i + batchSize);
  await processBatch(batch);
}
```

### 3. Progress Tracking
```typescript
// Always provide progress feedback
const progress = (processed / total) * 100;
setProgress(progress);
```

## Testing Rules

### 1. Unit Testing
```typescript
// Test all parsing functions
describe('parseCSV', () => {
  it('should parse valid CSV data', () => {
    const csv = 'name,email\nJohn,john@example.com';
    const result = parseCSV(csv);
    expect(result.headers).toEqual(['name', 'email']);
    expect(result.data).toEqual([{ name: 'John', email: 'john@example.com' }]);
  });
});
```

### 2. Integration Testing
```typescript
// Test import actions with mock data
describe('importParticipants', () => {
  it('should import participants successfully', async () => {
    const mockData = [{ name: 'John', email: 'john@example.com' }];
    const result = await importParticipants(mockData, options, mapping);
    expect(result.success).toBe(true);
  });
});
```

## Maintenance Rules

### 1. Schema Updates
- **Update TABLE_SCHEMAS** when adding new fields
- **Update field mapping options** in UI components
- **Update validation rules** for new field types
- **Test with sample data** after schema changes

### 2. Error Monitoring
- **Log all import errors** for debugging
- **Monitor performance metrics** for large imports
- **Track success/failure rates** for different data types

### 3. Documentation Updates
- **Update field mappings** when adding new fields
- **Update error messages** for better user experience
- **Update examples** in documentation

## Common Patterns

### 1. Adding New Import Types
```typescript
// 1. Add to TABLE_SCHEMAS
newTable: {
  required: ['field1', 'field2'],
  optional: ['field3', 'field4'],
  types: {
    field1: 'string',
    field2: 'email',
    // ... other types
  }
}

// 2. Add to import-actions.ts
export async function importNewTable(data: any[], options: ImportOptions, mapping: ImportMapping): Promise<ImportResult> {
  // Implementation following the standard pattern
}

// 3. Add to import-dialog.tsx
const dataTypes = [
  // ... existing types
  { 
    id: 'newTable', 
    label: 'New Table', 
    icon: Icon, 
    description: 'Description',
    requiredFields: ['field1', 'field2']
  }
];
```

### 2. Adding New Field Types
```typescript
// 1. Add to schema types
types: {
  newField: 'newType',
  // ... other types
}

// 2. Add validation logic
case 'newType':
  // Validation logic for new type
  break;

// 3. Add conversion logic
if (type === 'newType') {
  converted[key] = convertToNewType(value);
}
```

## Anti-Patterns to Avoid

### ❌ Don't:
- Use `any` types for import data
- Bypass existing CRUD functions
- Skip validation for performance
- Process all data in a single batch
- Ignore error handling
- Use direct Firestore operations
- Skip type conversion
- Forget to handle edge cases

### ✅ Do:
- Use proper TypeScript types
- Leverage existing CRUD functions
- Validate all data before processing
- Use configurable batch sizes
- Handle all error cases
- Use server actions for database operations
- Convert types safely
- Test with edge cases

## Quick Reference

### Essential Commands
```bash
# Type checking
npx tsc --noEmit

# Lint checking
npm run lint

# Test imports
npm run test
```

### Key Files to Know
- `src/lib/import-utils.ts` - Core import utilities
- `src/app/youth-empowerment/import-actions.ts` - Server actions
- `src/components/youth-empowerment/import-dialog.tsx` - UI component
- `src/app/admin/page.tsx` - Admin integration

### Common Patterns
- Import actions return `ImportResult`
- UI components use 5-step wizard
- All imports use existing CRUD functions
- Batch processing for large datasets
- Comprehensive error reporting

---

*Last updated: [Current Date]*
*Version: 1.0.0*
