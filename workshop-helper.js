// Helper script to format workshop data for easy copy-paste
const workshops = [
  {
    title: "Orientation with Esra",
    description: "Program orientation and introduction session with Esra",
    date: "2025-10-16",
    location: "TBC",
    capacity: 20,
    notes: "Thursday Oct 16 Notes"
  },
  {
    title: "Project Management and Planning with Yara and Ghida",
    description: "Learn essential project management skills and planning techniques with Yara and Ghida",
    date: "2025-10-30",
    location: "TBC",
    capacity: 20,
    notes: "Thursday Oct 30 Notes"
  },
  {
    title: "Budgeting TBC",
    description: "Financial planning and budgeting workshop",
    date: "2025-11-13",
    location: "TBC",
    capacity: 20,
    notes: "Thursday Nov 13 Notes"
  },
  {
    title: "Resource Management by Dalia Saldanha",
    description: "Effective resource management strategies with Dalia Saldanha",
    date: "2025-11-27",
    location: "TBC",
    capacity: 20,
    notes: "Thursday Nov 27 Notes"
  },
  {
    title: "Blood Donations by CBS",
    description: "Community service and blood donation awareness with CBS",
    date: "2025-12-11",
    location: "TBC",
    capacity: 20,
    notes: "Thursday Dec 11 Notes"
  },
  {
    title: "Advocacy by Ream Zreik",
    description: "Advocacy skills and community engagement with Ream Zreik",
    date: "2026-01-08",
    location: "TBC",
    capacity: 20,
    notes: "Thursday Jan 8 Notes"
  },
  {
    title: "Research by Jasmine Hamilton",
    description: "Research methodologies and academic skills with Jasmine Hamilton",
    date: "2026-01-22",
    location: "TBC",
    capacity: 20,
    notes: "Thursday Jan 22 Notes"
  },
  {
    title: "Advertising and Social Media Strategies by Bobi Adair",
    description: "Digital marketing and social media strategies with Bobi Adair",
    date: "2026-02-05",
    location: "TBC",
    capacity: 20,
    notes: "Thursday Feb 5 Notes"
  },
  {
    title: "Volunteering & Community Engagement by Joseph Bodun Macaulay",
    description: "Community service and volunteer engagement with Joseph Bodun Macaulay",
    date: "2026-02-19",
    location: "TBC",
    capacity: 20,
    notes: "Thursday Feb 19 Notes"
  },
  {
    title: "Sustainability by Catherine Marot",
    description: "Environmental sustainability and green practices with Catherine Marot",
    date: "2026-03-05",
    location: "TBC",
    capacity: 20,
    notes: "Thursday March 5 Notes"
  },
  {
    title: "Outro and Program Finalizations with Esra",
    description: "Program wrap-up and final session with Esra",
    date: "2026-03-19",
    location: "TBC",
    capacity: 20,
    notes: "Thursday March 19 Notes"
  }
];

console.log("=== WORKSHOP ADDITION GUIDE ===");
console.log("Navigate to: http://localhost:9002/youth-empowerment");
console.log("Click on 'Workshops' tab");
console.log("Click 'Add Workshop' button");
console.log("\n=== WORKSHOPS TO ADD ===\n");

workshops.forEach((workshop, index) => {
  console.log(`${index + 1}. ${workshop.title}`);
  console.log(`   Date: ${workshop.date}`);
  console.log(`   Description: ${workshop.description}`);
  console.log(`   Location: ${workshop.location}`);
  console.log(`   Capacity: ${workshop.capacity}`);
  console.log(`   Notes: ${workshop.notes}`);
  console.log("   Feedback Form: (leave empty)");
  console.log("   ---");
});
