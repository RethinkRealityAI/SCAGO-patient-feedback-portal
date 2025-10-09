# YEP Data Import System Documentation

## Overview

The YEP Data Import System is a comprehensive solution for bulk importing data into the Youth Empowerment Program (YEP) system. It supports multiple data formats (CSV, JSON, Excel) and provides intelligent field mapping, data validation, and error reporting.

## Architecture

### Core Components

1. **Import Utilities** (`src/lib/import-utils.ts`)
   - Data parsing functions (CSV, JSON, Excel)
   - Schema validation and type conversion
   - Field mapping suggestions
   - Duplicate detection

2. **Import Actions** (`src/app/youth-empowerment/import-actions.ts`)
   - Server-side import processing
   - Batch processing for large datasets
   - Integration with existing CRUD operations

3. **Import Dialog** (`src/components/youth-empowerment/import-dialog.tsx`)
   - 5-step wizard interface
   - Field mapping interface
   - Data preview and validation
   - Import results display

4. **Admin Integration** (`src/app/admin/page.tsx`)
   - Import button in admin panel
   - Dialog state management

## Supported Data Types

### 1. Participants
- **Required Fields**: `youthParticipant`, `email`, `region`, `dob`, `canadianStatus`
- **Optional Fields**: All other YEP participant fields
- **Unique Identifier**: Email address
- **Processing**: Uses `upsertParticipantByEmail` for proper validation

### 2. Mentors
- **Required Fields**: `name`, `title`, `email`
- **Optional Fields**: `phone`, `specialization`, `availability`, `notes`
- **Unique Identifier**: Email address

### 3. Workshops
- **Required Fields**: `title`, `date`, `description`
- **Optional Fields**: `time`, `location`, `capacity`, `mentor`, `notes`
- **Unique Identifier**: Title + Date combination

### 4. Attendance
- **Required Fields**: `participantId`, `workshopId`, `attended`
- **Optional Fields**: `notes`, `rating`, `feedback`
- **Unique Identifier**: Participant ID + Workshop ID

### 5. Meetings
- **Required Fields**: `participantId`, `mentorId`, `meetingDate`, `type`
- **Optional Fields**: `duration`, `topics`, `notes`, `followUp`
- **Unique Identifier**: Participant ID + Mentor ID + Meeting Date

## Data Processing Flow

### 1. File Upload & Parsing
```typescript
// CSV Parsing
const { headers, data } = parseCSV(content);

// JSON Parsing
const data = parseJSON(content);

// Excel Parsing (placeholder)
const data = parseExcel(content);
```

### 2. Field Mapping
```typescript
// Automatic mapping suggestions
const suggestions = generateMappingSuggestions(headers, targetTable);

// Manual mapping interface
const mapping: ImportMapping = {
  'csv_column': 'database_field'
};
```

### 3. Data Validation
```typescript
// Schema validation
const errors = validateData(data, targetTable);

// Type conversion
const convertedData = convertDataTypes(data, targetTable);

// Duplicate detection
const duplicates = checkDuplicates(data, targetTable, existingData);
```

### 4. Batch Processing
```typescript
// Process in configurable batches
const batchSize = options.batchSize || 50;
const batches = chunkArray(data, batchSize);

for (const batch of batches) {
  await Promise.all(batch.map(processRecord));
}
```

## Field Mapping System

### Automatic Mapping Rules

The system uses intelligent field mapping with the following rules:

1. **Direct Matches**: Exact field name matches
2. **Fuzzy Matches**: Partial string matching
3. **Common Variations**: Handles common naming conventions

### Mapping Examples

```typescript
const fieldMappings = {
  'youthParticipant': ['name', 'participant', 'youth', 'student', 'full name'],
  'email': ['email', 'e-mail', 'email address'],
  'phoneNumber': ['phone', 'telephone', 'mobile', 'cell', 'contact number'],
  'region': ['region', 'province', 'state', 'location'],
  'dob': ['dob', 'date of birth', 'birthday', 'birth date'],
  'age': ['age', 'years old'],
  'canadianStatus': ['citizenship', 'canadian', 'status', 'citizen'],
  // ... more mappings
};
```

## Data Validation

### Schema Validation
- Required field validation
- Data type validation (string, number, boolean, date, email)
- Enum value validation
- Format validation (email, date, etc.)

### Type Conversion
```typescript
// Automatic type conversion
if (type === 'number') {
  converted[key] = value ? Number(value) : null;
} else if (type === 'boolean') {
  converted[key] = ['true', '1', 'yes'].includes(String(value).toLowerCase());
} else if (type === 'date') {
  converted[key] = value ? new Date(String(value)).toISOString().split('T')[0] : null;
}
```

### Default Values
```typescript
// Participants get default values for required fields
if (table === 'participants') {
  converted.approved = converted.approved ?? false;
  converted.contractSigned = converted.contractSigned ?? false;
  converted.signedSyllabus = converted.signedSyllabus ?? false;
  // ... more defaults
}
```

## Error Handling

### Validation Errors
- Field-level validation errors
- Row-level validation errors
- Schema compliance errors

### Processing Errors
- Database connection errors
- Authentication errors
- Batch processing errors

### Error Reporting
```typescript
interface ImportError {
  row: number;
  field?: string;
  message: string;
  value?: any;
}
```

## Security Features

### Data Sanitization
- Input validation and sanitization
- SQL injection prevention
- XSS protection

### Authentication
- Admin-only access
- Role-based permissions
- Secure file handling

### Data Privacy
- SIN hashing for sensitive data
- Secure file upload handling
- Audit trail maintenance

## Performance Optimization

### Batch Processing
- Configurable batch sizes
- Memory-efficient processing
- Progress tracking

### Database Optimization
- Bulk operations where possible
- Index utilization
- Connection pooling

### UI Optimization
- Lazy loading
- Virtual scrolling for large datasets
- Progress indicators

## Usage Examples

### Basic CSV Import
```typescript
// 1. Select data type
const options: ImportOptions = {
  targetTable: 'participants',
  format: 'csv',
  skipDuplicates: true,
  updateExisting: false,
  validateData: true,
  batchSize: 50
};

// 2. Map fields
const mapping: ImportMapping = {
  'Full Name': 'youthParticipant',
  'Email': 'email',
  'Region': 'region',
  'Date of Birth': 'dob',
  'Status': 'canadianStatus'
};

// 3. Process import
const result = await importData(data, options, mapping);
```

### Advanced Configuration
```typescript
// Large dataset processing
const options: ImportOptions = {
  targetTable: 'participants',
  format: 'csv',
  skipDuplicates: false,
  updateExisting: true,
  validateData: true,
  batchSize: 25 // Smaller batches for large datasets
};
```

## Integration Points

### Existing CRUD Operations
- Uses `upsertParticipantByEmail` for participants
- Uses `createMentor`, `createWorkshop` for other entities
- Maintains data consistency with existing system

### Admin Panel Integration
- Import button in admin panel
- Dialog state management
- Success/failure notifications

### Form System Integration
- Compatible with YEP form templates
- Maintains field mapping consistency
- Supports all YEP field types

## Troubleshooting

### Common Issues

1. **Mapping Errors**
   - Ensure all required fields are mapped
   - Check field name spelling
   - Verify data types match

2. **Validation Errors**
   - Check required field values
   - Verify email format
   - Ensure date format is correct

3. **Performance Issues**
   - Reduce batch size for large datasets
   - Check network connectivity
   - Monitor memory usage

### Debug Mode
```typescript
// Enable detailed logging
const options: ImportOptions = {
  // ... other options
  validateData: true, // Enable validation
  batchSize: 10 // Smaller batches for debugging
};
```

## Best Practices

### Data Preparation
1. Clean data before import
2. Use consistent field names
3. Validate data types
4. Remove duplicates

### Import Strategy
1. Start with small test datasets
2. Use preview mode to verify mapping
3. Import in batches for large datasets
4. Monitor for errors during import

### Maintenance
1. Regular backup before imports
2. Test imports in development first
3. Monitor system performance
4. Keep import logs for audit

## API Reference

### Import Functions
```typescript
// Main import function
export async function importData(
  data: any[],
  options: ImportOptions,
  mapping: ImportMapping
): Promise<ImportResult>

// Individual entity imports
export async function importParticipants(
  data: any[],
  options: ImportOptions,
  mapping: ImportMapping
): Promise<ImportResult>
```

### Utility Functions
```typescript
// Data parsing
export function parseCSV(content: string): { headers: string[]; data: any[] }
export function parseJSON(content: string): any[]

// Validation
export function validateData(data: any[], table: keyof typeof TABLE_SCHEMAS): ImportError[]
export function convertDataTypes(data: any[], table: keyof typeof TABLE_SCHEMAS): any[]

// Mapping
export function generateMappingSuggestions(
  csvHeaders: string[], 
  table: keyof typeof TABLE_SCHEMAS
): ImportMapping
```

## Future Enhancements

### Planned Features
1. Excel file support (XLSX parsing)
2. Real-time import progress
3. Import scheduling
4. Advanced field transformations
5. Import templates
6. Data transformation rules

### Performance Improvements
1. Streaming imports for very large datasets
2. Parallel processing
3. Caching mechanisms
4. Background processing

## Support

For issues or questions regarding the import system:
1. Check the troubleshooting section
2. Review error logs
3. Test with sample data
4. Contact system administrator

---

*Last updated: [Current Date]*
*Version: 1.0.0*
