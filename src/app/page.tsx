import FeedbackForm from '@/components/feedback-form'

export default function Home() {
  return (
    <div className="container max-w-4xl py-8 md:py-12">
      <section className="text-center">
        <h1 className="scroll-m-20 text-4xl font-bold tracking-tight text-primary lg:text-5xl font-headline">
          Share Your Feedback
        </h1>
        <p className="mt-4 text-lg text-muted-foreground whitespace-pre-wrap">
          To ensure that peers with Sickle Cell Disease (SCD) continue to receive optimal care when
interacting with the Ontario healthcare system, the Patient Feedback Portal is established by the
SCAGO to support patients in documenting the quality of care they receive, whether optimal or
sub-optimal.
        </p>
         <p className="mt-4 text-lg text-muted-foreground whitespace-pre-wrap">
Kindly note that the information collected on this portal wil be used to advance advocacy and
education in improving the quality of care delivered to peers with SCD in Ontario. Personal
identifying information provided, such as your name and contact details, will not be shared with
any hospital or third-party institution without your explicit consent. Together, we will drive
improved health outcomes for Ontario citizens with SCD.
        </p>
      </section>

      <section className="mt-12">
        <FeedbackForm />
      </section>
    </div>
  )
}
