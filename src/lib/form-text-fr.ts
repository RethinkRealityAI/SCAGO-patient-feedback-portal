/**
 * French for form text that isn't covered by the keyed `translations` table.
 *
 * The form engine translates by exact English string, so every entry here must
 * match the English in the form definition character for character. Lookups
 * fall back to the English text, so a missing entry degrades to English rather
 * than breaking anything.
 *
 * Currently: the Counselling Intake Form (scripts/create-counselling-intake-form.js)
 * and the website Contact Us form (src/lib/contact-form-template.ts).
 */
export const FORM_TEXT_FR: Record<string, string> = {
  // Form chrome
  'Counselling Intake Form': "Formulaire d'admission au counseling",
  'Submit request': 'Soumettre la demande',
  'Thank you': 'Merci',
  "We've received your counselling request. We will contact you within 14 business days to arrange a phone or virtual consultation. A confirmation has been sent to your email. If you are experiencing an emergency or crisis, please call 911 or visit your nearest Emergency Room.":
    "Nous avons bien reçu votre demande de counseling. Nous communiquerons avec vous dans un délai de 14 jours ouvrables pour organiser une consultation téléphonique ou virtuelle. Une confirmation a été envoyée à votre adresse courriel. Si vous vivez une urgence ou une crise, composez le 911 ou rendez-vous à l'urgence la plus proche.",

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
  // Website Contact Us form (src/lib/contact-form-template.ts)
  'Contact Us': 'Nous joindre',
  'Send message': 'Envoyer le message',
  'Thank you for reaching out': "Merci d'avoir communiqué avec nous",
  "Your message has been sent to the SCAGO team and we'll get back to you as soon as we can. We've also emailed you a confirmation. If this is a medical emergency, call 911.":
    "Votre message a été transmis à l'équipe de SCAGO et nous vous répondrons dès que possible. Nous vous avons également envoyé une confirmation par courriel. S'il s'agit d'une urgence médicale, composez le 911.",
  'Send another message': 'Envoyer un autre message',
  'How can we help?': 'Comment pouvons-nous vous aider?',
  'Need urgent medical help?\nIf you or someone you care for is having a sickle cell crisis or another medical emergency, call 911 or go to your nearest emergency department. This form is not monitored around the clock.':
    "Besoin d'une aide médicale urgente?\nSi vous ou une personne dont vous prenez soin vivez une crise drépanocytaire ou une autre urgence médicale, composez le 911 ou rendez-vous au service d'urgence le plus proche. Ce formulaire n'est pas surveillé en tout temps.",
  'What is your message about?': 'Quel est le sujet de votre message?',
  'General question': 'Question générale',
  'Support for patients and families': 'Soutien aux patients et aux familles',
  'Counselling services': 'Services de counseling',
  'Financial assistance': 'Aide financière',
  'Programs and events': 'Programmes et événements',
  'Volunteering and getting involved': 'Bénévolat et engagement',
  'Donations and fundraising': 'Dons et collectes de fonds',
  Membership: 'Adhésion',
  'Healthcare professional inquiry': "Demande d'un professionnel de la santé",
  'Media, partnerships or speaking requests': 'Médias, partenariats ou demandes de conférence',
  'Website or technical issue': 'Site Web ou problème technique',
  'Something else': 'Autre chose',
  'Looking for counselling?\nCounselling requests go through the Counselling Intake Form on our Counselling page, which reaches our counselling team directly. You can still send a general question here.':
    "Vous cherchez du counseling?\nLes demandes de counseling se font au moyen du formulaire d'admission au counseling, sur notre page Counseling; il est transmis directement à notre équipe de counseling. Vous pouvez tout de même nous envoyer une question générale ici.",
  'Applying for financial assistance?\nApplications are made through the form on our Financial Assistance page. You can still send a general question here.':
    "Vous souhaitez demander une aide financière?\nLes demandes se font au moyen du formulaire de notre page Aide financière. Vous pouvez tout de même nous envoyer une question générale ici.",
  'Which best describes you?': 'Lequel de ces énoncés vous décrit le mieux?',
  'A person living with sickle cell disease': 'Une personne atteinte de drépanocytose',
  'A parent, family member or caregiver': 'Un parent, un membre de la famille ou un proche aidant',
  'A healthcare professional': 'Un professionnel de la santé',
  'A student or researcher': 'Un étudiant ou un chercheur',
  'A community member or supporter': 'Un membre de la communauté ou un sympathisant',
  'Representing an organization': 'Je représente un organisme',
  'Organization or workplace (optional)': 'Organisme ou milieu de travail (facultatif)',
  'Subject (optional)': 'Objet (facultatif)',
  'A few words about your message': 'Quelques mots sur votre message',
  'Your message': 'Votre message',
  "Tell us how we can help. Please don't include detailed medical information.":
    "Dites-nous comment nous pouvons vous aider. Veuillez ne pas inclure de renseignements médicaux détaillés.",
  'How can we reach you?': 'Comment pouvons-nous vous joindre?',
  'Phone (optional)': 'Téléphone (facultatif)',
  'e.g. 416-555-0123': 'p. ex. 416-555-0123',
  'How would you like us to reply?': 'Comment souhaitez-vous que nous vous répondions?',
  Email: 'Courriel',
  'City or town (optional)': 'Ville ou municipalité (facultatif)',
  "I agree that SCAGO may use the information I've shared to respond to my message.":
    "J'accepte que SCAGO utilise les renseignements fournis pour répondre à mon message.",
  'Send me SCAGO news, events and program updates by email (optional).':
    "Envoyez-moi par courriel les nouvelles, les événements et les programmes de SCAGO (facultatif).",
};

/**
 * French for the validation and submission messages the form engine raises
 * (written once, in English, in components/feedback-form and app/actions).
 */
export const VALIDATION_MESSAGES_FR: Record<string, string> = {
  'This field is required.': 'Ce champ est obligatoire.',
  'Invalid email address.': 'Adresse courriel non valide.',
  'Invalid phone number format.': 'Numéro de téléphone non valide.',
  'Invalid format.': 'Format non valide.',
  'Invalid URL.': 'Adresse URL non valide.',
  'Please specify': 'Veuillez préciser',
  'Too many submissions from this connection. Please wait a few minutes and try again.':
    'Trop d’envois à partir de cette connexion. Veuillez patienter quelques minutes, puis réessayer.',
  'An unexpected error occurred while submitting your feedback.':
    "Une erreur inattendue s'est produite lors de l'envoi. Veuillez réessayer.",
};

/** French for a validation message when known, otherwise the message unchanged. */
export function translateValidationMessage(message: string): string {
  return VALIDATION_MESSAGES_FR[message] ?? message;
}


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
