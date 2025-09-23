import { getSubmissions } from "./actions";
import DashboardClient from "./client";
import { Suspense } from "react";
import Loading from "../loading";

export default async function DashboardPage() {
  const submissions = await getSubmissions();

  if ('error' in submissions) {
    return (
      <div className="container py-8 text-center text-destructive">
        <h1 className="text-2xl font-bold">Error loading dashboard</h1>
        <p className="mt-2">{submissions.error}</p>
        <p className="mt-4 text-sm text-muted-foreground">
          Please ensure your Firestore security rules allow reads on the 'feedback' collection.
          You might need to update your rules to allow authenticated users to read data.
        </p>
      </div>
    )
  }

  return (
    <Suspense fallback={<Loading />}>
      <DashboardClient submissions={submissions} />
    </Suspense>
  );
}
