/**
 * Mapping of survey field keys to human-readable questions
 */
export const QUESTION_MAPPING: Record<string, string> = {
    // Personal / Demographics
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email Address",
    phone: "Phone Number",
    city: "City",
    ageConfirmation: "Confirmed Age > 18",
    scdConnection: "Connection to Sickle Cell Disease",

    // Hospital / Visit Info
    visitYear: "Year of Visit",
    hospital: "Hospital Name",
    primaryHospital: "Primary Hospital",
    visitReason: "Reason for Visit",
    visitReasonED: "Reason for Emergency Dept Visit",

    // Inpatient Experience
    hcpRespectfulnessInpatient: "How respectful was the Inpatient healthcare provider?",
    reportedToHospitalInpatient: "Did you report this issue to the hospital?",
    experiencedInpatient: "Issues Experienced (Inpatient)",
    timelyMannerInpatient: "Was care provided in a timely manner (Inpatient)?",
    hcpFamiliarityInpatient: "Was the Inpatient provider familiar with SCD protocols?",

    // Emergency Department Experience
    hcpRespectfulnessED: "How respectful was the ED healthcare provider?",
    hcpFamiliarityED: "Was the ED provider familiar with SCD protocols?",
    timelyMannerED: "Was care provided in a timely manner (ED)?",
    experiencedED: "Issues Experienced (ED)",
    triageCategory: "Triage Category Assigned",

    // Clinical Metrics
    painScore: "Pain Score (0-10)",
    waitTime: "Wait Time",
    timeToAnalgesia: "Time to Pain Medication",
    lengthOfStay: "Length of Hospital Stay",

    // General Feedback
    hospitalInteraction: "Detailed Experience Description",
    rating: "Overall Care Rating",
    submittedAt: "Submission Date",
    surveyId: "Survey Type"
};

/**
 * Get the full question text for a given key
 */
export function getQuestionText(key: string): string {
    if (QUESTION_MAPPING[key]) return QUESTION_MAPPING[key];

    // Fallback: Format camelCase to Title Case
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim()
        .replace(/\bEd\b/g, 'ED') // Fix common acronyms
        .replace(/\bHcp\b/g, 'HCP')
        .replace(/\bScd\b/g, 'SCD')
        .replace(/\bId\b/g, 'ID');
}

/**
 * Format a value for display (handles arrays, booleans, etc.)
 */
export function formatAnswerValue(value: any): string | string[] {
    if (value === null || value === undefined) return 'N/A';

    if (Array.isArray(value)) {
        // Skip file upload arrays (handled separately in the UI)
        if (value.length > 0 && typeof value[0] === 'object' && value[0]?.url) return 'N/A';
        return value.map(v => {
            if (typeof v === 'object' && v !== null) {
                if (v.selection) return v.selection === 'other' && v.other ? v.other : v.selection;
                return JSON.stringify(v);
            }
            return formatStringValue(String(v));
        });
    }

    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }

    if (typeof value === 'object') {
        // Skip file upload objects (handled separately in the UI)
        if (value.url) return 'N/A';
        // Handle {selection: '...', other: '...'} from hospital-on/city-on/department-on
        if (value.selection === 'other' && value.other) return value.other;
        if (value.selection) return value.selection;
        // Handle duration {hours, minutes} or {days, hours}
        if (value.hours !== undefined && value.minutes !== undefined) return `${value.hours}h ${value.minutes}m`;
        if (value.days !== undefined && value.hours !== undefined) return `${value.days}d ${value.hours}h`;
        // Handle time-amount {value, unit}
        if (value.value !== undefined && value.unit) return `${value.value} ${value.unit}`;
        return JSON.stringify(value);
    }

    return formatStringValue(String(value));
}

function formatStringValue(str: string): string {
    // Convert kebab-case to Title Case (e.g. "stigmatization-stereotyping" -> "Stigmatization Stereotyping")
    if (str.includes('-') && !str.includes(' ')) {
        return str
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    // Convert snake_case
    if (str.includes('_') && !str.includes(' ')) {
        return str
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    return str;
}
