// Common hospital departments/services, with 'Other' first for free-text capture

const toSlug = (str: string) => str
  .toLowerCase()
  .replace(/[^a-z0-9 -/]/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-');

const departmentsList: string[] = [
  'Emergency Department',
  'Outpatient Clinic',
  'Pain Clinic',
  'Cardiology',
  'Oncology',
  'General Surgery',
  'Orthopedics',
  'Obstetrics and Gynecology',
  'Pediatrics',
  'Neurology',
  'Intensive Care Unit (ICU)',
  'Radiology / Imaging',
  'Laboratory',
  'Pharmacy',
  'Rehabilitation',
  'Mental Health / Psychiatry',
  'Hematology',
  'Nephrology',
  'Gastroenterology',
  'Endocrinology',
  'Respiratory / Pulmonology',
  'Palliative Care',
];

const mapped = departmentsList.map((name) => ({ label: name, value: toSlug(name) }));

export const hospitalDepartments = [
  { label: 'Other', value: 'other' },
  ...mapped,
];

export default hospitalDepartments;


