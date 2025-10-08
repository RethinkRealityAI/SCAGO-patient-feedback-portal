import DashboardClient from "./client";
import { Suspense } from "react";
import Loading from "../loading";

export default async function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DashboardClient />
    </Suspense>
  );
}
