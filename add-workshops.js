// Script to add all YEP workshops
const workshops = [
  {
    title: "Orientation with Esra",
    description: "Program orientation and introduction session",
    date: "2025-10-16",
    location: "TBC",
    capacity: 20
  },
  {
    title: "Project Management and Planning with Yara and Ghida",
    description: "Learn essential project management skills and planning techniques",
    date: "2025-10-30",
    location: "TBC",
    capacity: 20
  },
  {
    title: "Budgeting TBC",
    description: "Financial planning and budgeting workshop",
    date: "2025-11-13",
    location: "TBC",
    capacity: 20
  },
  {
    title: "Resource Management by Dalia Saldanha",
    description: "Effective resource management strategies",
    date: "2025-11-27",
    location: "TBC",
    capacity: 20
  },
  {
    title: "Blood Donations by CBS",
    description: "Community service and blood donation awareness",
    date: "2025-12-11",
    location: "TBC",
    capacity: 20
  },
  {
    title: "Advocacy by Ream Zreik",
    description: "Advocacy skills and community engagement",
    date: "2026-01-08",
    location: "TBC",
    capacity: 20
  },
  {
    title: "Research by Jasmine Hamilton",
    description: "Research methodologies and academic skills",
    date: "2026-01-22",
    location: "TBC",
    capacity: 20
  },
  {
    title: "Advertising and Social Media Strategies by Bobi Adair",
    description: "Digital marketing and social media strategies",
    date: "2026-02-05",
    location: "TBC",
    capacity: 20
  },
  {
    title: "Volunteering & Community Engagement by Joseph Bodun Macaulay",
    description: "Community service and volunteer engagement",
    date: "2026-02-19",
    location: "TBC",
    capacity: 20
  },
  {
    title: "Sustainability by Catherine Marot",
    description: "Environmental sustainability and green practices",
    date: "2026-03-05",
    location: "TBC",
    capacity: 20
  },
  {
    title: "Outro and Program Finalizations with Esra",
    description: "Program wrap-up and final session",
    date: "2026-03-19",
    location: "TBC",
    capacity: 20
  }
];

console.log('Workshops to add:');
workshops.forEach((workshop, index) => {
  console.log(`${index + 1}. ${workshop.title} - ${workshop.date}`);
});
