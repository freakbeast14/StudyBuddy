"use client";

interface HeatmapDay {
  label: string;
  count: number;
}

export function WeeklyHeatmap({ data }: { data: HeatmapDay[] }) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {data.map((day) => (
        <div key={day.label} className="flex flex-col items-center gap-2">
          <div
            className="h-10 w-10 rounded-lg border border-white/70"
            style={{
              backgroundColor: `rgba(34, 197, 94, ${Math.min(0.15 + day.count * 0.12, 0.85)})`,
            }}
          />
          <span className="text-[10px] text-muted-foreground">{day.label}</span>
        </div>
      ))}
    </div>
  );
}
