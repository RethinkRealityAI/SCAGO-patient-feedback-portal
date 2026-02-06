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

  // Hospital Engagement and Experience
  hospitalExperienceInDetail: string;
  dateOfInteraction: string;
  hospitalNameLabel: string;
  departmentOrService: string;
  clinicianNamesDetails: string;
  yourExperienceLabel: string;
  timelyMedicationsQuestion: string;
  rightInvestigationsQuestion: string;
  pleaseProvideDetails: string;
  timelyMannerQuestion: string;
  pleaseProvideRationale: string;
  concernsAddressedQuestion: string;
  optimalTimeQuestion: string;
  reportedToHospitalQuestion: string;
  reportOutcomeQuestion: string;
  reportNotDoneReasonQuestion: string;
  notAwareOfComplaintProcess: string;
  notComfortable: string;
  ifOtherPleaseSpecify: string;
  anythingElseHospitalInteraction: string;
  npsRatingQuestion: string;
  receptionFirstPerson: string;
  reasonForVisit: string;
  hcpFamiliarityQuestion: string;
  hcpRespectfulnessQuestion: string;
  wasVisitForPainCrisis: string;
  timeToAnalgesiaQuestion: string;
  howLongWasHospitalStay: string;
  howLongWasEdStay: string;
  unitDepartment: string;
  beforeDischargeFollowUpPlan: string;
  advisedFollowUpWithScago: string;
  additionalFeedbackPrompt: string;
  nameOfTriageNurse: string;
  nameOfPhysician: string;
  pleaseElaborate: string;
  experiencedEffectsQuestion: string;

  // Consent and Information Collection Terms
  scagoDigitalConsent: string;
  aboutScago: string;
  consentToParticipate: string;
  informationCollection: string;
  basicInformation: string;
  title: string;
  streetAddress: string;
  postalCode: string;
  yourConnectionToScd: string;
  pleaseSelectAllThatApply: string;
  iHaveSickleCellDisease: string;
  myChildHasSickleCellDisease: string;
  iAmCaregiverOrFamilyMember: string;
  iAmHealthcareProvider: string;
  // other: string; // Duplicate removed
  ifApplicableListNames: string;
  individualName: string;
  dateOfBirth: string;
  careInformation: string;
  whichHospitalsDoYouReceiveCare: string;
  stayConnected: string;
  mayWeContactYou: string;
  preferredMethodOfContact: string;
  // email: string; // Duplicate removed
  phoneTextPhonecall: string;
  either: string;
  wouldYouLikeToJoinMailingList: string;
  wouldYouLikeToJoinSupportGroups: string;
  ifYesHowShouldWeContactYou: string;
  doYouConsentToAdvocacy: string;
  consentAndConfirmation: string;
  byTypingYourNameBelow: string;
  youAre18YearsOrOlder: string;
  youHaveReadAndUnderstood: string;
  youVoluntarilyConsent: string;
  fullNameDigitalSignature: string;
  dateMMDDYYYY: string;
  thankYouForJoiningScago: string;
  memberOfOurTeamWillBeInTouch: string;
  ageConfirmation: string;
  iConfirm18YearsOrOlder: string;
  parentGuardianCompleting: string;
  scagoOffersNonMedicalSupport: string;
  ifYouRequireUrgentMedicalAttention: string;
  thisFormIsForIndividuals18OrOlder: string;
  ifYouAreUnder18: string;
  parentOrGuardianMustComplete: string;
  scagoStoresDataSecurely: string;
  willNeverSharePersonalInformation: string;
  withoutYourConsent: string;
  pleaseDescribe: string;
  ifYouSelectedOtherAbove: string;
  individual1Name: string;
  individual1DateOfBirth: string;
  individual2Name: string;
  individual2DateOfBirth: string;
  individual3Name: string;
  individual3DateOfBirth: string;
  whichHospitalDoYouReceiveCare: string;
  mayWeContactYouAboutScagoServices: string;
  wouldYouLikeToJoinScagoMailingList: string;
  wouldYouLikeToJoinWhatsappSupportGroups: string;
  howShouldWeContactYouAboutSupportGroups: string;
  doYouConsentToScagoStaffAdvocating: string;
  byTypingYourNameBelowYouConfirm: string;
  youAre18YearsOrOlder2: string;
  youHaveReadAndUnderstoodInformation: string;
  youVoluntarilyConsentToScagoCollection: string;
  fullNameDigitalSignature2: string;
  date2: string;
  thankYouForJoiningScagoCommunity: string;
  memberOfOurTeamWillBeInTouchShortly: string;

  // Title options
  mr: string;
  mrs: string;
  ms: string;
  mx: string;
  dr: string;

  // Placeholder texts
  pickADate: string;
  enterEmail: string;
  enterPhoneNumber: string;
  selectProvince: string;
  selectCity: string;
  enterYourName: string;
  typeYourSignatureHere: string;
  signHere: string;
  digitalSignature: string;

  // Visit types
  outpatientClinicVisit: string;
  emergencyDepartment: string;
  inpatientAdmission: string;

  // Common options used in engagement
  notApplicable: string;
  veryFamiliar: string;
  somewhatFamiliar: string;
  notAtAllFamiliar: string;
  veryRespectful: string;
  somewhatRespectful: string;
  neutral: string;
  notRespectful: string;

  // Experience options
  stigmatizationOrStereotyping: string;
  anxiety: string;
  helplessnessOrIsolation: string;
  disrespect: string;
  bullying: string;
  attentiveness: string;
  compassionEmpathy: string;
  understanding: string;

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

  // Board Recruitment
  boardMemberApplication: string;
  commitmentAndUnderstanding: string;
  backgroundAndExperience: string;
  references: string;
  supportingDocuments: string;
  organizationLogo: string;
  boardRecruitmentIntro: string;
  fullName: string;
  primaryPhoneNumber: string;
  emailAddress: string;
  termCommitmentQuestion: string;
  confidentialityAgreementQuestion: string;
  appendixYHeader: string;
  committeeSupportQuestion: string;
  preferredCommitteesQuestion: string;
  boardExperienceDesc: string;
  uploadExperienceDocument: string;
  experienceUploadHelper: string;
  otherOrganizationsQuestion: string;
  provideReferencesQuestion: string;
  reference1: string;
  reference2: string;
  resumeUploadLabel: string;
  advocacy: string;
  fundraising: string;
  programsAndServices: string;
  governance: string;
  enterYourFullName: string;
  phonePlaceholder: string;
  emailPlaceholder: string;
  boardExperiencePlaceholder: string;
  otherOrgsPlaceholder: string;

  // Advanced Fields
  clickToUpload: string;
  orDragAndDrop: string;
  max: string;
  fileSingular: string;
  filePlural: string;
  filesParenthesis: string;
  mbEach: string;
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

    // Hospital Engagement and Experience
    hospitalExperienceInDetail: 'Section 2: Hospital Experience in Detail',
    dateOfInteraction: 'Date of Interaction',
    hospitalNameLabel: 'Hospital Name',
    departmentOrService: 'Department or Service',
    clinicianNamesDetails: 'Name of Physician, Nurse and other clinicians providing optimal or sub-optimal care',
    yourExperienceLabel: 'Your Experience',
    timelyMedicationsQuestion: 'Did you receive timely medications while in the hospital?',
    rightInvestigationsQuestion: 'Did you feel the right investigation/tests were conducted?',
    pleaseProvideDetails: 'Please provide details:',
    timelyMannerQuestion: 'Did you feel you were attended to in a timely manner?',
    pleaseProvideRationale: 'Please provide rationale:',
    concernsAddressedQuestion: 'Did you feel your concerns were well addressed?',
    optimalTimeQuestion: 'Did you feel that you had an optimal amount of time?',
    reportedToHospitalQuestion: 'Did you report this situation to the hospital?',
    reportOutcomeQuestion: 'If “Yes”, what was the outcome of your report?',
    reportNotDoneReasonQuestion: 'If “No”, why not?',
    notAwareOfComplaintProcess: 'Not aware of complaint process',
    notComfortable: 'Not comfortable',
    ifOtherPleaseSpecify: 'If other, please specify:',
    anythingElseHospitalInteraction: 'Is there anything else you would like us to know about this hospital interaction?',
    npsRatingQuestion: 'On a scale of 1-10, what would you rate the quality of care you received?',
    receptionFirstPerson: 'Reception with the first person encountered',
    reasonForVisit: 'Reason for this visit (e.g., pain, fever, surgery, regular visit)',
    hcpFamiliarityQuestion: 'How familiar were the health care providers (HCP) with your condition?',
    hcpRespectfulnessQuestion: 'How respectful were the HCPs of your needs and concerns?',
    wasVisitForPainCrisis: 'Was this visit for a pain crisis?',
    timeToAnalgesiaQuestion: 'If pain crisis, how long before the first analgesia was administered?',
    howLongWasHospitalStay: 'How long was your hospital stay?',
    howLongWasEdStay: 'How long was your emergency department stay?',
    unitDepartment: 'Unit/department',
    beforeDischargeFollowUpPlan: 'Before being discharged, were you provided with any follow-up plan?',
    advisedFollowUpWithScago: 'Were you advised to follow up with SCAGO after being discharged?',
    additionalFeedbackPrompt: 'Anything else you might want to add in your own words?',
    nameOfTriageNurse: 'Name of Triage Nurse',
    nameOfPhysician: 'Name of Physician',
    pleaseElaborate: 'Please elaborate:',
    experiencedEffectsQuestion: 'Did you experience any of the following as a result of seeking treatment during this interaction? (Select all that apply)',

    // Visit types
    outpatientClinicVisit: 'Outpatient clinic visit (in person or virtual)',
    emergencyDepartment: 'Emergency department (in person or virtual)',
    inpatientAdmission: 'Inpatient admission',

    // Common options used in engagement
    notApplicable: 'Not Applicable',
    veryFamiliar: 'Very Familiar',
    somewhatFamiliar: 'Somewhat Familiar',
    notAtAllFamiliar: 'Not at all Familiar',
    veryRespectful: 'Very respectful',
    somewhatRespectful: 'Somewhat respectful',
    neutral: 'Neutral',
    notRespectful: 'Not respectful',

    // Experience options
    stigmatizationOrStereotyping: 'Stigmatization or stereotyping',
    anxiety: 'Anxiety',
    helplessnessOrIsolation: 'Helplessness or Isolation',
    disrespect: 'Disrespect',
    bullying: 'Bullying',
    attentiveness: 'Attentiveness',
    compassionEmpathy: 'Compassion/empathy',
    understanding: 'Understanding',

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
    december: 'December',

    // Consent and Information Collection Terms
    scagoDigitalConsent: 'SCAGO Digital Consent & Information Collection',
    aboutScago: 'About SCAGO',
    consentToParticipate: 'Consent to Participate & Information Collection',
    informationCollection: 'Information Collection',
    basicInformation: 'Basic Information',
    title: 'Title',
    streetAddress: 'Street Address',
    postalCode: 'Postal Code',
    yourConnectionToScd: 'Your Connection to Sickle Cell Disease',
    pleaseSelectAllThatApply: 'Please select all that apply',
    iHaveSickleCellDisease: 'I have sickle cell disease',
    myChildHasSickleCellDisease: 'My child has sickle cell disease',
    iAmCaregiverOrFamilyMember: 'I am a caregiver or family member',
    iAmHealthcareProvider: 'I am a healthcare provider',
    // Removed duplicate 'other'
    ifApplicableListNames: 'If applicable, list the names and birthdates of individuals with SCD in your household',
    individualName: 'Name',
    dateOfBirth: 'Date of Birth',
    careInformation: 'Care Information',
    whichHospitalsDoYouReceiveCare: 'Which hospital(s) do you/your child primarily receive care from for SCD?',
    stayConnected: 'Stay Connected',
    mayWeContactYou: 'May we contact you about SCAGO services, programs, or events?',
    preferredMethodOfContact: 'Preferred method of contact',
    // Removed duplicate 'email'
    phoneTextPhonecall: 'Phone (Text/Phone call)',
    either: 'Either',
    wouldYouLikeToJoinMailingList: 'Would you like to join SCAGO\'s mailing list for updates, newsletters, and advocacy news?',
    wouldYouLikeToJoinSupportGroups: 'Would you like to join our WhatsApp or face-to-face support groups?',
    ifYesHowShouldWeContactYou: 'If yes, how should we contact you?',
    doYouConsentToAdvocacy: 'Do you consent to a SCAGO staff member or Patient Well-Being Coordinator advocating on your behalf when requested?',
    consentAndConfirmation: 'Consent and Confirmation',
    byTypingYourNameBelow: 'By typing your name below, you confirm that:',
    youAre18YearsOrOlder: 'You are 18 years or older',
    youHaveReadAndUnderstood: 'You have read and understood the information provided above',
    youVoluntarilyConsent: 'You voluntarily consent to SCAGO\'s collection and use of your information as described',
    fullNameDigitalSignature: 'Full Name (Digital Signature)',
    dateMMDDYYYY: 'Date (MM-DD-YYYY)',
    thankYouForJoiningScago: 'Thank you for joining the SCAGO community! A member of our team will be in touch shortly.',
    memberOfOurTeamWillBeInTouch: 'A member of our team will be in touch shortly.',
    ageConfirmation: 'I confirm that I am 18 years of age or older, OR I am a parent/guardian completing this form on behalf of someone under 18',
    iConfirm18YearsOrOlder: 'I confirm that I am 18 years of age or older',
    parentGuardianCompleting: 'I am a parent/guardian completing this form on behalf of someone under 18',
    scagoOffersNonMedicalSupport: 'SCAGO offers non-medical support services only',
    ifYouRequireUrgentMedicalAttention: 'If you require urgent medical attention, please contact your healthcare provider or call 911',
    thisFormIsForIndividuals18OrOlder: 'This form is for individuals aged 18 or older',
    ifYouAreUnder18: 'If you are under 18',
    parentOrGuardianMustComplete: 'a parent or guardian must complete this form on your behalf',
    scagoStoresDataSecurely: 'SCAGO stores all data securely',
    willNeverSharePersonalInformation: 'will never share your personal information with third parties',
    withoutYourConsent: 'without your consent',
    pleaseDescribe: 'Please describe',
    ifYouSelectedOtherAbove: 'If you selected "Other" above, please describe',
    individual1Name: 'Individual 1 - Name',
    individual1DateOfBirth: 'Individual 1 - Date of Birth',
    individual2Name: 'Individual 2 - Name',
    individual2DateOfBirth: 'Individual 2 - Date of Birth',
    individual3Name: 'Individual 3 - Name',
    individual3DateOfBirth: 'Individual 3 - Date of Birth',
    whichHospitalDoYouReceiveCare: 'Which hospital(s) do you/your child primarily receive care from for SCD?',
    mayWeContactYouAboutScagoServices: 'May we contact you about SCAGO services, programs, or events?',
    wouldYouLikeToJoinScagoMailingList: 'Would you like to join SCAGO\'s mailing list for updates, newsletters, and advocacy news?',
    wouldYouLikeToJoinWhatsappSupportGroups: 'Would you like to join our WhatsApp or face-to-face support groups?',
    howShouldWeContactYouAboutSupportGroups: 'How should we contact you about support groups?',
    doYouConsentToScagoStaffAdvocating: 'Do you consent to a SCAGO staff member or Patient Well-Being Coordinator advocating on your behalf when requested?',
    byTypingYourNameBelowYouConfirm: 'By typing your name below, you confirm that:',
    youAre18YearsOrOlder2: 'You are 18 years or older',
    youHaveReadAndUnderstoodInformation: 'You have read and understood the information provided above',
    youVoluntarilyConsentToScagoCollection: 'You voluntarily consent to SCAGO\'s collection and use of your information as described',
    fullNameDigitalSignature2: 'Full Name (Digital Signature)',
    date2: 'Date',
    thankYouForJoiningScagoCommunity: 'Thank you for joining the SCAGO community!',
    memberOfOurTeamWillBeInTouchShortly: 'A member of our team will be in touch shortly.',

    // Title options
    mr: 'Mr',
    mrs: 'Mrs',
    ms: 'Ms',
    mx: 'Mx',
    dr: 'Dr',

    // Placeholder texts
    pickADate: 'Pick a date',
    enterEmail: 'Enter email address',
    enterPhoneNumber: 'Enter phone number',
    selectProvince: 'Select province',
    selectCity: 'Select city',
    enterYourName: 'Enter your name',
    typeYourSignatureHere: 'Type your signature here',
    signHere: 'Sign here',
    digitalSignature: 'Digital Signature',

    // Board Recruitment
    boardMemberApplication: 'Board Member Application',
    commitmentAndUnderstanding: 'Commitment and Understanding',
    backgroundAndExperience: 'Background and Experience',
    references: 'References',
    supportingDocuments: 'Supporting Documents',
    organizationLogo: 'Organization Logo',
    boardRecruitmentIntro: "Thank you for your interest in the Sickle Cell Awareness Group of Ontario (SCAGO). We are looking for individuals who are passionate about our mission and willing to contribute their skills and experience to our board. Please complete this form to apply for a position on our Board of Directors.",
    fullName: 'Full Name',
    primaryPhoneNumber: 'Primary Phone Number',
    emailAddress: 'Email Address',
    termCommitmentQuestion: 'The Term is for 3 years and there are approximately 4 meetings per year. Are you able to make this commitment?',
    confidentialityAgreementQuestion: 'Successful candidates will be asked to sign a Confidentiality Agreement and a Conflict of Interest statement. Are you willing to do this?',
    appendixYHeader: 'Appendix Y - Committee Support',
    committeeSupportQuestion: 'Are you interested in supporting a specific SCAGO committee if not selected for the board?',
    preferredCommitteesQuestion: 'If yes, which committees are you interested in?',
    boardExperienceDesc: 'Please describe your board experience or attach a separate sheet:',
    uploadExperienceDocument: 'Upload Experience Document (Optional)',
    experienceUploadHelper: 'You can upload a separate sheet describing your experience.',
    otherOrganizationsQuestion: 'What other organizations do you currently serve on?',
    provideReferencesQuestion: 'Please provide two references we may contact:',
    reference1: 'Reference 1',
    reference2: 'Reference 2',
    resumeUploadLabel: 'Please forward your resume to recruitment@sicklecellanemia.ca or upload it here:',
    advocacy: 'Advocacy',
    fundraising: 'Fundraising',
    programsAndServices: 'Programs & Services',
    governance: 'Governance',
    enterYourFullName: 'Enter your full name',
    phonePlaceholder: '(555) 555-5555',
    emailPlaceholder: 'name@example.com',
    boardExperiencePlaceholder: 'Describe your previous experience serving on boards...',
    otherOrgsPlaceholder: 'List other organizations...',

    // Advanced Fields
    clickToUpload: 'Click to upload',
    orDragAndDrop: 'or drag and drop',
    max: 'Max',
    fileSingular: 'file',
    filePlural: 'files',
    filesParenthesis: 'files)',
    mbEach: 'MB each'
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

    // Hospital Engagement and Experience
    hospitalExperienceInDetail: 'Section 2 : Expérience hospitalière en détail',
    dateOfInteraction: 'Date de l’interaction',
    hospitalNameLabel: 'Nom de l’hôpital',
    departmentOrService: 'Département ou service',
    clinicianNamesDetails: 'Nom du médecin, de l’infirmière et des autres cliniciens offrant des soins optimaux ou sous-optimaux',
    yourExperienceLabel: 'Votre expérience',
    timelyMedicationsQuestion: 'Avez-vous reçu vos médicaments en temps opportun à l’hôpital ?',
    rightInvestigationsQuestion: 'Pensez-vous que les bonnes investigations/tests ont été effectués ?',
    pleaseProvideDetails: 'Veuillez fournir des détails :',
    timelyMannerQuestion: 'Avez-vous le sentiment d’avoir été pris(e) en charge en temps opportun ?',
    pleaseProvideRationale: 'Veuillez fournir la raison :',
    concernsAddressedQuestion: 'Avez-vous le sentiment que vos préoccupations ont été bien prises en compte ?',
    optimalTimeQuestion: 'Avez-vous l’impression d’avoir eu un temps suffisant ?',
    reportedToHospitalQuestion: 'Avez-vous rapporté cette situation à l’hôpital ?',
    reportOutcomeQuestion: 'Si « Oui », quel a été le résultat de votre signalement ?',
    reportNotDoneReasonQuestion: 'Si « Non », pourquoi ?',
    notAwareOfComplaintProcess: 'Non informé(e) du processus de plainte',
    notComfortable: 'Pas à l’aise',
    ifOtherPleaseSpecify: 'Si autre, veuillez préciser :',
    anythingElseHospitalInteraction: 'Souhaitez-vous ajouter autre chose au sujet de cette interaction à l’hôpital ?',
    npsRatingQuestion: 'Sur une échelle de 1 à 10, quelle note donneriez-vous à la qualité des soins reçus ?',
    receptionFirstPerson: 'Accueil avec la première personne rencontrée',
    reasonForVisit: 'Raison de cette visite (p. ex., douleur, fièvre, chirurgie, visite de routine)',
    hcpFamiliarityQuestion: 'Dans quelle mesure les professionnels de la santé connaissaient-ils votre condition ?',
    hcpRespectfulnessQuestion: 'Dans quelle mesure les professionnels ont-ils respecté vos besoins et préoccupations ?',
    wasVisitForPainCrisis: 'S’agissait-il d’une visite pour une crise douloureuse ?',
    timeToAnalgesiaQuestion: 'En cas de crise douloureuse, combien de temps avant la première analgésie ?',
    howLongWasHospitalStay: 'Quelle a été la durée de votre hospitalisation ?',
    howLongWasEdStay: 'Quelle a été la durée de votre séjour à l’urgence ?',
    unitDepartment: 'Unité/département',
    beforeDischargeFollowUpPlan: 'Avant votre congé, vous a-t-on fourni un plan de suivi ?',
    advisedFollowUpWithScago: 'Vous a-t-on conseillé de faire un suivi avec SCAGO après votre congé ?',
    additionalFeedbackPrompt: 'Autre chose à ajouter avec vos propres mots ?',
    nameOfTriageNurse: 'Nom de l’infirmier(ère) au triage',
    nameOfPhysician: 'Nom du médecin',
    pleaseElaborate: 'Veuillez préciser :',
    experiencedEffectsQuestion: 'Avez-vous vécu l’un des éléments suivants à la suite de cette interaction pour obtenir des soins? (Sélectionnez tout ce qui s’applique)',

    // Visit types
    outpatientClinicVisit: 'Visite de clinique externe (en personne ou virtuelle)',
    emergencyDepartment: 'Service d\'urgence (en personne ou virtuel)',
    inpatientAdmission: 'Admission en hospitalisation',

    // Common options used in engagement
    notApplicable: 'Non applicable',
    veryFamiliar: 'Très familier',
    somewhatFamiliar: 'Assez familier',
    notAtAllFamiliar: 'Pas du tout familier',
    veryRespectful: 'Très respectueux',
    somewhatRespectful: 'Assez respectueux',
    neutral: 'Neutre',
    notRespectful: 'Pas respectueux',

    // Experience options
    stigmatizationOrStereotyping: 'Stigmatisation ou stéréotypage',
    anxiety: 'Anxiété',
    helplessnessOrIsolation: 'Sentiment d\'impuissance ou d\'isolement',
    disrespect: 'Manque de respect',
    bullying: 'Intimidation',
    attentiveness: 'Attention',
    compassionEmpathy: 'Compassion/empathie',
    understanding: 'Compréhension',

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
    december: 'Décembre',

    // Consent and Information Collection Terms
    scagoDigitalConsent: 'Consentement Numérique et Collecte d\'Informations SCAGO',
    aboutScago: 'À propos de SCAGO',
    consentToParticipate: 'Consentement à Participer et Collecte d\'Informations',
    informationCollection: 'Collecte d\'Informations',
    basicInformation: 'Informations de Base',
    title: 'Titre',
    streetAddress: 'Adresse',
    postalCode: 'Code Postal',
    yourConnectionToScd: 'Votre Lien avec la Drépanocytose',
    pleaseSelectAllThatApply: 'Veuillez sélectionner tout ce qui s\'applique',
    iHaveSickleCellDisease: 'J\'ai la drépanocytose',
    myChildHasSickleCellDisease: 'Mon enfant a la drépanocytose',
    iAmCaregiverOrFamilyMember: 'Je suis un aidant ou un membre de la famille',
    iAmHealthcareProvider: 'Je suis un professionnel de la santé',
    // other: 'Autre', // Duplicate removed
    ifApplicableListNames: 'Si applicable, listez les noms et dates de naissance des personnes atteintes de drépanocytose dans votre foyer',
    individualName: 'Nom',
    dateOfBirth: 'Date de Naissance',
    careInformation: 'Informations de Soins',
    whichHospitalsDoYouReceiveCare: 'Dans quel(s) hôpital(s) recevez-vous/votre enfant recevez-vous principalement des soins pour la drépanocytose?',
    stayConnected: 'Restez Connecté',
    mayWeContactYou: 'Pouvons-nous vous contacter au sujet des services, programmes ou événements de SCAGO?',
    preferredMethodOfContact: 'Méthode de contact préférée',
    // email: 'Courriel', // Duplicate removed
    phoneTextPhonecall: 'Téléphone (SMS/Appel)',
    either: 'L\'un ou l\'autre',
    wouldYouLikeToJoinMailingList: 'Aimeriez-vous vous inscrire à la liste de diffusion de SCAGO pour les mises à jour, bulletins et nouvelles de plaidoyer?',
    wouldYouLikeToJoinSupportGroups: 'Aimeriez-vous rejoindre nos groupes de soutien WhatsApp ou en personne?',
    ifYesHowShouldWeContactYou: 'Si oui, comment devrions-nous vous contacter?',
    doYouConsentToAdvocacy: 'Consentez-vous à ce qu\'un membre du personnel de SCAGO ou un coordinateur du bien-être des patients plaide en votre nom lorsque demandé?',
    consentAndConfirmation: 'Consentement et Confirmation',
    byTypingYourNameBelow: 'En tapant votre nom ci-dessous, vous confirmez que:',
    youAre18YearsOrOlder: 'Vous avez 18 ans ou plus',
    youHaveReadAndUnderstood: 'Vous avez lu et compris les informations fournies ci-dessus',
    youVoluntarilyConsent: 'Vous consentez volontairement à la collecte et à l\'utilisation de vos informations par SCAGO comme décrit',
    fullNameDigitalSignature: 'Nom Complet (Signature Numérique)',
    dateMMDDYYYY: 'Date (MM-JJ-AAAA)',
    thankYouForJoiningScago: 'Merci de rejoindre la communauté SCAGO! Un membre de notre équipe vous contactera sous peu.',
    memberOfOurTeamWillBeInTouch: 'Un membre de notre équipe vous contactera sous peu.',
    ageConfirmation: 'Je confirme que j\'ai 18 ans ou plus, OU je suis un parent/tuteur complétant ce formulaire au nom de quelqu\'un de moins de 18 ans',
    iConfirm18YearsOrOlder: 'Je confirme que j\'ai 18 ans ou plus',
    parentGuardianCompleting: 'Je suis un parent/tuteur complétant ce formulaire au nom de quelqu\'un de moins de 18 ans',
    scagoOffersNonMedicalSupport: 'SCAGO offre uniquement des services de soutien non médicaux',
    ifYouRequireUrgentMedicalAttention: 'Si vous avez besoin d\'une attention médicale urgente, veuillez contacter votre fournisseur de soins de santé ou appeler le 911',
    thisFormIsForIndividuals18OrOlder: 'Ce formulaire est destiné aux personnes de 18 ans ou plus',
    ifYouAreUnder18: 'Si vous avez moins de 18 ans',
    parentOrGuardianMustComplete: 'un parent ou tuteur doit compléter ce formulaire en votre nom',
    scagoStoresDataSecurely: 'SCAGO stocke toutes les données de manière sécurisée',
    willNeverSharePersonalInformation: 'ne partagera jamais vos informations personnelles avec des tiers',
    withoutYourConsent: 'sans votre consentement',
    pleaseDescribe: 'Veuillez décrire',
    ifYouSelectedOtherAbove: 'Si vous avez sélectionné "Autre" ci-dessus, veuillez décrire',
    individual1Name: 'Personne 1 - Nom',
    individual1DateOfBirth: 'Personne 1 - Date de Naissance',
    individual2Name: 'Personne 2 - Nom',
    individual2DateOfBirth: 'Personne 2 - Date de Naissance',
    individual3Name: 'Personne 3 - Nom',
    individual3DateOfBirth: 'Personne 3 - Date de Naissance',
    whichHospitalDoYouReceiveCare: 'Dans quel(s) hôpital(s) recevez-vous/votre enfant recevez-vous principalement des soins pour la drépanocytose?',
    mayWeContactYouAboutScagoServices: 'Pouvons-nous vous contacter au sujet des services, programmes ou événements de SCAGO?',
    wouldYouLikeToJoinScagoMailingList: 'Aimeriez-vous vous inscrire à la liste de diffusion de SCAGO pour les mises à jour, bulletins et nouvelles de plaidoyer?',
    wouldYouLikeToJoinWhatsappSupportGroups: 'Aimeriez-vous rejoindre nos groupes de soutien WhatsApp ou en personne?',
    howShouldWeContactYouAboutSupportGroups: 'Comment devrions-nous vous contacter au sujet des groupes de soutien?',
    doYouConsentToScagoStaffAdvocating: 'Consentez-vous à ce qu\'un membre du personnel de SCAGO ou un coordinateur du bien-être des patients plaide en votre nom lorsque demandé?',
    byTypingYourNameBelowYouConfirm: 'En tapant votre nom ci-dessous, vous confirmez que:',
    youAre18YearsOrOlder2: 'Vous avez 18 ans ou plus',
    youHaveReadAndUnderstoodInformation: 'Vous avez lu et compris les informations fournies ci-dessus',
    youVoluntarilyConsentToScagoCollection: 'Vous consentez volontairement à la collecte et à l\'utilisation de vos informations par SCAGO comme décrit',
    fullNameDigitalSignature2: 'Nom Complet (Signature Numérique)',
    date2: 'Date',
    thankYouForJoiningScagoCommunity: 'Merci de rejoindre la communauté SCAGO!',
    memberOfOurTeamWillBeInTouchShortly: 'Un membre de notre équipe vous contactera sous peu.',

    // Title options
    mr: 'M.',
    mrs: 'Mme',
    ms: 'Mlle',
    mx: 'Mx',
    dr: 'Dr',

    // Placeholder texts
    pickADate: 'Choisir une date',
    enterEmail: 'Entrez l\'adresse courriel',
    enterPhoneNumber: 'Entrez le numéro de téléphone',
    selectProvince: 'Sélectionnez une province',
    selectCity: 'Sélectionnez une ville',
    enterYourName: 'Entrez votre nom',
    typeYourSignatureHere: 'Tapez votre signature ici',
    signHere: 'Signez ici',
    digitalSignature: 'Signature Numérique',

    // Board Recruitment
    boardMemberApplication: 'Candidature de Membre du Conseil',
    commitmentAndUnderstanding: 'Engagement et Compréhension',
    backgroundAndExperience: 'Antécédents et Expérience',
    references: 'Références',
    supportingDocuments: 'Documents Justificatifs',
    organizationLogo: 'Logo de l\'Organisation',
    boardRecruitmentIntro: "Merci de votre intérêt pour le Sickle Cell Awareness Group of Ontario (SCAGO). Nous recherchons des personnes passionnées par notre mission et prêtes à mettre leurs compétences et leur expérience au service de notre conseil. Veuillez remplir ce formulaire pour postuler à un poste au sein de notre conseil d'administration.",
    fullName: 'Nom Complet',
    primaryPhoneNumber: 'Numéro de Téléphone Principal',
    emailAddress: 'Adresse Courriel',
    termCommitmentQuestion: 'Le mandat est de 3 ans et il y a environ 4 réunions par an. Êtes-vous capable de prendre cet engagement?',
    confidentialityAgreementQuestion: 'Les candidats retenus devront signer une entente de confidentialité et une déclaration de conflit d\'intérêts. Êtes-vous prêt à le faire?',
    appendixYHeader: 'Annexe Y - Soutien aux Comités',
    committeeSupportQuestion: 'Êtes-vous intéressé à soutenir un comité spécifique de SCAGO si vous n\'êtes pas sélectionné pour le conseil?',
    preferredCommitteesQuestion: 'Si oui, quels comités vous intéressent?',
    boardExperienceDesc: 'Veuillez décrire votre expérience au sein de conseils ou joindre une feuille séparée:',
    uploadExperienceDocument: 'Télécharger le Document d\'Expérience (Optionnel)',
    experienceUploadHelper: 'Vous pouvez télécharger une feuille séparée décrivant votre expérience.',
    otherOrganizationsQuestion: 'Dans quelles autres organisations servez-vous actuellement?',
    provideReferencesQuestion: 'Veuillez fournir deux références que nous pouvons contacter:',
    reference1: 'Référence 1',
    reference2: 'Référence 2',
    resumeUploadLabel: 'Veuillez envoyer votre CV à recruitment@sicklecellanemia.ca ou le télécharger ici:',
    advocacy: 'Plaidoyer',
    fundraising: 'Collecte de Fonds',
    programsAndServices: 'Programmes et Services',
    governance: 'Gouvernance',
    enterYourFullName: 'Entrez votre nom complet',
    phonePlaceholder: '(555) 555-5555',
    emailPlaceholder: 'nom@exemple.com',
    boardExperiencePlaceholder: 'Décrivez votre expérience antérieure au sein de conseils...',
    otherOrgsPlaceholder: 'Listez les autres organisations...',

    // Advanced Fields
    clickToUpload: 'Cliquez pour télécharger',
    orDragAndDrop: 'ou glisser-déposer',
    max: 'Max',
    fileSingular: 'fichier',
    filePlural: 'fichiers',
    filesParenthesis: 'fichiers)',
    mbEach: 'Mo chacun'
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
    'Submit anonymously': 'submitAnonymously',
    // Hospital Engagement and Experience labels
    'Section 2: Hospital Experience in Detail': 'hospitalExperienceInDetail',
    'Date of Interaction': 'dateOfInteraction',
    'Hospital Name': 'hospitalNameLabel',
    'Department or Service': 'departmentOrService',
    'Name of Physician, Nurse and other clinicians providing optimal or sub-optimal care': 'clinicianNamesDetails',
    'Your Experience': 'yourExperienceLabel',
    'Did you receive timely medications while in the hospital?': 'timelyMedicationsQuestion',
    'Did you feel the right investigation/tests were conducted?': 'rightInvestigationsQuestion',
    'Please provide details:': 'pleaseProvideDetails',
    'Did you feel you were attended to in a timely manner?': 'timelyMannerQuestion',
    'Please provide rationale:': 'pleaseProvideRationale',
    'Did you feel your concerns were well addressed?': 'concernsAddressedQuestion',
    'Did you feel that you had an optimal amount of time?': 'optimalTimeQuestion',
    'Did you report this situation to the hospital?': 'reportedToHospitalQuestion',
    'If “Yes”, what was the outcome of your report?': 'reportOutcomeQuestion',
    'If “No”, why not?': 'reportNotDoneReasonQuestion',
    'If other, please specify:': 'ifOtherPleaseSpecify',
    'Is there anything else you would like us to know about this hospital interaction?': 'anythingElseHospitalInteraction',
    'Is there anything else would you like us to know about this hospital interaction?': 'anythingElseHospitalInteraction',
    'On a scale of 1-10, what would you rate the quality of care you received?': 'npsRatingQuestion',
    'Reception with the first person encountered': 'receptionFirstPerson',
    'Reception with the first person encountered (e.g., Triage Nurse)': 'receptionFirstPerson',
    'Reason for this visit (e.g., pain, fever, surgery, regular visit)': 'reasonForVisit',
    'Reason for this visit? (e.g., fever, surgery, if other please specify)': 'reasonForVisit',
    'How familiar were the health care providers (HCP) with your condition?': 'hcpFamiliarityQuestion',
    'How respectful were the HCPs of your needs and concerns?': 'hcpRespectfulnessQuestion',
    'Was this visit for a pain crisis?': 'wasVisitForPainCrisis',
    'If pain crisis, how long before the first analgesia was administered?': 'timeToAnalgesiaQuestion',
    'How long was your hospital stay?': 'howLongWasHospitalStay',
    'How long was your emergency department stay?': 'howLongWasEdStay',
    'Unit/department': 'unitDepartment',
    'Before being discharged, were you provided with any follow-up plan?': 'beforeDischargeFollowUpPlan',
    'Were you advised to follow up with SCAGO after being discharged?': 'advisedFollowUpWithScago',
    'Anything else you might want to add in your own words?': 'additionalFeedbackPrompt',
    'Name of Triage Nurse': 'nameOfTriageNurse',
    'Name of Physician': 'nameOfPhysician',
    'Please elaborate:': 'pleaseElaborate',
    'Which type of hospital encounter did you have on your most recent visit? (Select all that apply)': 'whichTypeOfHospitalEncounter',
    // Consent form labels
    'Title': 'title',
    'Street Address': 'streetAddress',
    'Postal Code': 'postalCode',
    'Your Connection to Sickle Cell Disease': 'yourConnectionToScd',
    'Please select all that apply': 'pleaseSelectAllThatApply',
    'I have sickle cell disease': 'iHaveSickleCellDisease',
    'My child has sickle cell disease': 'myChildHasSickleCellDisease',
    'I am a caregiver or family member': 'iAmCaregiverOrFamilyMember',
    'I am a healthcare provider': 'iAmHealthcareProvider',
    'Other': 'other',
    'If applicable, list the names and birthdates of individuals with SCD in your household': 'ifApplicableListNames',
    'Name': 'individualName',
    'Date of Birth': 'dateOfBirth',
    'Care Information': 'careInformation',
    'Which hospital(s) do you/your child primarily receive care from for SCD?': 'whichHospitalsDoYouReceiveCare',
    'Stay Connected': 'stayConnected',
    'May we contact you about SCAGO services, programs, or events?': 'mayWeContactYou',
    'Preferred method of contact': 'preferredMethodOfContact',
    // 'Email': 'email', // Duplicate removed
    'Phone (Text/Phone call)': 'phoneTextPhonecall',
    'Either': 'either',
    'Would you like to join SCAGO\'s mailing list for updates, newsletters, and advocacy news?': 'wouldYouLikeToJoinMailingList',
    'Would you like to join our WhatsApp or face-to-face support groups?': 'wouldYouLikeToJoinSupportGroups',
    'If yes, how should we contact you?': 'ifYesHowShouldWeContactYou',
    'Do you consent to a SCAGO staff member or Patient Well-Being Coordinator advocating on your behalf when requested?': 'doYouConsentToAdvocacy',
    'Consent and Confirmation': 'consentAndConfirmation',
    'Full Name (Digital Signature)': 'fullNameDigitalSignature',
    'Date (MM-DD-YYYY)': 'dateMMDDYYYY',
    'I confirm that I am 18 years of age or older, OR I am a parent/guardian completing this form on behalf of someone under 18': 'ageConfirmation',
    'I confirm that I am 18 years of age or older': 'iConfirm18YearsOrOlder',
    'I am a parent/guardian completing this form on behalf of someone under 18': 'parentGuardianCompleting',
    'If you selected "Other" above, please describe': 'ifYouSelectedOtherAbove',
    'Individual 1 - Name': 'individual1Name',
    'Individual 1 - Date of Birth': 'individual1DateOfBirth',
    'Individual 2 - Name': 'individual2Name',
    'Individual 2 - Date of Birth': 'individual2DateOfBirth',
    'Individual 3 - Name': 'individual3Name',
    'Individual 3 - Date of Birth': 'individual3DateOfBirth',
    'How should we contact you about support groups?': 'howShouldWeContactYouAboutSupportGroups',
    // 'Do you consent to a SCAGO staff member or Patient Well-Being Coordinator advocating on your behalf when requested?': 'doYouConsentToScagoStaffAdvocating' // Duplicate removed

    // Board Recruitment
    'Organization Logo': 'organizationLogo',
    "Thank you for your interest in the Sickle Cell Awareness Group of Ontario (SCAGO). We are looking for individuals who are passionate about our mission and willing to contribute their skills and experience to our board. Please complete this form to apply for a position on our Board of Directors.": 'boardRecruitmentIntro',
    'Full Name': 'fullName',
    'Primary Phone Number': 'primaryPhoneNumber',
    'Email Address': 'emailAddress',
    'The Term is for 3 years and there are approximately 4 meetings per year. Are you able to make this commitment?': 'termCommitmentQuestion',
    'Successful candidates will be asked to sign a Confidentiality Agreement and a Conflict of Interest statement. Are you willing to do this?': 'confidentialityAgreementQuestion',
    'Appendix Y - Committee Support': 'appendixYHeader',
    'Are you interested in supporting a specific SCAGO committee if not selected for the board?': 'committeeSupportQuestion',
    'If yes, which committees are you interested in?': 'preferredCommitteesQuestion',
    'Please describe your board experience or attach a separate sheet:': 'boardExperienceDesc',
    'Upload Experience Document (Optional)': 'uploadExperienceDocument',
    'You can upload a separate sheet describing your experience.': 'experienceUploadHelper',
    'What other organizations do you currently serve on?': 'otherOrganizationsQuestion',
    'Please provide two references we may contact:': 'provideReferencesQuestion',
    'Reference 1': 'reference1',
    'Reference 2': 'reference2',
    'Please forward your resume to recruitment@sicklecellanemia.ca or upload it here:': 'resumeUploadLabel',

    // Advanced Fields Strings
    'Click to upload': 'clickToUpload',
    'or drag and drop': 'orDragAndDrop',
    'Max': 'max',
    'file': 'fileSingular',
    'files': 'filePlural',
    'files)': 'filesParenthesis',
    'MB each': 'mbEach'
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
    'Not Applicable': 'notApplicable',
    'Very Familiar': 'veryFamiliar',
    'Somewhat Familiar': 'somewhatFamiliar',
    'Not at all Familiar': 'notAtAllFamiliar',
    'Not aware of complaint process': 'notAwareOfComplaintProcess',
    'Not comfortable': 'notComfortable',
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
    'Outpatient clinic visit': 'outpatientClinicVisit',
    'Emergency department (in person or virtual)': 'emergencyDepartment',
    'Emergency department': 'emergencyDepartment',
    'Inpatient admission': 'inpatientAdmission',
    'Very respectful': 'veryRespectful',
    'Somewhat respectful': 'somewhatRespectful',
    'Neutral': 'neutral',
    'Not respectful': 'notRespectful',
    'Stigmatization or stereotyping': 'stigmatizationOrStereotyping',
    'Anxiety': 'anxiety',
    'Helplessness or Isolation': 'helplessnessOrIsolation',
    'Disrespect': 'disrespect',
    'Bullying': 'bullying',
    'Attentiveness': 'attentiveness',
    'Compassion/empathy': 'compassionEmpathy',
    'Understanding': 'understanding',
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
    'December': 'december',
    // Consent form options
    'Mr': 'mr',
    'Mrs': 'mrs',
    'Ms': 'ms',
    'Mx': 'mx',
    'Dr': 'dr',
    'I have sickle cell disease': 'iHaveSickleCellDisease',
    'My child has sickle cell disease': 'myChildHasSickleCellDisease',
    'I am a caregiver or family member': 'iAmCaregiverOrFamilyMember',
    'I am a healthcare provider': 'iAmHealthcareProvider',
    'Email': 'email',
    'Phone (Text/Phone call)': 'phoneTextPhonecall',
    'Either': 'either',
    'Advocacy': 'advocacy',
    'Fundraising': 'fundraising',
    'Programs & Services': 'programsAndServices',
    'Governance': 'governance',
    'Name': 'individualName', // Reusing individualName for generic 'Name'
    'Contact Information': 'contactInformation'
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
    'Contact Information': 'contactInformation', // Added strict match
    'Hospital Engagement': 'hospitalEngagement',
    'Section 2: Hospital Experience in Detail': 'hospitalExperienceInDetail',

    // Board Recruitment
    'Board Member Application': 'boardMemberApplication',
    'Commitment and Understanding': 'commitmentAndUnderstanding',
    'Background and Experience': 'backgroundAndExperience',
    'References': 'references',
    'Supporting Documents': 'supportingDocuments'
  };

  const mappedKey = sectionMappings[title];
  if (mappedKey && t[mappedKey]) {
    return t[mappedKey];
  }

  return title;
}
