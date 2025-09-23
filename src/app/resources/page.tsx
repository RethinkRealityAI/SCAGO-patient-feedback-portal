import ResourceCard from "@/components/resource-card";
import placeholderImages from "@/lib/placeholder-images.json";

const resources = placeholderImages.resources;

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
            width={resource.width}
            height={resource.height}
          />
        ))}
      </div>
    </div>
  );
}
