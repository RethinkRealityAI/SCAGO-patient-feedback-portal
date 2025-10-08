import { Suspense } from 'react';
import Loading from '../loading';
import YouthEmpowermentClient from './client';

export default async function YouthEmpowermentPage() {
  return (
    <Suspense fallback={<Loading />}>
      <YouthEmpowermentClient />
    </Suspense>
  );
}
