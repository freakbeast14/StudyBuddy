"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ProgressChartPoint {
  name: string;
  due: number;
}

interface ProgressChartProps {
  data: ProgressChartPoint[];
}

export function ProgressChart({ data }: ProgressChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Next 7 days</CardTitle>
        <CardDescription>See how many cards are coming up each day.</CardDescription>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 0, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} domain={[0, (max: number) => max + 2]} />
            <Tooltip cursor={{ stroke: "hsl(var(--border))" }} />
            <Area
              type="monotone"
              dataKey="due"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary) / 0.2)"
              name="Due cards"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
