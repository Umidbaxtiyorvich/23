import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLORS = ["#ff6b4a", "#4f7cff", "#10b981", "#a855f7", "#f59e0b"];

export interface ChartSpec {
  type: "bar" | "line";
  title: string;
  unit?: string;
  categories: string[];
  series: { name: string; data: number[] }[];
}

/** Writing Task 1 uchun grafik (ma'lumot test kontentidan olinadi). */
export default function TaskChart({ spec }: { spec: ChartSpec }) {
  const data = spec.categories.map((c, i) => ({ name: c, ...Object.fromEntries(spec.series.map((s) => [s.name, s.data[i]])) }));
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="mb-2 text-center text-sm font-bold">{spec.title}</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {spec.type === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} unit={spec.unit} />
              <Tooltip /><Legend />
              {spec.series.map((s, i) => <Line key={s.name} dataKey={s.name} stroke={COLORS[i % 5]} strokeWidth={2.5} dot />)}
            </LineChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} unit={spec.unit} />
              <Tooltip /><Legend />
              {spec.series.map((s, i) => <Bar key={s.name} dataKey={s.name} fill={COLORS[i % 5]} radius={[4, 4, 0, 0]} />)}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
