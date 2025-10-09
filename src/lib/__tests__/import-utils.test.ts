import { describe, it, expect } from 'vitest';
import {
  validateData,
  convertDataTypes,
  generateMappingSuggestions,
  parseCSV,
  parseJSON,
  TABLE_SCHEMAS
} from '../import-utils';

describe('Import Utils', () => {
  describe('validateData', () => {
    it('should validate required fields for participants', () => {
      const data = [
        { youthParticipant: 'John Doe', email: 'john@example.com', region: 'Ontario', dob: '1995-01-01', canadianStatus: 'Canadian Citizen' }
      ];
      const errors = validateData(data, 'participants');
      expect(errors).toHaveLength(0);
    });

    it('should return errors for missing required fields', () => {
      const data = [
        { email: 'john@example.com' } // Missing required fields
      ];
      const errors = validateData(data, 'participants');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].field).toBe('youthParticipant');
    });

    it('should validate email format', () => {
      const data = [
        { 
          youthParticipant: 'John Doe', 
          email: 'invalid-email', 
          region: 'Ontario', 
          dob: '1995-01-01', 
          canadianStatus: 'Canadian Citizen' 
        }
      ];
      const errors = validateData(data, 'participants');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].field).toBe('email');
    });
  });

  describe('convertDataTypes', () => {
    it('should convert string to boolean', () => {
      const data = [{ approved: 'true', contractSigned: 'false' }];
      const converted = convertDataTypes(data, 'participants');
      expect(converted[0].approved).toBe(true);
      expect(converted[0].contractSigned).toBe(false);
    });

    it('should convert string to number', () => {
      const data = [{ age: '25' }];
      const converted = convertDataTypes(data, 'participants');
      expect(converted[0].age).toBe(25);
    });

    it('should convert string to date', () => {
      const data = [{ dob: '1995-01-01' }];
      const converted = convertDataTypes(data, 'participants');
      expect(converted[0].dob).toBe('1995-01-01');
    });

    it('should add default values for participants', () => {
      const data = [{ youthParticipant: 'John Doe' }];
      const converted = convertDataTypes(data, 'participants');
      expect(converted[0].approved).toBe(false);
      expect(converted[0].contractSigned).toBe(false);
      expect(converted[0].availability).toBe('');
    });
  });

  describe('generateMappingSuggestions', () => {
    it('should map exact matches', () => {
      const headers = ['youthParticipant', 'email', 'region'];
      const mapping = generateMappingSuggestions(headers, 'participants');
      expect(mapping['youthParticipant']).toBe('youthParticipant');
      expect(mapping['email']).toBe('email');
      expect(mapping['region']).toBe('region');
    });

    it('should map fuzzy matches', () => {
      const headers = ['name', 'email_address', 'phone_number'];
      const mapping = generateMappingSuggestions(headers, 'participants');
      expect(mapping['name']).toBe('youthParticipant');
      expect(mapping['email_address']).toBe('email');
      expect(mapping['phone_number']).toBe('phoneNumber');
    });

    it('should handle unmapped headers', () => {
      const headers = ['unknown_field', 'another_unknown'];
      const mapping = generateMappingSuggestions(headers, 'participants');
      expect(mapping['unknown_field']).toBeUndefined();
      expect(mapping['another_unknown']).toBeUndefined();
    });
  });

  describe('parseCSV', () => {
    it('should parse valid CSV', () => {
      const csv = 'name,email,age\nJohn Doe,john@example.com,25';
      const result = parseCSV(csv);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('John Doe');
    });

    it('should handle empty CSV', () => {
      const csv = '';
      const result = parseCSV(csv);
      expect(result.success).toBe(false);
    });

    it('should handle malformed CSV', () => {
      const csv = 'name,email\nJohn Doe,john@example.com,extra,fields';
      const result = parseCSV(csv);
      expect(result.success).toBe(true); // Papa Parse is forgiving
    });
  });

  describe('parseJSON', () => {
    it('should parse valid JSON', () => {
      const json = '[{"name": "John Doe", "email": "john@example.com"}]';
      const result = parseJSON(json);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('John Doe');
    });

    it('should handle invalid JSON', () => {
      const json = 'invalid json';
      const result = parseJSON(json);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle empty JSON', () => {
      const json = '[]';
      const result = parseJSON(json);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('TABLE_SCHEMAS', () => {
    it('should have correct required fields for participants', () => {
      const schema = TABLE_SCHEMAS.participants;
      expect(schema.required).toContain('youthParticipant');
      expect(schema.required).toContain('email');
      expect(schema.required).toContain('region');
      expect(schema.required).toContain('dob');
      expect(schema.required).toContain('canadianStatus');
    });

    it('should have correct type definitions', () => {
      const schema = TABLE_SCHEMAS.participants;
      expect(schema.types.youthParticipant).toBe('string');
      expect(schema.types.email).toBe('email');
      expect(schema.types.age).toBe('number');
      expect(schema.types.approved).toBe('boolean');
    });

    it('should include all YEP participant fields', () => {
      const schema = TABLE_SCHEMAS.participants;
      const allFields = [...schema.required, ...schema.optional];
      
      // Check for new fields from current participants data
      expect(allFields).toContain('age');
      expect(allFields).toContain('citizenshipStatus');
      expect(allFields).toContain('location');
      expect(allFields).toContain('projectCategory');
      expect(allFields).toContain('duties');
      expect(allFields).toContain('affiliationWithSCD');
      expect(allFields).toContain('notes');
      expect(allFields).toContain('nextSteps');
      expect(allFields).toContain('interviewed');
      expect(allFields).toContain('interviewNotes');
      expect(allFields).toContain('recruited');
    });
  });
});
