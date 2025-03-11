"use client";

import { useState, useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TemperatureGraphProps {
  temperature: number;
}

export default function TemperatureGraph({
  temperature,
}: TemperatureGraphProps) {
  const [data, setData] = useState<{ time: string; temp: number }[]>([]);
  const lastTemperature = useRef<number | null>(null);

  useEffect(() => {
    if (temperature === null) return;

    if (
      lastTemperature.current !== null &&
      Math.abs(temperature - lastTemperature.current) > 50
    ) {
      return;
    }
    lastTemperature.current = temperature;

    const now = new Date();
    const formattedTime = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

    setData((prev) => {
      const newData = [...prev, { time: formattedTime, temp: temperature }];
      return newData.length > 20 ? newData.slice(1) : newData; // record last 20 data points
    });
  }, [temperature]);

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" />
        <YAxis domain={[0, 100]} /> {/* 0-100% */}
        <Tooltip />
        <Line
          type="monotone"
          dataKey="temp"
          stroke="#10B981"
          strokeWidth={2}
          dot={false}
          animationDuration={500} // make it more smooth
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
