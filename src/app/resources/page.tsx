import ResourceCard from "@/components/resource-card";

const resources = [
  {
    title: "Understanding Sickle Cell Disease",
    description: "A comprehensive guide to the basics of sickle cell disease, its symptoms, and treatments.",
    link: "#",
    imageUrl: "https://picsum.photos/600/400",
    imageHint: "medical textbook"
  },
  {
    title: "Managing Pain",
    description: "Learn about different strategies and treatments for managing pain associated with sickle cell disease.",
    link: "#",
    imageUrl: "https://picsum.photos/601/400",
    imageHint: "comforting hand"
  },
  {
    title: "SCAGO News & Updates",
    description: "Stay up-to-date with the latest news, events, and announcements from the Sickle Cell Awareness Group of Ontario.",
    link: "#",
    imageUrl: "https://picsum.photos/600/401",
    imageHint: "community event"
  },
  {
    title: "Patient Support Programs",
    description: "Find information on support groups, financial assistance, and other programs available to patients.",
    link: "#",
    imageUrl: "https://picsum.photos/601/401",
    imageHint: "support group"
  },
  {
    title: "Transitioning to Adult Care",
    description: "Guidance and resources for young adults moving from pediatric to adult healthcare systems.",
    link: "#",
    imageUrl: "https://picsum.photos/600/402",
    imageHint: "doctor patient"
  },
  {
    title: "Advocacy and Awareness",
    description: "Get involved in raising awareness and advocating for better care and more research.",
    link: "#",
    imageUrl: "https://picsum.photos/602/400",
    imageHint: "public speaking"
  },
];


export default function ResourcesPage() {
  return (
    <div className="container max-w-7xl py-8 md:py-12">
      <section className="text-center mb-12">
        <h1 className="scroll-m-20 text-4xl font-bold tracking-tight text-primary lg:text-5xl font-headline">
          Educational Resources
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Empower yourself with knowledge. Here you'll find a collection of resources curated by SCAGO to help you navigate your journey with sickle cell disease.
        </p>
      </section>
      
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {resources.map((resource) => (
          <ResourceCard
            key={resource.title}
            title={resource.title}
            description={resource.description}
            link={resource.link}
            imageUrl={resource.imageUrl}
            imageHint={resource.imageHint}
          />
        ))}
      </div>
    </div>
  );
}
