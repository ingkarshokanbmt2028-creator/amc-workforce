import MetricPage from '@/components/MetricPage'

export default function PunctualityPage() {
  return (
    <MetricPage
      metricKey="punctuality"
      label="Punctuality rate"
      description="On-time clock-ins as a share of all clock-ins"
      explanation="Counts a clock-in as punctual if it happened before the expected shift start. People who showed up but were late count as present, but not punctual."
      target={90}
      higherIsBetter={true}
      trendLabel="Daily punctuality rate"
    />
  )
}
