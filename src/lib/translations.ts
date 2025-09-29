// Translation library for survey forms and UI elements

export interface Translation {
  // UI Elements
  share: string;
  shareTitle: string;
  submit: string;
  clearProgress: string;
  progressSaved: string;
  missingInfo: string;
  completeFields: string;
  completeFieldsPlural: string;
  showAll: string;
  showLess: string;
  language: string;
  english: string;
  french: string;
  linkCopied: string;
  linkCopiedDesc: string;
  selectEncounter: string;
  thankYou: string;
  submissionReceived: string;
  submitAnother: string;
  
  // Form Field Labels and Common Terms
  required: string;
  optional: string;
  pleaseSelect: string;
  other: string;
  yes: string;
  no: string;
  anonymous: string;
  
  // Hospital/Medical Terms
  hospital: string;
  department: string;
  patient: string;
  caregiver: string;
  visitor: string;
  staff: string;
  doctor: string;
  nurse: string;
  emergency: string;
  outpatient: string;
  inpatient: string;
  appointment: string;
  visit: string;
  treatment: string;
  care: string;
  experience: string;
  feedback: string;
  rating: string;
  excellent: string;
  good: string;
  fair: string;
  poor: string;
  
  // Time/Date Terms
  today: string;
  yesterday: string;
  thisWeek: string;
  lastWeek: string;
  thisMonth: string;
  lastMonth: string;
  date: string;
  time: string;
  duration: string;
  hours: string;
  minutes: string;
  days: string;
  
  // Location Terms
  province: string;
  city: string;
  ontario: string;
  
  // Common Form Questions (can be extended)
  howWasYourExperience: string;
  wouldYouRecommend: string;
  additionalComments: string;
  contactInformation: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  age: string;
  gender: string;
  
  // Extended form fields
  visitMonth: string;
  visitYear: string;
  whichHospitalDidYouVisit: string;
  hospitalEngagement: string;
  contactInformationAndDemographics: string;
  areYouPatientOrCaregiver: string;
  whichTypeOfHospitalEncounter: string;
  submitAnonymously: string;
  selectACity: string;
  selectAnOption: string;
  selectAHospital: string;
  
  // Visit types
  outpatientClinicVisit: string;
  emergencyDepartment: string;
  inpatientAdmission: string;
  
  // Patient types
  patientOption: string;
  caregiverOption: string;
  
  // Months
  january: string;
  february: string;
  march: string;
  april: string;
  may: string;
  june: string;
  july: string;
  august: string;
  september: string;
  october: string;
  november: string;
  december: string;
}

export const translations: Record<'en' | 'fr', Translation> = {
  en: {
    // UI Elements
    share: 'Share',
    shareTitle: 'Share this survey',
    submit: 'Submit',
    clearProgress: 'Clear Saved Progress',
    progressSaved: 'Your progress is saved locally and will resume automatically on return.',
    missingInfo: 'Missing information',
    completeFields: 'Please complete the following field',
    completeFieldsPlural: 'Please complete the following fields',
    showAll: 'Show all',
    showLess: 'Show less',
    language: 'Language',
    english: 'English',
    french: 'Français',
    linkCopied: 'Link Copied',
    linkCopiedDesc: 'Survey link copied to clipboard.',
    selectEncounter: 'Please select your hospital encounter type to continue.',
    thankYou: 'Thank you for your feedback!',
    submissionReceived: 'Your submission has been received and will help improve healthcare services.',
    submitAnother: 'Submit Another Response',
    
    // Form Field Labels and Common Terms
    required: 'Required',
    optional: 'Optional',
    pleaseSelect: 'Please select',
    other: 'Other',
    yes: 'Yes',
    no: 'No',
    anonymous: 'Anonymous',
    
    // Hospital/Medical Terms
    hospital: 'Hospital',
    department: 'Department',
    patient: 'Patient',
    caregiver: 'Caregiver',
    visitor: 'Visitor',
    staff: 'Staff',
    doctor: 'Doctor',
    nurse: 'Nurse',
    emergency: 'Emergency',
    outpatient: 'Outpatient',
    inpatient: 'Inpatient',
    appointment: 'Appointment',
    visit: 'Visit',
    treatment: 'Treatment',
    care: 'Care',
    experience: 'Experience',
    feedback: 'Feedback',
    rating: 'Rating',
    excellent: 'Excellent',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
    
    // Time/Date Terms
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This week',
    lastWeek: 'Last week',
    thisMonth: 'This month',
    lastMonth: 'Last month',
    date: 'Date',
    time: 'Time',
    duration: 'Duration',
    hours: 'Hours',
    minutes: 'Minutes',
    days: 'Days',
    
    // Location Terms
    province: 'Province',
    city: 'City',
    ontario: 'Ontario',
    
    // Common Form Questions
    howWasYourExperience: 'How was your experience?',
    wouldYouRecommend: 'Would you recommend this to others?',
    additionalComments: 'Additional comments',
    contactInformation: 'Contact information',
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email',
    phone: 'Phone',
    age: 'Age',
    gender: 'Gender',
    
    // Extended form fields
    visitMonth: 'Visit Month',
    visitYear: 'Visit Year',
    whichHospitalDidYouVisit: 'Which hospital did you visit?',
    hospitalEngagement: 'Hospital Engagement',
    contactInformationAndDemographics: 'Contact Information and Demographics',
    areYouPatientOrCaregiver: 'Are you a patient or a caregiver?',
    whichTypeOfHospitalEncounter: 'Which type of hospital encounter did you have on your most recent visit?',
    submitAnonymously: 'Submit anonymously',
    selectACity: 'Select a city',
    selectAnOption: 'Select an option',
    selectAHospital: 'Select a hospital...',
    
    // Visit types
    outpatientClinicVisit: 'Outpatient clinic visit (in person or virtual)',
    emergencyDepartment: 'Emergency department (in person or virtual)',
    inpatientAdmission: 'Inpatient admission',
    
    // Patient types
    patientOption: 'Patient',
    caregiverOption: 'Caregiver',
    
    // Months
    january: 'January',
    february: 'February',
    march: 'March',
    april: 'April',
    may: 'May',
    june: 'June',
    july: 'July',
    august: 'August',
    september: 'September',
    october: 'October',
    november: 'November',
    december: 'December'
  },
  
  fr: {
    // UI Elements
    share: 'Partager',
    shareTitle: 'Partager ce sondage',
    submit: 'Soumettre',
    clearProgress: 'Effacer les Progrès Sauvegardés',
    progressSaved: 'Vos progrès sont sauvegardés localement et reprendront automatiquement à votre retour.',
    missingInfo: 'Informations manquantes',
    completeFields: 'Veuillez compléter le champ suivant',
    completeFieldsPlural: 'Veuillez compléter les champs suivants',
    showAll: 'Tout afficher',
    showLess: 'Afficher moins',
    language: 'Langue',
    english: 'English',
    french: 'Français',
    linkCopied: 'Lien Copié',
    linkCopiedDesc: 'Le lien du sondage a été copié dans le presse-papiers.',
    selectEncounter: 'Veuillez sélectionner votre type de rencontre hospitalière pour continuer.',
    thankYou: 'Merci pour vos commentaires!',
    submissionReceived: 'Votre soumission a été reçue et aidera à améliorer les services de santé.',
    submitAnother: 'Soumettre une Autre Réponse',
    
    // Form Field Labels and Common Terms
    required: 'Obligatoire',
    optional: 'Optionnel',
    pleaseSelect: 'Veuillez sélectionner',
    other: 'Autre',
    yes: 'Oui',
    no: 'Non',
    anonymous: 'Anonyme',
    
    // Hospital/Medical Terms
    hospital: 'Hôpital',
    department: 'Département',
    patient: 'Patient',
    caregiver: 'Aidant',
    visitor: 'Visiteur',
    staff: 'Personnel',
    doctor: 'Médecin',
    nurse: 'Infirmière',
    emergency: 'Urgence',
    outpatient: 'Ambulatoire',
    inpatient: 'Hospitalisé',
    appointment: 'Rendez-vous',
    visit: 'Visite',
    treatment: 'Traitement',
    care: 'Soins',
    experience: 'Expérience',
    feedback: 'Commentaires',
    rating: 'Évaluation',
    excellent: 'Excellent',
    good: 'Bon',
    fair: 'Acceptable',
    poor: 'Médiocre',
    
    // Time/Date Terms
    today: 'Aujourd\'hui',
    yesterday: 'Hier',
    thisWeek: 'Cette semaine',
    lastWeek: 'La semaine dernière',
    thisMonth: 'Ce mois-ci',
    lastMonth: 'Le mois dernier',
    date: 'Date',
    time: 'Heure',
    duration: 'Durée',
    hours: 'Heures',
    minutes: 'Minutes',
    days: 'Jours',
    
    // Location Terms
    province: 'Province',
    city: 'Ville',
    ontario: 'Ontario',
    
    // Common Form Questions
    howWasYourExperience: 'Comment était votre expérience?',
    wouldYouRecommend: 'Recommanderiez-vous ceci à d\'autres?',
    additionalComments: 'Commentaires supplémentaires',
    contactInformation: 'Informations de contact',
    firstName: 'Prénom',
    lastName: 'Nom de famille',
    email: 'Courriel',
    phone: 'Téléphone',
    age: 'Âge',
    gender: 'Genre',
    
    // Extended form fields
    visitMonth: 'Mois de la visite',
    visitYear: 'Année de la visite',
    whichHospitalDidYouVisit: 'Quel hôpital avez-vous visité?',
    hospitalEngagement: 'Engagement Hospitalier',
    contactInformationAndDemographics: 'Informations de Contact et Démographiques',
    areYouPatientOrCaregiver: 'Êtes-vous un patient ou un aidant?',
    whichTypeOfHospitalEncounter: 'Quel type de rencontre hospitalière avez-vous eu lors de votre visite la plus récente?',
    submitAnonymously: 'Soumettre anonymement',
    selectACity: 'Sélectionnez une ville',
    selectAnOption: 'Sélectionnez une option',
    selectAHospital: 'Sélectionnez un hôpital...',
    
    // Visit types
    outpatientClinicVisit: 'Visite de clinique externe (en personne ou virtuelle)',
    emergencyDepartment: 'Service d\'urgence (en personne ou virtuel)',
    inpatientAdmission: 'Admission en hospitalisation',
    
    // Patient types
    patientOption: 'Patient',
    caregiverOption: 'Aidant',
    
    // Months
    january: 'Janvier',
    february: 'Février',
    march: 'Mars',
    april: 'Avril',
    may: 'Mai',
    june: 'Juin',
    july: 'Juillet',
    august: 'Août',
    september: 'Septembre',
    october: 'Octobre',
    november: 'Novembre',
    december: 'Décembre'
  }
};

// Hook for using translations
export function useTranslation(language: 'en' | 'fr' = 'en'): Translation {
  return translations[language];
}

// Helper function to translate field labels dynamically
export function translateFieldLabel(label: string, language: 'en' | 'fr' = 'en'): string {
  const t = translations[language];
  
  // Common field label mappings
  const labelMappings: Record<string, keyof Translation> = {
    'First Name': 'firstName',
    'First name': 'firstName',
    'Last Name': 'lastName',
    'Last name': 'lastName',
    'Email': 'email',
    'Phone': 'phone',
    'Age': 'age',
    'Gender': 'gender',
    'Hospital': 'hospital',
    'Department': 'department',
    'Province': 'province',
    'City': 'city',
    'Date': 'date',
    'Time': 'time',
    'Duration': 'duration',
    'Rating': 'rating',
    'Experience': 'experience',
    'Feedback': 'feedback',
    'Additional Comments': 'additionalComments',
    'Contact Information': 'contactInformation',
    'Contact Information and Demographics': 'contactInformationAndDemographics',
    'How was your experience?': 'howWasYourExperience',
    'Would you recommend this to others?': 'wouldYouRecommend',
    'Visit Month': 'visitMonth',
    'Visit Year': 'visitYear',
    'Which hospital did you visit?': 'whichHospitalDidYouVisit',
    'Hospital Engagement': 'hospitalEngagement',
    'Are you a patient or a caregiver?': 'areYouPatientOrCaregiver',
    'Which type of hospital encounter did you have on your most recent visit?': 'whichTypeOfHospitalEncounter',
    'Submit anonymously': 'submitAnonymously'
  };
  
  const mappedKey = labelMappings[label];
  if (mappedKey && t[mappedKey]) {
    return t[mappedKey];
  }
  
  // If no mapping found, return original label
  return label;
}

// Helper function to translate option values
export function translateOption(option: string, language: 'en' | 'fr' = 'en'): string {
  const t = translations[language];
  
  const optionMappings: Record<string, keyof Translation> = {
    'Yes': 'yes',
    'No': 'no',
    'Other': 'other',
    'Patient': 'patientOption',
    'Caregiver': 'caregiverOption',
    'Visitor': 'visitor',
    'Staff': 'staff',
    'Doctor': 'doctor',
    'Nurse': 'nurse',
    'Emergency': 'emergency',
    'Outpatient': 'outpatient',
    'Inpatient': 'inpatient',
    'Excellent': 'excellent',
    'Good': 'good',
    'Fair': 'fair',
    'Poor': 'poor',
    'Today': 'today',
    'Yesterday': 'yesterday',
    'This week': 'thisWeek',
    'Last week': 'lastWeek',
    'This month': 'thisMonth',
    'Last month': 'lastMonth',
    'Ontario': 'ontario',
    'Outpatient clinic visit (in person or virtual)': 'outpatientClinicVisit',
    'Emergency department (in person or virtual)': 'emergencyDepartment',
    'Inpatient admission': 'inpatientAdmission',
    'Select an option': 'selectAnOption',
    'Select a city': 'selectACity',
    'Select a hospital...': 'selectAHospital',
    'January': 'january',
    'February': 'february',
    'March': 'march',
    'April': 'april',
    'May': 'may',
    'June': 'june',
    'July': 'july',
    'August': 'august',
    'September': 'september',
    'October': 'october',
    'November': 'november',
    'December': 'december'
  };
  
  const mappedKey = optionMappings[option];
  if (mappedKey && t[mappedKey]) {
    return t[mappedKey];
  }
  
  return option;
}

// Helper function to translate section titles
export function translateSectionTitle(title: string, language: 'en' | 'fr' = 'en'): string {
  const t = translations[language];
  
  const sectionMappings: Record<string, keyof Translation> = {
    'Contact Information and Demographics': 'contactInformationAndDemographics',
    'Hospital Engagement': 'hospitalEngagement'
  };
  
  const mappedKey = sectionMappings[title];
  if (mappedKey && t[mappedKey]) {
    return t[mappedKey];
  }
  
  return title;
}
