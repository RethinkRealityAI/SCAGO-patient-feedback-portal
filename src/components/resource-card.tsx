import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";

type ResourceCardProps = {
  title: string;
  description: string;
  link: string;
  imageUrl: string;
  imageHint: string;
};

export default function ResourceCard({ title, description, link, imageUrl, imageHint }: ResourceCardProps) {
  const [width, height] = imageUrl.split('/').slice(-2).map(Number);
  
  return (
    <Card className="flex flex-col overflow-hidden border-border/50 bg-card/60 shadow-lg backdrop-blur-lg transition-transform duration-300 hover:scale-[1.02] hover:shadow-xl">
      <CardHeader className="p-0">
        <div className="aspect-video overflow-hidden">
          <Image
            src={imageUrl}
            alt={title}
            width={width}
            height={height}
            className="object-cover w-full h-full"
            data-ai-hint={imageHint}
          />
        </div>
      </CardHeader>
      <div className="flex flex-col flex-1 p-6">
        <CardTitle className="text-lg font-bold">{title}</CardTitle>
        <CardDescription className="mt-2 flex-1">{description}</CardDescription>
        <CardFooter className="p-0 pt-6">
          <Button asChild className="w-full">
            <Link href={link}>
              Learn More <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardFooter>
      </div>
    </Card>
  );
}
