"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";

export function RateChart({ treatment, control }: { treatment: number; control: number }) {
  const data = [
    { arm: "Control", rate: control },
    { arm: "Treatment", rate: treatment },
  ];
  const max = Math.max(10, Math.ceil((Math.max(treatment, control) * 1.25) / 10) * 10);
  return (
    <div className="h-44 w-full" role="img" aria-label={`Booking rate: control ${control}%, treatment ${treatment}%`}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 176 }}>
        <BarChart data={data} margin={{ top: 20, right: 8, bottom: 0, left: 0 }} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke="#dce1de" strokeDasharray="2 4" />
          <XAxis dataKey="arm" tickLine={false} axisLine={{ stroke: "#dce1de" }} tick={{ fontSize: 12, fill: "#3d4a46" }} />
          <YAxis
            domain={[0, Math.min(100, max)]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#5f6b67" }}
            tickFormatter={(v: number) => `${v}%`}
            width={44}
          />
          <Bar dataKey="rate" radius={[4, 4, 0, 0]} isAnimationActive={false} maxBarSize={72}>
            {data.map((d) => (
              <Cell key={d.arm} fill={d.arm === "Treatment" ? "#0e5c49" : "#c8c1b6"} />
            ))}
            <LabelList
              dataKey="rate"
              position="top"
              formatter={(v: unknown) => `${Number(v).toFixed(1)}%`}
              style={{ fontSize: 12, fontWeight: 600, fill: "#15201d" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
