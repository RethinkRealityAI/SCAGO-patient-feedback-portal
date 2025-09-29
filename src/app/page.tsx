import { getSurveys } from './actions';
import SurveyList from '@/components/survey-list';

export default async function SurveysPage() {
  const surveys = await getSurveys();

  return <SurveyList surveys={surveys} />;
}
