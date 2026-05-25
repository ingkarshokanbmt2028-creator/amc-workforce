import MetricPage from '@/components/MetricPage'

export default function ShiftAdherencePage() {
  return (
    <MetricPage
      metricKey="shiftAdherence"
      label="Shift adherence"
      description="Shifts that were clocked in AND out correctly"
      explanation="The strictest of the four: a shift only counts as 'adhered' if the person clocked in on time and clocked out at the expected end time."
      target={85}
      higherIsBetter={true}
      trendLabel="Daily shift adherence"
    />
  )
}
