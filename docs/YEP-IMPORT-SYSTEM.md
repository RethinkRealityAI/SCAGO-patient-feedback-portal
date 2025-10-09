# YEP Data Import System Documentation

## Overview

The YEP Data Import System is a comprehensive solution for importing data into the Youth Empowerment Program (YEP) system. It supports multiple data formats, provides intelligent field mapping, and ensures data integrity through robust validation.

## Features

### 🎯 **Core Capabilities**
- **Multi-format Support**: CSV, JSON, Excel (XLSX/XLS)
- **Intelligent Field Mapping**: Automatic suggestions with manual override
- **Comprehensive Validation**: Schema validation with detailed error reporting
- **Batch Processing**: Efficient handling of large datasets
- **Duplicate Management**: Skip or update existing records
- **Real-time Preview**: Review data before import
- **Error Reporting**: Detailed feedback with row numbers

### 📊 **Supported Data Types**
- **Participants**: Youth participant information
- **Mentors**: Mentor profiles and assignments
- **Workshops**: Workshop schedules and details
- **Attendance**: Workshop attendance records
- **Meetings**: Advisor meeting records

## Architecture

### **File Structure**
```
src/
├── lib/
│   └── import-utils.ts              # Core import utilities and validation
├── app/
│   ├── youth-empowerment/
│   │   └── import-actions.ts       # Server actions for bulk import
│   └── api/
│       └── yep/
│           └── csv-map/
│               └── route.ts        # CSV mapping API endpoint
├── components/
│   └── youth-empowerment/
│       └── import-dialog.tsx       # Import dialog component
└── docs/
    └── YEP-IMPORT-SYSTEM.md        # This documentation
```

### **Component Hierarchy**
```
AdminPanel
└── ImportDialog
    ├── Step 1: Select Table
    ├── Step 2: Upload File
    ├── Step 3: Field Mapping
    ├── Step 4: Preview Data
    └── Step 5: Import Results
```

## Usage Guide

### **1. Accessing Import Functionality**

1. Navigate to **Admin Panel** → **YEP Tab**
2. Click **"Import Data (CSV/JSON/Excel)"** button
3. Follow the 5-step import wizard

### **2. Import Process**

#### **Step 1: Select Data Type**
- Choose from: Participants, Mentors, Workshops, Attendance, Meetings
- Each type shows required fields and description

#### **Step 2: Upload File**
- Supported formats: CSV, JSON, Excel
- File size limit: Configurable (default: 10MB)
- Drag & drop or file picker interface

#### **Step 3: Field Mapping**
- Automatic mapping suggestions based on column names
- Manual override for custom mappings
- Visual indicators for mapped vs. skipped columns
- Required field highlighting

#### **Step 4: Preview Data**
- Sample data preview (first 5 rows)
- Validation error summary
- Import statistics (total rows, mapped fields, errors)
- Final review before import

#### **Step 5: Import Results**
- Real-time progress tracking
- Success/error statistics
- Detailed error reporting with row numbers
- Download error report (if applicable)

### **3. Data Format Requirements**

#### **CSV Format**
```csv
youthParticipant,email,region,dob,canadianStatus,age,location
John Doe,john@example.com,Ontario,1995-01-01,Canadian Citizen,28,Toronto
```

#### **JSON Format**
```json
[
  {
    "youthParticipant": "John Doe",
    "email": "john@example.com",
    "region": "Ontario",
    "dob": "1995-01-01",
    "canadianStatus": "Canadian Citizen",
    "age": 28,
    "location": "Toronto"
  }
]
```

#### **Excel Format**
- First row must contain headers
- Data starts from row 2
- Supported sheets: First sheet only

## Field Mapping

### **Automatic Mapping Rules**

The system uses intelligent mapping based on column name patterns:

```typescript
const fieldMappings = {
  youthParticipant: ['name', 'participant', 'youth', 'student', 'full name'],
  email: ['email', 'e-mail', 'email address'],
  phoneNumber: ['phone', 'telephone', 'mobile', 'cell', 'contact number'],
  region: ['region', 'province', 'state', 'location'],
  dob: ['dob', 'date of birth', 'birthday', 'birth date'],
  canadianStatus: ['citizenship', 'canadian', 'status', 'citizen'],
  // ... more mappings
};
```

### **Required Fields by Data Type**

#### **Participants**
- `youthParticipant` (string)
- `email` (email)
- `region` (string)
- `dob` (date)
- `canadianStatus` (enum: Canadian Citizen, Permanent Resident, Other)

#### **Mentors**
- `name` (string)
- `title` (string)
- `email` (email)

#### **Workshops**
- `title` (string)
- `date` (date)
- `description` (string)

#### **Attendance**
- `participantId` (string)
- `workshopId` (string)
- `attended` (boolean)

#### **Meetings**
- `participantId` (string)
- `mentorId` (string)
- `meetingDate` (date)
- `type` (string)

## Validation Rules

### **Data Type Validation**
- **Email**: Valid email format
- **Date**: ISO date format (YYYY-MM-DD)
- **Number**: Numeric values only
- **Boolean**: true/false, 1/0, yes/no
- **Enum**: Predefined values only

### **Required Field Validation**
- All required fields must be present
- Empty values are not allowed for required fields
- Custom validation messages for each field type

### **Business Logic Validation**
- **SIN Validation**: Canadian Social Insurance Number format
- **Age Validation**: Reasonable age ranges (13-65)
- **Date Validation**: Future dates for workshops, past dates for birth
- **Email Uniqueness**: Duplicate email detection

## Error Handling

### **Validation Errors**
- **Field-level errors**: Specific field validation failures
- **Row-level errors**: Complete row validation failures
- **File-level errors**: Format or structure issues

### **Import Errors**
- **Database errors**: Firestore operation failures
- **Network errors**: Connection timeouts
- **Permission errors**: Insufficient access rights

### **Error Reporting**
```typescript
interface ImportError {
  row: number;           // Row number in file
  field?: string;        // Specific field (if applicable)
  message: string;       // Human-readable error message
  value?: any;          // Problematic value
}
```

## Performance Considerations

### **Batch Processing**
- **Default batch size**: 50 records
- **Configurable**: Adjust based on system capacity
- **Memory efficient**: Processes data in chunks

### **Large File Handling**
- **Streaming**: Large files processed in streams
- **Progress tracking**: Real-time progress updates
- **Memory management**: Automatic garbage collection

### **Optimization Tips**
1. **Use CSV format** for large datasets (most efficient)
2. **Batch size**: 50-100 records for optimal performance
3. **Network**: Ensure stable internet connection
4. **Browser**: Use modern browsers for best performance

## Security Features

### **Data Validation**
- **Input sanitization**: All data sanitized before processing
- **Type checking**: Strict type validation
- **SQL injection prevention**: Parameterized queries

### **File Security**
- **File type validation**: Only allowed formats accepted
- **Size limits**: Configurable file size restrictions
- **Virus scanning**: Optional file scanning (if enabled)

### **Access Control**
- **Admin only**: Import functionality restricted to admin users
- **Audit logging**: All import activities logged
- **Permission checks**: Role-based access control

## API Reference

### **Import Actions**

#### `importData(data, options, mapping)`
Main import function that routes to appropriate handler.

**Parameters:**
- `data: any[]` - Array of data records
- `options: ImportOptions` - Import configuration
- `mapping: ImportMapping` - Field mapping configuration

**Returns:**
- `Promise<ImportResult>` - Import results with statistics

#### `importParticipants(data, options, mapping)`
Import participant data with validation and security.

**Features:**
- Uses `upsertParticipantByEmail` for proper validation
- SIN hashing and security features
- Duplicate detection and handling

#### `validateData(data, table)`
Validate data against table schema.

**Parameters:**
- `data: any[]` - Data to validate
- `table: string` - Target table name

**Returns:**
- `ImportError[]` - Array of validation errors

### **Utility Functions**

#### `parseCSV(content)`
Parse CSV content into structured data.

#### `parseJSON(content)`
Parse JSON content with error handling.

#### `convertDataTypes(data, table)`
Convert string values to appropriate types.

#### `generateMappingSuggestions(headers, table)`
Generate intelligent field mapping suggestions.

## Troubleshooting

### **Common Issues**

#### **"Validation failed" errors**
- **Cause**: Required fields missing or invalid data types
- **Solution**: Check field mapping and data format
- **Prevention**: Use preview step to catch errors early

#### **"Import failed" errors**
- **Cause**: Database connection or permission issues
- **Solution**: Check network connection and user permissions
- **Prevention**: Test with small datasets first

#### **"File format not supported" errors**
- **Cause**: Unsupported file format or corrupted file
- **Solution**: Convert to supported format (CSV/JSON/Excel)
- **Prevention**: Use recommended file formats

#### **"Memory limit exceeded" errors**
- **Cause**: File too large for processing
- **Solution**: Split file into smaller chunks
- **Prevention**: Use batch processing for large files

### **Performance Issues**

#### **Slow import processing**
- **Cause**: Large file size or network issues
- **Solution**: Reduce batch size or check network
- **Prevention**: Use CSV format for large datasets

#### **Browser crashes during import**
- **Cause**: Insufficient memory or browser limitations
- **Solution**: Use smaller files or different browser
- **Prevention**: Process data in smaller batches

## Best Practices

### **Data Preparation**
1. **Clean data**: Remove empty rows and fix formatting
2. **Consistent formats**: Use standard date and number formats
3. **Required fields**: Ensure all required fields are present
4. **Test with small files**: Validate format with small datasets first

### **Import Process**
1. **Preview data**: Always review data before importing
2. **Check mapping**: Verify field mappings are correct
3. **Backup data**: Create backups before large imports
4. **Monitor progress**: Watch for errors during import

### **Error Handling**
1. **Review errors**: Check error reports for patterns
2. **Fix data**: Correct issues in source file
3. **Re-import**: Use corrected data for re-import
4. **Document issues**: Keep track of common problems

## Integration

### **With Existing YEP System**
- **Uses existing CRUD functions**: Maintains data consistency
- **Leverages existing validation**: Reuses validation schemas
- **Follows security standards**: Maintains SIN hashing and security
- **Integrates with admin panel**: Seamless user experience

### **With Export System**
- **Mirrors export functionality**: Consistent user experience
- **Uses same data formats**: Compatible with export files
- **Follows same patterns**: Consistent UI and behavior

## Future Enhancements

### **Planned Features**
- **Template downloads**: Pre-formatted templates for each data type
- **Bulk operations**: Mass update and delete operations
- **Scheduled imports**: Automated import scheduling
- **Advanced mapping**: AI-powered field mapping
- **Data transformation**: Built-in data cleaning tools

### **Performance Improvements**
- **Parallel processing**: Multi-threaded import processing
- **Caching**: Improved caching for large datasets
- **Compression**: Support for compressed file formats
- **Streaming**: Real-time data streaming for large files

## Support

### **Getting Help**
- **Documentation**: Refer to this guide for common issues
- **Error messages**: Check error details for specific solutions
- **Admin support**: Contact system administrator for complex issues
- **Community**: Check internal documentation for updates

### **Reporting Issues**
When reporting issues, please include:
- **File format and size**
- **Error messages**
- **Steps to reproduce**
- **Expected vs. actual behavior**
- **Browser and system information**

---

*Last updated: [Current Date]*
*Version: 1.0*
*Maintainer: YEP Development Team*
