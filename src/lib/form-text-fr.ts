/**
 * French for form text that isn't covered by the keyed `translations` table.
 *
 * The form engine translates by exact English string, so every entry here must
 * match the English in the form definition character for character. Lookups
 * fall back to the English text, so a missing entry degrades to English rather
 * than breaking anything.
 *
 * Currently: the Counselling Intake Form (scripts/create-counselling-intake-form.js).
 */
export const FORM_TEXT_FR: Record<string, string> = {
  // Form chrome
  'Counselling Intake Form': "Formulaire d'admission au counseling",
  'Submit request': 'Soumettre la demande',
  'Thank you': 'Merci',
  "We've received your counselling request. We will contact you within 14 business days to arrange a phone or virtual consultation. A confirmation has been sent to your email. If you are experiencing an emergency or crisis, please call 911 or visit your nearest Emergency Room.":
    "Nous avons bien reçu votre demande de counseling. Nous communiquerons avec vous dans un délai de 14 jours ouvrables pour organiser une consultation téléphonique ou virtuelle. Une confirmation a été envoyée à votre adresse courriel. Si vous vivez une urgence ou une crise, composez le 911 ou rendez-vous à l'urgence la plus proche.",

  // Before you begin
  'Before You Begin': 'Avant de commencer',
  'If you are in crisis or thinking about suicide\nCall or text 988 (Suicide Crisis Helpline, available 24/7) or call 911 and go to your nearest emergency room. This form is not monitored around the clock.':
    "Si vous êtes en situation de crise ou avez des pensées suicidaires\nAppelez ou textez le 988 (Ligne d'aide en cas de crise de suicide, accessible en tout temps) ou composez le 911 et rendez-vous à l'urgence la plus proche. Ce formulaire n'est pas surveillé en tout temps.",
  'This form takes about 3 minutes. Questions marked * are required. Your progress is saved on this device, so you can come back to it.':
    "Ce formulaire prend environ 3 minutes. Les questions marquées d'un * sont obligatoires. Vos réponses sont enregistrées sur cet appareil, vous pouvez donc y revenir.",

  // Your details
  'Your Details': 'Vos coordonnées',
  Name: 'Nom',
  Phone: 'Téléphone',
  'Primary phone number': 'Numéro de téléphone principal',
  'Alternate phone number (optional)': 'Autre numéro de téléphone (facultatif)',
  Location: 'Lieu',
  City: 'Ville',
  'Postal code': 'Code postal',
  'e.g. M5V 1A1': 'p. ex. M5V 1A1',

  // How we can reach you
  'How We Can Reach You': 'Comment vous joindre',
  'How would you prefer we contact you?': 'Comment préférez-vous que nous communiquions avec vous?',
  'Phone call': 'Appel téléphonique',
  'Text message': 'Message texte',
  'When is the best time to reach you? (select all that apply)':
    'Quel est le meilleur moment pour vous joindre? (sélectionnez toutes les réponses pertinentes)',
  'Weekday mornings': 'En semaine, le matin',
  'Weekday afternoons': "En semaine, l'après-midi",
  'Weekday evenings': 'En semaine, en soirée',
  Weekends: 'La fin de semaine',
  'Is it okay for us to leave a voicemail that mentions SCAGO?':
    'Pouvons-nous laisser un message vocal qui mentionne SCAGO?',
  'Yes, a voicemail is fine': 'Oui, un message vocal convient',
  "No, please don't leave a voicemail": 'Non, veuillez ne pas laisser de message vocal',

  // About your request
  'About Your Request': 'Votre demande',
  'Whom are you seeking services for? (Mark only one)': 'Pour qui demandez-vous des services? (une seule réponse)',
  Myself: 'Moi-même',
  'A family member': 'Un membre de la famille',
  'Someone else': 'Une autre personne',
  'Is the person you are requesting services for aware of this request?':
    'La personne pour qui vous faites cette demande est-elle au courant?',
  'Please tell us about you (select all that apply)':
    'Parlez-nous de vous (sélectionnez toutes les réponses pertinentes)',
  'I am an individual with sickle cell disease': 'Je suis une personne atteinte de drépanocytose',
  'I am a parent or family member of a person with sickle cell disease':
    "Je suis un parent ou un membre de la famille d'une personne atteinte de drépanocytose",
  'What is the age group of the person you are seeking services for?':
    'Quel est le groupe d’âge de la personne pour qui vous demandez des services?',
  'Child (12 years or younger)': 'Enfant (12 ans ou moins)',
  'Teen (13 to 17 years)': 'Adolescent (13 à 17 ans)',
  'Adult (18 to 59 years)': 'Adulte (18 à 59 ans)',
  'Senior (60 years or older)': 'Aîné (60 ans ou plus)',
  'Please describe the kind of counselling you are seeking': 'Quel type de counseling recherchez-vous?',
  'Connection to community resources': 'Lien avec des ressources communautaires',
  'Personal or Family Support': 'Soutien personnel ou familial',
  'Healthy coping skill development (e.g., stress management)':
    "Développement de stratégies d'adaptation saines (p. ex. gestion du stress)",
  'Grief and Loss': 'Deuil et perte',
  'Food, housing, or income security': 'Sécurité alimentaire, du logement ou du revenu',
  'Poor quality of care received in an Ontario hospital': "Mauvaise qualité des soins reçus dans un hôpital de l'Ontario",
  'Please describe': 'Veuillez préciser',

  // Terms
  'Terms & Conditions Agreement': 'Conditions et consentement',
  'Thank you for completing this request form. The information submitted will be held confidentially by SCAGO and not shared with other individuals or outside agencies without your documented verbal or written consent. We will contact you within 14 business days of receipt of this form to conduct a phone or virtual consultation to discuss your needs further. Note that SCAGO counselling services are short-term, do not constitute crisis or urgent care or medical advice, and are not intended to substitute for medical treatment or care. If you are experiencing an emergency or crisis, please call 911 or visit your nearest Emergency Room. Please click the appropriate option below if you agree with these terms and permit us to contact you.':
    "Merci d'avoir rempli ce formulaire de demande. Les renseignements fournis seront traités de façon confidentielle par SCAGO et ne seront pas communiqués à d'autres personnes ni à des organismes externes sans votre consentement verbal ou écrit documenté. Nous communiquerons avec vous dans un délai de 14 jours ouvrables suivant la réception de ce formulaire pour une consultation téléphonique ou virtuelle afin de discuter de vos besoins. Veuillez noter que les services de counseling de SCAGO sont de courte durée, ne constituent pas des soins de crise ou d'urgence ni des conseils médicaux, et ne remplacent pas un traitement ou des soins médicaux. Si vous vivez une urgence ou une crise, composez le 911 ou rendez-vous à l'urgence la plus proche. Veuillez cocher les options ci-dessous si vous acceptez ces conditions et nous autorisez à communiquer avec vous.",
  'I hereby verify that all information provided on this form is true':
    'Je confirme que tous les renseignements fournis dans ce formulaire sont exacts',
  'I agree to these terms.': "J'accepte ces conditions.",
};

/** French for `text` when known, otherwise `undefined` so callers can fall back. */
export function formTextFr(text: string | undefined | null): string | undefined {
  if (!text) return undefined;
  return FORM_TEXT_FR[text];
}

/** Translate form text for display, falling back to the original English. */
export function translateFormText(text: string, language: 'en' | 'fr'): string {
  if (language !== 'fr') return text;
  return FORM_TEXT_FR[text] ?? text;
}
