const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, doc, setDoc, getDoc } = require('firebase/firestore');
const bcrypt = require('bcryptjs');

// Firebase configuration (you'll need to add your config)
const firebaseConfig = {
  // Add your Firebase config here
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Current participants data from the markdown file
const currentParticipantsData = [
  {
    name: "Adam Val Bonzil",
    age: 20,
    citizenshipStatus: "Canadian Citizen",
    location: "Quebec",
    projectCategory: "Advocacy/Self-Advocacy",
    duties: "Hospital Preparedness Pack for youth living with Sickle Cell Disease and their caregivers.",
    email: "valbonzil.adam@gmail.com",
    phone: "8199304904",
    affiliationWithSCD: "Living with SCD",
    notes: "",
    nextSteps: "yes Sept 1",
    interviewNotes: "Medical pre made resource kit for hospital visits. Essentially a toolkit, to support patients and families to make patient with SCD more comfortable and knowledgeable.",
    recruited: true
  },
  {
    name: "Ajao-Onaolapo Hadi Eyitayo",
    age: 21,
    citizenshipStatus: "Permanent Resident",
    location: "Toronto",
    projectCategory: "Advocacy/Self-Advocacy",
    duties: "Open to do anything that has to do with raising awareness & education",
    email: "ajaohadi515@gmail.com",
    phone: "4374109947",
    affiliationWithSCD: "",
    notes: "",
    nextSteps: "Yes, August 22, 2025",
    interviewNotes: "",
    recruited: true
  },
  {
    name: "Alex Nkanu",
    age: 24,
    citizenshipStatus: "Canadian Citizen",
    location: "Ottawa",
    projectCategory: "Community Engagement and Awareness",
    duties: "Organize a group activity, led by several facilitators, where users will choose and prepare, based on their abilities, an artwork or performance to showcase during a presentation.",
    email: "alexnkanu01@gmail.com",
    phone: "6138585493",
    affiliationWithSCD: "Living with Sickle Cell Disease",
    notes: "",
    nextSteps: "Yes August 28 2025",
    interviewNotes: "doesnt have scd community besides fatia, nurse. Possiblity of doing SCD event in hospital, and get fatia to get physicans to speak and SCD members. Art wor event to raise awareness an and bring scd member as guest speaker to talk about how theyre more than scd.",
    recruited: true
  },
  {
    name: "Amadou Thierno Bah",
    age: 15,
    citizenshipStatus: "",
    location: "Oakville",
    projectCategory: "Community Engagement and Awareness",
    duties: "A seminar where some people were sick can always talk about themselves and how they grew up as a sickle cell person we could make seminars about sickle cell.",
    email: "Thiernotouro@gmail.com",
    phone: "9058084251",
    affiliationWithSCD: "Has SCD",
    notes: "",
    nextSteps: "Yes, August 4, 2025",
    interviewNotes: "#NAME?",
    recruited: true
  },
  {
    name: "Bernadeth Bodie Mansaray",
    age: 17,
    citizenshipStatus: "Canadian Citizen",
    location: "Edmonton",
    projectCategory: "Advocacy/Self-Advocacy",
    duties: "This Adaptive Sports Wellness Program is designed to advance sickle cell disease (SCD) advocacy and care by promoting safe, moderate physical activity among youth aged 10–18 affected by SCD.",
    email: "kamisbee@gmail.com",
    phone: "5875685148",
    affiliationWithSCD: "A child of a parent with Sickle Cell Disease",
    notes: "",
    nextSteps: "Yes, August 26 2025",
    interviewNotes: "wants to do a dancing music event or a skating event, has done a skating event with children and youth with disability before. Dad is going to be a mentor for Bernadeth and a few other individuals from Sickle Cell Edmonton community.",
    recruited: true
  },
  {
    name: "Bob Ariane Rushatsi",
    age: 25,
    citizenshipStatus: "Canadian Citizen",
    location: "Quebec",
    projectCategory: "Community Engagement and Awareness",
    duties: "set up a series of interactive workshops and educational capsules to improve the mental health and well-being of young people living with SCD",
    email: "rushatsi.ariane@gmail.com",
    phone: "5148852879",
    affiliationWithSCD: "An advocate for the Sickle Cell Community",
    notes: "",
    nextSteps: "Yes sept 16",
    interviewNotes: "raise awareness through peer support sessions, create community for people affected by SCD in her area",
    recruited: true
  },
  {
    name: "Dalya Onaina",
    age: 24,
    citizenshipStatus: "Canadian Citizenship",
    location: "Windsor",
    projectCategory: "Community Engagement and Awareness",
    duties: "The \"Colors of Resilience\" project is a community art initiative that aims to raise awareness about Sickle Cell Disease by creating a vibrant mural that symbolizes the strength and hope of individuals living with the condition. Through workshops and collaborative painting, the project will engage local youth and artists, fostering understanding and support within the community.",
    email: "eonaidaly@gmail.com",
    phone: "5144341362",
    affiliationWithSCD: "Has SCD",
    notes: "",
    nextSteps: "Yes, August 4, 2025",
    interviewNotes: "#NAME?",
    recruited: true
  },
  {
    name: "David Lingisi",
    age: 28,
    citizenshipStatus: "",
    location: "Hamilton",
    projectCategory: "Community Engagement and Awareness",
    duties: "Sickle Cell Awareness All Star Game that uses entertainment to support those affected by sickle cell disease.",
    email: "Davidlingisi@gmail.com",
    phone: "2896844011",
    affiliationWithSCD: "Has SCD",
    notes: "",
    nextSteps: "Yes, August 21st, 2025",
    interviewNotes: "-Has SCD, will have to redo their proposal as they applied a while back. Proposal was sent to them to redo (on August 21s)",
    recruited: false
  },
  {
    name: "Esther Dazogbo",
    age: 19,
    citizenshipStatus: "Canadian Citizen",
    location: "Ottawa, Ontario",
    projectCategory: "Professionalism and Mentorship",
    duties: "free tutoring to grade 1 to 12 students affected by SCD",
    email: "estherdazogbo@yahoo.com",
    phone: "8193296870",
    affiliationWithSCD: "",
    notes: "",
    nextSteps: "Yes August 29",
    interviewNotes: "recruit volunteers to help students with SCD/tutoring services. possibility of using funding to buy ipads (needs to be approved), or rental. Share flyers and related info to SCD clinics, possibility of collabing with Queens chapter.",
    recruited: true
  },
  {
    name: "Fatima Hammoud",
    age: 17,
    citizenshipStatus: "Canadian Citizen",
    location: "Toronto, Ontario",
    projectCategory: "Community Engagement and Awareness",
    duties: "Events for people with SCD",
    email: "fatoumahammoud13@gmail.com",
    phone: "416-757-5284",
    affiliationWithSCD: "Advocate",
    notes: "",
    nextSteps: "Yes Oct 6",
    interviewNotes: "will work with samira and esra for scd events",
    recruited: true
  },
  {
    name: "Fatima Jaafar",
    age: 16,
    citizenshipStatus: "Canadian Citizen",
    location: "Toronto, Ontario",
    projectCategory: "Education",
    duties: "art work /comic book",
    email: "",
    phone: "647-512-0976",
    affiliationWithSCD: "Advocate",
    notes: "",
    nextSteps: "",
    interviewNotes: "",
    recruited: false
  },
  {
    name: "Fatima K Mohammed",
    age: 20,
    citizenshipStatus: "Canadian Citizen",
    location: "Markham, Ontario",
    projectCategory: "Community Engagement and Awareness",
    duties: "a talent showcase where creativity meets advocacy, giving youth and community members a stage to share their gifts while raising awareness for Sickle Cell Disease",
    email: "fatimakmohammed2005@gmail.com",
    phone: "6479675260",
    affiliationWithSCD: "An advocate for the Sickle Cell Community",
    notes: "",
    nextSteps: "Yes, Sept 2",
    interviewNotes: "Queens chapter - possibility of a talent show with the queens chapter, with guest speaker. Revising proposal, possibility of merch or social media. Open to different ideas.",
    recruited: true
  },
  {
    name: "Favour Enuwa Okoh",
    age: 19,
    citizenshipStatus: "",
    location: "Brampton",
    projectCategory: "Community Engagement and Awareness",
    duties: "sickle cell awarenss 101 platforn/ event",
    email: "okohfavour454@gmail.com",
    phone: "4373394625",
    affiliationWithSCD: "Advocate",
    notes: "",
    nextSteps: "Yes, July 23 2025",
    interviewNotes: "19, advocate/ has family w SCD, permanent resident. Established first scago chapter at queens university. Push more for education and interest in spreading sickle cell",
    recruited: true
  },
  {
    name: "Favour Owolabi Oluwadarasimi",
    age: 18,
    citizenshipStatus: "Granted Refugee Status",
    location: "Ottawa",
    projectCategory: "Advocacy/Self-Advocacy",
    duties: "This project is dedicated to advancing advocacy and care for individuals affected by sickle cell disease.",
    email: "favourowolabi10@gmail.com",
    phone: "6132407021",
    affiliationWithSCD: "Living with Sickle Cell Disease",
    notes: "",
    nextSteps: "Yes, August 27",
    interviewNotes: "Referred by Courtney social worker. Create more awareness about sickle cell. Let people know what sickle cell is and bring more people to the community. Open to different ideas- doesn't have a specific approach at that moment. Doesn't envision any challenges at the moment. Passion is within social media, wants to do similar day in the life videos.",
    recruited: true
  },
  {
    name: "Fayez Saad",
    age: 19,
    citizenshipStatus: "Canadian Citizen",
    location: "Hamilton, Ontario",
    projectCategory: "Community Engagement and Awareness",
    duties: "People can sign up to become drivers then when patients with sickle cell disease have to get to their appointments or go to the hospital they have quick reliable transportation.",
    email: "fayezsaad443@gmail.com",
    phone: "9052446499",
    affiliationWithSCD: "A sibling of someone with Sickle Cell Disease",
    notes: "",
    nextSteps: "Yes August 28 2025",
    interviewNotes: "Will be working with chloe and maisaa in london. Check in meetings with mom maisaa.",
    recruited: true
  },
  {
    name: "Jeea Thakker",
    age: 18,
    citizenshipStatus: "Canadian Citizen",
    location: "GTA",
    projectCategory: "Education",
    duties: "Jeea's idea is to make a fun, animation-style storybook for kids aged 6 to 12 that shows what life is like with sickle cell disease.",
    email: "jeea.thakker@gmail.com",
    phone: "4372552272",
    affiliationWithSCD: "",
    notes: "",
    nextSteps: "Yes, August 20, 2025",
    interviewNotes: "Jeea is really passionate about accessibility and using stories to make a difference. She's worked with the Canadian National Institute of the Blind and even teamed up with Adidas Canada to make skate parks more inclusive, adding things like audio cues and better lighting. She's connected with school boards, community artists, and blind youth across the country, and has hosted a podcast sharing their day-to-day experiences. She's also helped create community murals showing what living with eye cancer can look like. Through all these projects, she's built strong relationships with schools, organizations, and creative partners, and she's excited to bring that same energy to her sickle cell storybook idea, but she's also open to trying something else that can make a positive impact if this one doesn't go ahead.",
    recruited: true
  },
  {
    name: "Kadiatou Barry",
    age: 21,
    citizenshipStatus: "Granted Refugee Status",
    location: "Gatineau, Quebec",
    projectCategory: "Community Engagement and Awareness",
    duties: "My project aims to raise awareness about sickle cell disease within the community through educational workshops and outreach activities.",
    email: "barrykadiatou0137@gmail.com",
    phone: "6136974954",
    affiliationWithSCD: "Living with Sickle Cell Disease",
    notes: "",
    nextSteps: "Yes August 28 2025",
    interviewNotes: "Wants to raise awareness. Francephone. Possibility to cohort 3. Possibility of working with Tanya from Ottawa.",
    recruited: false
  },
  {
    name: "Kasia Mira Stojnic",
    age: 20,
    citizenshipStatus: "Canadian Citizen",
    location: "Quebec",
    projectCategory: "Advocacy/Self-Advocacy",
    duties: "Medication Compliance Kit designed to help youth and young adults with sickle cell disease build healthy routines around taking their prescribed medications.",
    email: "kasiastojnic@icloud.com",
    phone: "8199688713",
    affiliationWithSCD: "Partner with SCD/ advocate",
    notes: "",
    nextSteps: "yes Sept 1",
    interviewNotes: "medication toolkit booklet. ideally 15-25 families to receive a digital format toolkit, to assist with medication related responsibilities. If a patient goes to a doctor, they can use the toolkit as a reference to medication routine, with side effects and symptoms. Bridge between mental health and medication for patients.",
    recruited: true
  },
  {
    name: "Kimya Elese Lokoy",
    age: 15,
    citizenshipStatus: "Canadian Citizen",
    location: "Quebec",
    projectCategory: "Education",
    duties: "A one-day event in Ottawa/Gatineau designed to educate and inspire students about sickle cell disease through interactive exhibits, presentations, and a competition for student-created content.",
    email: "elek8831@collegestjo.ca",
    phone: "819-592-9513",
    affiliationWithSCD: "A sibling of someone with Sickle Cell Disease",
    notes: "",
    nextSteps: "Yes, sept 10",
    interviewNotes: "science expo on SCD. Teach people about sickle cell and science behind it, targetting younger communities and youth.",
    recruited: true
  },
  {
    name: "Laurence-Ania Mondésir",
    age: 27,
    citizenshipStatus: "Canadian Citizen",
    location: "Montreal",
    projectCategory: "Advocacy/Self-Advocacy",
    duties: "jewelery/shirt line, something wearble that people with SCD to wear to show support in community and face fear many people experience within SCD community. Book with SCD art.",
    email: "odionprints@gmail.com",
    phone: "3437771384",
    affiliationWithSCD: "",
    notes: "",
    nextSteps: "Yes, august 25 2025",
    interviewNotes: "goal is to put symbols of SCD in book, with a storyline but no dialogue because already doing something similar. wants to use funds to design the clothes and put the clothes into galleries.",
    recruited: true
  },
  {
    name: "Mayowa Akusebo",
    age: 20,
    citizenshipStatus: "Canadian Citizen",
    location: "Toronto",
    projectCategory: "Community Engagement and Awareness",
    duties: "The purpose of this project is to bring together individuals living with Sickle Cell Disease, their families, and supporters.",
    email: "kristinaakusebo@gmail.com",
    phone: "437-221-2818",
    affiliationWithSCD: "",
    notes: "",
    nextSteps: "Yes, August 18, 2025",
    interviewNotes: "",
    recruited: true
  },
  {
    name: "Nahima Abu-kasum",
    age: 16,
    citizenshipStatus: "Canadian Citizen",
    location: "London",
    projectCategory: "Community Engagement and Awareness",
    duties: "workout class event to educate about SCD",
    email: "nabukasum@gmail.com",
    phone: "4375334633",
    affiliationWithSCD: "A sibling of someone with SCD",
    notes: "",
    nextSteps: "Yes Sept 29",
    interviewNotes: "wants to explain good health with SCD, helps contribute to the body while not exhausting the body. London region, collab with Chloe possibly.",
    recruited: true
  },
  {
    name: "Nnenna Akpulonu",
    age: 19,
    citizenshipStatus: "Candian Citizen",
    location: "Edmonton",
    projectCategory: "Community Engagement and Awareness",
    duties: "My project intends to expose students with sickle cell disease to the professional realm, bringing together successful and aspiring individuals for a chance to connect with each other.",
    email: "ennaak.024@gmail.com",
    phone: "(587) 938-3672",
    affiliationWithSCD: "An advocate for the Sickle Cell Community",
    notes: "",
    nextSteps: "Yes, August 27 2025",
    interviewNotes: "Initial idea was to have a panelist discussion to offer resources and support for students with SCD. Wants to connect students with mentors and professionals to guide them and help navigate their career/professional field. Plan was to reach out to panelists, and have them be mentors for students who attend. Wants to get people who are willing to speak otr talk in person. Part of the Queens Scago chapter. Will be working with members of the team. Possibly event, social media, podcast, merch, etc. Leaning towards community engagement, wheel game video.",
    recruited: true
  },
  {
    name: "Oladayo Ajisafe",
    age: 18,
    citizenshipStatus: "Canadian Citizen",
    location: "Toronto, Ontario",
    projectCategory: "Advocacy/Self-Advocacy",
    duties: "AdvocateSCD is an interactive web-based resource designed to help healthcare professionals advocate for individuals with sickle cell disease by promoting culturally competent care, accountability, and evidence-based treatment practices.",
    email: "dayo.ajisafe@hotmail.ca",
    phone: "647-967-7233",
    affiliationWithSCD: "An advocate for the Sickle Cell Community",
    notes: "",
    nextSteps: "",
    interviewNotes: "wants to make a resource kit for peopke with scd, with tips, healthcare approaches for each person, experiences. a digital toookit. Challenge is engagment, making it aware, marketting. Research and informatio is anither hard part. another issue is getting the and digital toolkit useful. if he was to do an app, talk to colleages in hospital, do research survey regarding scd. Wants to get info from scd patients (experiences, pain crisis, etc), to know what to put on app. Start consulting UI/UX developer, geetting app started. Getting more feedback from users (patient modules, healthcare modules).",
    recruited: true
  },
  {
    name: "Oluwatofe Olatunde (Tofe)",
    age: 28,
    citizenshipStatus: "Canadian Citizen",
    location: "Etobicoke",
    projectCategory: "Professionalism and Mentorship",
    duties: "They want to create support for people with sickle cell, focusing on the mental and emotional side as much as the physical.",
    email: "okolatunde@gmail.com",
    phone: "4162584505",
    affiliationWithSCD: "",
    notes: "",
    nextSteps: "Yes, August 21, 2025",
    interviewNotes: "",
    recruited: true
  },
  {
    name: "Patricia Defo",
    age: null,
    citizenshipStatus: "Canadian Citizen",
    location: "",
    projectCategory: "",
    duties: "",
    email: "",
    phone: "",
    affiliationWithSCD: "",
    notes: "Returning Applicant",
    nextSteps: "",
    interviewNotes: "",
    recruited: true
  },
  {
    name: "Rebecca Bekele",
    age: 19,
    citizenshipStatus: "Canadian Citizen",
    location: "Brampton Ontario",
    projectCategory: "Education",
    duties: "educational toolkit on sickle cell disease for Peel youth",
    email: "bekeler@mcmaster.ca",
    phone: "6472057592",
    affiliationWithSCD: "An advocate for the Sickle Cell Community",
    notes: "",
    nextSteps: "yes Sept 1",
    interviewNotes: "toolkit collab with CBS, utilize some funds for the toolkit. Remainder funds for something else. Digital toolkit, then use remainder for marketting. Potential collab with roots  community support and do peer support.",
    recruited: true
  },
  {
    name: "Sabrina Blais",
    age: 16,
    citizenshipStatus: "",
    location: "Quebec",
    projectCategory: "Education",
    duties: "Digital platform for youth with SCD",
    email: "sabrina.blaistif@gmail.com",
    phone: "438-933-3733",
    affiliationWithSCD: "Advocate",
    notes: "",
    nextSteps: "Yes, July 24, 2025",
    interviewNotes: "(she's from Quebec and is 16), student in health science, passionate about health equity wants to build a website for SCAGO using a Python platform, starting with a homepage that explains what the site is about. She plans to interview healthcare providers and youth with SCD to make short videos for the site and add OpenAI tools and a forum with login options so youth can engage. She's also said that she's open to getting help from professionals for any cybersecurity or technical issues, using funding to cover those costs",
    recruited: true
  },
  {
    name: "Tsepo Musonda",
    age: 21,
    citizenshipStatus: "Canadian Citizen",
    location: "Saskatchewan",
    projectCategory: "",
    duties: "Podcast",
    email: "tsepomus@gmail.com",
    phone: "1639-318-4604",
    affiliationWithSCD: "",
    notes: "",
    nextSteps: "Yes, August 18, 2025",
    interviewNotes: "",
    recruited: true
  },
  {
    name: "Victor Adarquah",
    age: 28,
    citizenshipStatus: "",
    location: "Newmarket",
    projectCategory: "Education",
    duties: "youth led research project for jane and finch",
    email: "victoradarquah@gmail.com",
    phone: "4168169112",
    affiliationWithSCD: "Advocate",
    notes: "poor budget idea",
    nextSteps: "Yes, July 23 2025",
    interviewNotes: "- 28, researcher with black creek. - advocate for SCD. - research based project but needs discussion on feasibility. Project is working towards addressing a need in community, to educate and inform at a level high school students can understand. Want to assess their understanding of sickle cell disease through survey analysis and evaluation",
    recruited: true
  },
  {
    name: "Winnie Kerubo Ondieki",
    age: 18,
    citizenshipStatus: "Permanent Residence",
    location: "Shelburne, Ontario",
    projectCategory: "Community Engagement and Awareness",
    duties: "A hosting and event where speakers (e.g., doctors and sickle cell advocates) will share their expertise, and the community can come to ask questions and gain awareness.",
    email: "kerubowinnie536@gmail.com",
    phone: "647-855-3288",
    affiliationWithSCD: "A child of someone with SCD",
    notes: "",
    nextSteps: "Yes, August 4, 2025",
    interviewNotes: "Bring black community together at sherbone to raise awareness of SCD. Community engagment event with guest speakers, doctors, people to help educate about SCD. Has connections already with doctors, nurses, and friends. 2 events with differnt topics. Challenges faced are how to navigate transportation for her listed connections.",
    recruited: true
  },
  {
    name: "Wisdom Olasoko",
    age: 22,
    citizenshipStatus: "Canadian Citizen",
    location: "Dundas, Ontario",
    projectCategory: "Education",
    duties: "creating provider-focused education sessions that increase awareness, reduce bias, and strengthen quality of care.",
    email: "wolasoko@uwo.ca",
    phone: "2897759881",
    affiliationWithSCD: "Has SCD",
    notes: "",
    nextSteps: "Yes sept 4",
    interviewNotes: "event in a hospital with nurses, and bring awarensss as to what goes on with scd patients. Give more grounding advice as to what SCD goes through while waiting in the ER; want to educate healthcare professionals to help reduce ER waiting time for SCD. Community engagement event, possibly a lunch and learn. Possibly teaching them  about quality care for SCD patients. POssibility of doing it at Western University.",
    recruited: false
  },
  {
    name: "Zahara Ele ojo Achimugu",
    age: 17,
    citizenshipStatus: "Granted Refugee Status",
    location: "Mississauga, Ontario",
    projectCategory: "Education",
    duties: "\"Faces of Sickle Cell: Real Stories, Real Strength\" is an educational project that will use real life stories and clear medical information to teach communities about sickle cell disease.",
    email: "ach123zaza@gmail.com",
    phone: "16472917305",
    affiliationWithSCD: "Living with Sickle Cell Disease",
    notes: "",
    nextSteps: "Yes August 28 2025",
    interviewNotes: "wants to give people knowledge on SCD and raise awareness. Not comfortable on social media.",
    recruited: true
  },
  {
    name: "Zaheera Achimugu",
    age: 17,
    citizenshipStatus: "Granted Refugee Status",
    location: "Mississauga, Ontario",
    projectCategory: "Advocacy/Self-Advocacy",
    duties: "\"Breaking the Silence: Sickle Cell Awareness for All\" aims to create a comprehensive campaign that educates communities about sickle cell disease, its symptoms, and management strategies while fostering support networks for affected individuals and families.",
    email: "ach123zeze@gmail.com",
    phone: "6472917935",
    affiliationWithSCD: "Living with Sickle Cell Disease",
    notes: "",
    nextSteps: "Yes August 28 2025",
    interviewNotes: "Wants to raise awareness and help the SCD community, esp when it comes to medication management. Possibly have a seminar with a physician coming in, bringing community together, workshops, etc. Possibly collab with sister to start SCAGO chapter at University and use funds for merchandise and events.",
    recruited: true
  }
];

// Helper function to calculate DOB from age
function calculateDOB(age) {
  if (!age || isNaN(age)) return null;
  const currentYear = new Date().getFullYear();
  const birthYear = currentYear - age;
  return `${birthYear}-01-01`; // Default to January 1st
}

// Helper function to map citizenship status
function mapCitizenshipStatus(status) {
  if (!status) return 'Other';
  
  const statusMap = {
    'Canadian Citizen': 'Canadian Citizen',
    'Canadian Citizenship': 'Canadian Citizen',
    'Candian Citizen': 'Canadian Citizen', // Fix typo
    'Permanent Resident': 'Permanent Resident',
    'Permanent Residence': 'Permanent Resident',
    'Granted Refugee Status': 'Other',
    '': 'Other'
  };
  
  return statusMap[status] || 'Other';
}

// Helper function to map region from location
function mapRegion(location) {
  if (!location) return 'Other';
  
  const locationMap = {
    'Toronto': 'Toronto',
    'Toronto, Ontario': 'Toronto',
    'Markham, Ontario': 'Toronto',
    'Etobicoke': 'Toronto',
    'Brampton': 'Toronto',
    'Brampton Ontario': 'Toronto',
    'GTA': 'Toronto',
    'Newmarket': 'Toronto',
    'Mississauga, Ontario': 'Toronto',
    'Hamilton': 'Other',
    'Hamilton, Ontario': 'Other',
    'Ottawa': 'Ottawa',
    'Ottawa, Ontario': 'Ottawa',
    'Quebec': 'Quebec',
    'Montreal': 'Quebec',
    'Gatineau, Quebec': 'Quebec',
    'Edmonton': 'Other',
    'London': 'Other',
    'Shelburne, Ontario': 'Other',
    'Dundas, Ontario': 'Other',
    'Oakville': 'Other',
    'Windsor': 'Other',
    'Saskatchewan': 'Other'
  };
  
  return locationMap[location] || 'Other';
}

// Helper function to determine if participant is underage
function isUnderage(age) {
  return age && age < 18;
}

// Helper function to hash SIN
async function hashSIN(sin) {
  if (!sin || sin.trim() === '') return '';
  return await bcrypt.hash(sin, 12);
}

// Main import function
async function importCurrentParticipants() {
  console.log('Starting import of current participants...');
  
  try {
    for (const participant of currentParticipantsData) {
      // Skip if no email
      if (!participant.email || participant.email.trim() === '') {
        console.log(`Skipping ${participant.name} - no email`);
        continue;
      }
      
      // Calculate DOB from age
      const dob = calculateDOB(participant.age);
      
      // Map citizenship status
      const canadianStatus = mapCitizenshipStatus(participant.citizenshipStatus);
      
      // Map region
      const region = mapRegion(participant.location);
      
      // Determine if interviewed
      const interviewed = participant.nextSteps && participant.nextSteps.toLowerCase().includes('yes');
      
      // Create participant data
      const participantData = {
        youthParticipant: participant.name,
        email: participant.email,
        phoneNumber: participant.phone || '',
        region: region,
        approved: participant.recruited || false,
        contractSigned: false,
        signedSyllabus: false,
        availability: '',
        assignedMentor: '',
        idProvided: false,
        canadianStatus: canadianStatus,
        canadianStatusOther: canadianStatus === 'Other' ? participant.citizenshipStatus : '',
        sinLast4: '',
        sinHash: '',
        youthProposal: participant.duties || '',
        proofOfAffiliationWithSCD: participant.affiliationWithSCD ? participant.affiliationWithSCD.includes('SCD') || participant.affiliationWithSCD.includes('Sickle Cell') : false,
        scagoCounterpart: '',
        dob: dob || '1990-01-01',
        // New fields
        age: participant.age,
        citizenshipStatus: participant.citizenshipStatus,
        location: participant.location,
        projectCategory: participant.projectCategory,
        duties: participant.duties,
        affiliationWithSCD: participant.affiliationWithSCD,
        notes: participant.notes,
        nextSteps: participant.nextSteps,
        interviewed: interviewed,
        interviewNotes: participant.interviewNotes,
        recruited: participant.recruited || false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Add to Firestore
      const docRef = await addDoc(collection(db, 'yep_participants'), participantData);
      console.log(`Imported ${participant.name} with ID: ${docRef.id}`);
    }
    
    console.log('Import completed successfully!');
  } catch (error) {
    console.error('Error during import:', error);
  }
}

// Run the import
if (require.main === module) {
  importCurrentParticipants()
    .then(() => {
      console.log('Import process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Import process failed:', error);
      process.exit(1);
    });
}

module.exports = { importCurrentParticipants };
