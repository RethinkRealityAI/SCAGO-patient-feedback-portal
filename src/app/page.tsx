import FeedbackForm from '@/components/feedback-form'

export default function Home() {
  return (
    <div className="container max-w-4xl py-8 md:py-12">
      <section className="text-center">
        <h1 className="scroll-m-20 text-4xl font-bold tracking-tight text-primary lg:text-5xl font-headline">
          Share Your Story
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Your experience matters. Help us improve sickle cell care in Ontario by sharing your feedback. All submissions can be made anonymously.
        </p>
      </section>

      <section className="mt-12">
        <FeedbackForm />
      </section>
    </div>
  )
}
