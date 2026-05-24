import MetricPage from '@/components/MetricPage'

export default function OvertimePage() {
  return (
    <MetricPage
      metricKey="overtimeRate"
      label="Overtime rate"
      description="Share of staff working more than 9 hours in a shift"
      explanation="Counts any employee clocked in for more than 9 hours as overtime. High overtime may indicate understaffing or scheduling gaps."
      target={20}
      higherIsBetter={false}
    />
  )
}
