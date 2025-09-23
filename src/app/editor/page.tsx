import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileEdit } from 'lucide-react';

export default function EditorPage() {
  return (
    <div className="container max-w-4xl py-8 md:py-12">
      <section className="text-center mb-12">
        <h1 className="scroll-m-20 text-4xl font-bold tracking-tight text-primary lg:text-5xl font-headline">
          Survey Editor
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Create, modify, and manage your feedback surveys from here.
        </p>
      </section>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Coming Soon!</CardTitle>
          <CardDescription>
            The full survey editor is under construction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 border-2 border-dashed border-border rounded-lg">
            <FileEdit className="h-12 w-12 mb-4" />
            <p>
              Soon, you'll be able to design your forms with custom questions, logic, and more right from this page.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
