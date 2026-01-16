"use client";

import { Pie, PieChart, ResponsiveContainer, Cell } from "recharts";

interface DonutDatum {
  name: string;
  value: number;
  color: string;
}

export function DueDonut({ data }: { data: DonutDatum[] }) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={4}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
