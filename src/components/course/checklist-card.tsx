"use client";

import { Pie, PieChart, ResponsiveContainer, Cell } from "recharts";
import { CheckCircle2, Circle } from "lucide-react";

interface ChecklistCardProps {
  readyDocs: number;
  hasOutline: boolean;
  hasCards: boolean;
  hasReviews: boolean;
}

export function ChecklistCard({
  readyDocs,
  hasOutline,
  hasCards,
  hasReviews,
}: ChecklistCardProps) {
  const steps = [
    { label: "PDF", done: readyDocs > 0, color: "#f97316" },
    { label: "Outline", done: hasOutline, color: "#38bdf8" },
    { label: "Cards", done: hasCards, color: "#22c55e" },
    { label: "Session", done: hasReviews, color: "#a855f7" },
  ];
  const completedCount = steps.filter((step) => step.done).length;
  const donutData = steps.map((step) => ({
    name: step.label,
    value: 1,
    color: step.done ? step.color : "#e5e7eb",
  }));

  return (
    <div className="rounded-lg border border-white/60 bg-white/60 px-4 py-3 text-xs text-muted-foreground">
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">Setup progress</span>
        <span className="text-muted-foreground">{completedCount}/4</span>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <div className="relative h-20 w-20" aria-label={`Setup progress ${completedCount} of ${steps.length}`}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={donutData} dataKey="value" innerRadius={28} outerRadius={40} paddingAngle={4}>
                {donutData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white text-[10px] font-semibold text-foreground">
              {Math.round((completedCount / steps.length) * 100)}%
            </div>
          </div>
        </div>
        <div className="grid gap-1">
          {steps.map((step) => (
            <div key={step.label} className="flex items-center gap-2 text-[11px]">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: step.done ? step.color : "#e5e7eb" }}
              />
              <span className={step.done ? "text-foreground" : "text-muted-foreground"}>{step.label}</span>
              {step.done ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
