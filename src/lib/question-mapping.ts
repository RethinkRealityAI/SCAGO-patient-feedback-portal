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

        // If it's an array of strings/numbers, format them
        if (value.every(v => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')) {
            return value.map(v => formatStringValue(String(v)));
        }

        // Otherwise format each item which might be an object
        return value.map(v => {
            const formatted = formatAnswerValue(v);
            return Array.isArray(formatted) ? formatted.join(', ') : formatted;
        });
    }

    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }

    if (typeof value === 'object') {
        // Skip file upload objects (handled separately in the UI)
        if (value.url) return 'N/A';

        // Handle {selection: '...', other: '...'} from hospital-on/city-on/department-on
        if (value.selection) {
            if (value.selection === 'other' && value.other) return value.other;
            return formatStringValue(String(value.selection));
        }

        // Handle duration {hours, minutes} or {days, hours}
        if (value.hours !== undefined && value.minutes !== undefined) {
            const parts = [];
            if (value.hours > 0) parts.push(`${value.hours}h`);
            if (value.minutes > 0) parts.push(`${value.minutes}m`);
            return parts.length > 0 ? parts.join(' ') : '0m';
        }
        if (value.days !== undefined && value.hours !== undefined) {
            const parts = [];
            if (value.days > 0) parts.push(`${value.days}d`);
            if (value.hours > 0) parts.push(`${value.hours}h`);
            return parts.length > 0 ? parts.join(' ') : '0h';
        }

        // Handle time-amount {value, unit}
        if (value.value !== undefined && value.unit) return `${value.value} ${value.unit}`;

        // Generic object: flatten it
        const entries = Object.entries(value)
            .filter(([k, v]) => v !== null && v !== undefined && v !== '')
            .map(([k, v]) => {
                const label = getQuestionText(k);
                const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
                return `${label}: ${val}`;
            });

        return entries.length > 0 ? entries.join(', ') : 'N/A';
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
