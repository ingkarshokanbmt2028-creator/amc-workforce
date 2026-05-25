import MetricPage from '@/components/MetricPage'

export default function AbsenteeismPage() {
  return (
    <MetricPage
      metricKey="absenteeism"
      label="Absenteeism rate"
      description="Expected shifts where staff didn't show up."
      explanation="The share of expected shifts where the person was a no-show. Doesn't include approved leave, only unaccounted absences."
      target={5}
      higherIsBetter={false}
      trendLabel="Daily absenteeism rate"
    />
  )
}
