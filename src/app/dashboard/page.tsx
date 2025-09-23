import { getSubmissions } from "./actions";
import DashboardClient from "./client";
import { Suspense } from "react";
import Loading from "../loading";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


export default async function DashboardPage() {
  const submissionsOrError = await getSubmissions();

  if ('error' in submissionsOrError) {
    return (
      <div className="container max-w-2xl py-8 text-center">
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Dashboard</AlertTitle>
            <AlertDescription>
                <p className="mb-2">{submissionsOrError.error}</p>
                <p className="text-xs">
                Please ensure your Firestore security rules allow reads on the 'feedback' collection.
                </p>
            </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <Suspense fallback={<Loading />}>
      <DashboardClient submissions={submissionsOrError} />
    </Suspense>
  );
}
