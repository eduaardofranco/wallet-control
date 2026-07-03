import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function renderTooltip(props, tooltipFormatter) {
  if (!props.active || !props.payload?.length) return null;
  return (
    <div style={{ background: 'white', border: '1px solid var(--gray-200, #e5e7eb)', borderRadius: 6, padding: '0.5rem 0.75rem', fontSize: 13, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <div style={{ color: 'var(--gray-500)' }}>{props.label}</div>
      <div style={{ fontWeight: 600 }}>{tooltipFormatter(props.payload[0].value)}</div>
    </div>
  );
}

// Shared styling (color, hover fill, shadowless tooltip) for the Portfolio Growth
// and Dividends-by-month bar charts, which only differ in data and value formatting.
/* eslint-disable react/prop-types */
export default function GrowthBarChart({ data, xKey = 'month', height = 300, tooltipFormatter, yTickFormatter }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={yTickFormatter} />
        <Tooltip cursor={false} content={props => renderTooltip(props, tooltipFormatter)} />
        <Bar dataKey="value" fill="#16a34a" activeBar={{ fill: '#12823b' }} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
/* eslint-enable react/prop-types */
