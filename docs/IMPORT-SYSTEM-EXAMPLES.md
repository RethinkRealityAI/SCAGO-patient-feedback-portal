# YEP Import System - Usage Examples

## Overview
This document provides practical examples of how to use the YEP Import System for various data import scenarios.

## Example 1: Importing Participants from CSV

### Sample CSV Data
```csv
name,email,phone,region,birth_date,status,age,location,project
John Doe,john@example.com,555-1234,Ontario,1995-01-01,Canadian Citizen,28,Toronto,Advocacy
Jane Smith,jane@example.com,555-5678,Quebec,1998-05-15,Permanent Resident,25,Montreal,Education
```

### Import Process
1. **Select Data Type**: Choose "Participants"
2. **Upload File**: Select the CSV file
3. **Field Mapping**: System will automatically suggest:
   - `name` → `youthParticipant`
   - `email` → `email`
   - `phone` → `phoneNumber`
   - `region` → `region`
   - `birth_date` → `dob`
   - `status` → `canadianStatus`
   - `age` → `age`
   - `location` → `location`
   - `project` → `projectCategory`
4. **Preview**: Review mapped data
5. **Import**: Execute import

### Expected Results
- **Imported**: 2 participants
- **Updated**: 0 (new records)
- **Skipped**: 0
- **Errors**: 0

## Example 2: Importing Mentors from Excel

### Sample Excel Data
| Name | Title | Email | Phone | Specialization |
|------|-------|-------|-------|----------------|
| Dr. Sarah Johnson | Medical Advisor | sarah@example.com | 555-1111 | Sickle Cell Disease |
| Prof. Michael Chen | Research Director | michael@example.com | 555-2222 | Youth Development |

### Import Process
1. **Select Data Type**: Choose "Mentors"
2. **Upload File**: Select the Excel file
3. **Field Mapping**: System will automatically suggest:
   - `Name` → `name`
   - `Title` → `title`
   - `Email` → `email`
   - `Phone` → `phone`
   - `Specialization` → `specialization`
4. **Preview**: Review mapped data
5. **Import**: Execute import

## Example 3: Importing Workshop Attendance from JSON

### Sample JSON Data
```json
[
  {
    "participant_id": "participant_123",
    "workshop_id": "workshop_456",
    "attended": true,
    "rating": 5,
    "feedback": "Great workshop!"
  },
  {
    "participant_id": "participant_789",
    "workshop_id": "workshop_456",
    "attended": false,
    "rating": null,
    "feedback": "Could not attend"
  }
]
```

### Import Process
1. **Select Data Type**: Choose "Attendance"
2. **Upload File**: Select the JSON file
3. **Field Mapping**: System will automatically suggest:
   - `participant_id` → `participantId`
   - `workshop_id` → `workshopId`
   - `attended` → `attended`
   - `rating` → `rating`
   - `feedback` → `feedback`
4. **Preview**: Review mapped data
5. **Import**: Execute import

## Example 4: Handling Import Errors

### Sample CSV with Errors
```csv
name,email,region,dob,canadianStatus
John Doe,invalid-email,Ontario,1995-01-01,Canadian Citizen
Jane Smith,jane@example.com,,1998-05-15,Permanent Resident
,invalid@example.com,Quebec,2000-01-01,Other
```

### Error Handling Process
1. **Upload File**: System parses CSV successfully
2. **Field Mapping**: Map fields as usual
3. **Preview**: System shows validation errors:
   - Row 1: Invalid email format
   - Row 2: Missing required field 'region'
   - Row 3: Missing required field 'youthParticipant'
4. **Import**: System processes valid rows, skips invalid ones
5. **Results**: 
   - **Imported**: 0 (all rows had errors)
   - **Updated**: 0
   - **Skipped**: 3
   - **Errors**: 3

### Error Report
```
Row 1: Invalid email format for 'invalid-email'
Row 2: Required field 'region' is missing
Row 3: Required field 'youthParticipant' is missing
```

## Example 5: Large Dataset Import

### Performance Considerations
For large datasets (1000+ records):

1. **File Preparation**:
   - Use CSV format (most efficient)
   - Remove empty rows
   - Ensure consistent formatting

2. **Import Settings**:
   - **Batch Size**: 25 (automatically set for large datasets)
   - **Skip Duplicates**: true
   - **Update Existing**: false
   - **Validate Data**: true

3. **Monitoring**:
   - Watch progress indicators
   - Check error reports
   - Monitor system performance

### Sample Large CSV Structure
```csv
youthParticipant,email,region,dob,canadianStatus,age,location,projectCategory
John Doe,john1@example.com,Ontario,1995-01-01,Canadian Citizen,28,Toronto,Advocacy
Jane Smith,jane1@example.com,Quebec,1998-05-15,Permanent Resident,25,Montreal,Education
... (1000+ more rows)
```

## Example 6: Updating Existing Records

### Scenario
You have existing participants and want to update their information.

### Import Settings
- **Skip Duplicates**: false
- **Update Existing**: true
- **Validate Data**: true

### Sample Update CSV
```csv
email,age,location,projectCategory,notes
john@example.com,29,Toronto,Advocacy,Updated information
jane@example.com,26,Montreal,Education,New project assignment
```

### Expected Results
- **Imported**: 0 (no new records)
- **Updated**: 2 (existing records updated)
- **Skipped**: 0
- **Errors**: 0

## Example 7: Mixed Data Types Import

### Scenario
You have a CSV with both participants and mentors.

### Solution
1. **Split the data** into separate files
2. **Import participants first**:
   ```csv
   youthParticipant,email,region,dob,canadianStatus
   John Doe,john@example.com,Ontario,1995-01-01,Canadian Citizen
   ```
3. **Import mentors second**:
   ```csv
   name,title,email,phone
   Dr. Sarah Johnson,Medical Advisor,sarah@example.com,555-1111
   ```

## Example 8: Handling Special Characters

### Sample CSV with Special Characters
```csv
youthParticipant,email,region,dob,canadianStatus,notes
José García,jose@example.com,Ontario,1995-01-01,Canadian Citizen,Participant with special characters
François Dubois,francois@example.com,Quebec,1998-05-15,Permanent Resident,French participant
```

### Import Process
1. **File Encoding**: Ensure UTF-8 encoding
2. **Field Mapping**: Map as usual
3. **Validation**: System handles special characters correctly
4. **Import**: Process normally

## Example 9: Date Format Handling

### Sample CSV with Different Date Formats
```csv
youthParticipant,email,region,dob,canadianStatus
John Doe,john@example.com,Ontario,1995-01-01,Canadian Citizen
Jane Smith,jane@example.com,Quebec,15/05/1998,Permanent Resident
Bob Wilson,bob@example.com,BC,May 15, 1998,Canadian Citizen
```

### Date Conversion
- **ISO Format** (1995-01-01): ✅ Accepted
- **DD/MM/YYYY** (15/05/1998): ✅ Converted to 1998-05-15
- **Text Format** (May 15, 1998): ✅ Converted to 1998-05-15

## Example 10: Boolean Value Handling

### Sample CSV with Boolean Values
```csv
youthParticipant,email,region,dob,canadianStatus,approved,contractSigned,interviewed
John Doe,john@example.com,Ontario,1995-01-01,Canadian Citizen,true,false,1
Jane Smith,jane@example.com,Quebec,1998-05-15,Permanent Resident,yes,no,0
Bob Wilson,bob@example.com,BC,2000-01-01,Canadian Citizen,1,0,true
```

### Boolean Conversion
- **true/false**: ✅ Converted to boolean
- **yes/no**: ✅ Converted to boolean
- **1/0**: ✅ Converted to boolean

## Best Practices

### 1. Data Preparation
- **Clean data**: Remove empty rows and fix formatting
- **Consistent formats**: Use standard date and number formats
- **Required fields**: Ensure all required fields are present
- **Test with small files**: Validate format with small datasets first

### 2. Import Process
- **Preview data**: Always review data before importing
- **Check mapping**: Verify field mappings are correct
- **Backup data**: Create backups before large imports
- **Monitor progress**: Watch for errors during import

### 3. Error Handling
- **Review errors**: Check error reports for patterns
- **Fix data**: Correct issues in source file
- **Re-import**: Use corrected data for re-import
- **Document issues**: Keep track of common problems

### 4. Performance Optimization
- **Use CSV format**: Most efficient for large datasets
- **Batch processing**: System automatically optimizes batch sizes
- **Network stability**: Ensure stable internet connection
- **Browser compatibility**: Use modern browsers for best performance

## Troubleshooting Common Issues

### Issue: "Validation failed" errors
**Cause**: Required fields missing or invalid data types
**Solution**: Check field mapping and data format
**Prevention**: Use preview step to catch errors early

### Issue: "Import failed" errors
**Cause**: Database connection or permission issues
**Solution**: Check network connection and user permissions
**Prevention**: Test with small datasets first

### Issue: "File format not supported" errors
**Cause**: Unsupported file format or corrupted file
**Solution**: Convert to supported format (CSV/JSON/Excel)
**Prevention**: Use recommended file formats

### Issue: "Memory limit exceeded" errors
**Cause**: File too large for processing
**Solution**: Split file into smaller chunks
**Prevention**: Use batch processing for large files

---

*These examples demonstrate the flexibility and robustness of the YEP Import System for various data import scenarios.*
