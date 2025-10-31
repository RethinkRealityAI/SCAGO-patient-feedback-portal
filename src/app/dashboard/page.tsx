import DashboardClient from "./client";
import { Suspense } from "react";
import Loading from "../loading";

// Force dynamic rendering and disable caching for this page
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DashboardClient />
    </Suspense>
  );
}
