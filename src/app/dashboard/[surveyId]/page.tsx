import { Suspense } from 'react'
import SurveyDashboardClient from './client'
import Loading from '@/app/loading'

export default async function SurveyDashboardPage({ params }: { params: { surveyId: string } }) {
  const { surveyId } = await params

  return (
    <Suspense fallback={<Loading />}>
      <SurveyDashboardClient surveyId={surveyId} />
    </Suspense>
  )
}


