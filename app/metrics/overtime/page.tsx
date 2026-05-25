import MetricPage from '@/components/MetricPage'

export default function OvertimePage() {
  return (
    <MetricPage
      metricKey="overtimeRate"
      label="Overtime rate"
      description="Staff working beyond scheduled hours"
      explanation="The share of staff who worked beyond their scheduled hours in the period. Some overtime is healthy; consistently high overtime usually signals a staffing gap."
      target={15}
      higherIsBetter={false}
      trendLabel="Daily overtime rate"
    />
  )
}
