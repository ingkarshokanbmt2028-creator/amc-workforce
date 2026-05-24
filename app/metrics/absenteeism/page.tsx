import MetricPage from '@/components/MetricPage'

export default function AbsenteeismPage() {
  return (
    <MetricPage
      metricKey="absenteeism"
      label="Absenteeism rate"
      description="Share of staff who were absent or did not clock in today"
      explanation="Counts staff with no clock-in or an ABSENT status as absent. A high absenteeism rate may indicate scheduling, wellbeing, or management issues."
      target={10}
      higherIsBetter={false}
    />
  )
}
