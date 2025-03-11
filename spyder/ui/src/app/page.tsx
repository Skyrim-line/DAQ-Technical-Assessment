"use client";

import { useState, useEffect } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { useTheme } from "next-themes";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Thermometer, AlertTriangle } from "lucide-react";
import Numeric from "../components/custom/numeric";
import TemperatureGraph from "../components/custom/TempGraph";
import ThemeToggle from "../components/custom/ThemeToggle";
import RedbackLogoDarkMode from "../../public/logo-darkmode.svg";
import RedbackLogoLightMode from "../../public/logo-lightmode.svg";

const WS_URL = "ws://localhost:8080";
const SAFE_TEMP_RANGE = { min: 20, max: 80 };

interface VehicleData {
  battery_temperature: number;
  timestamp: number;
}

export default function Page(): JSX.Element {
  const { resolvedTheme } = useTheme();
  const [clientTheme, setClientTheme] = useState<string | undefined>(undefined);
  const [temperature, setTemperature] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<string>("Disconnected");
  const [abnormalTemperatures, setAbnormalTemperatures] = useState<
    { temperature: number; timestamp: string }[]
  >([]);

  const {
    lastJsonMessage,
    readyState,
  }: { lastJsonMessage: VehicleData | null; readyState: ReadyState } =
    useWebSocket(WS_URL, {
      share: false,
      shouldReconnect: () => true,
    });

  useEffect(() => {
    switch (readyState) {
      case ReadyState.OPEN:
        setConnectionStatus("Connected");
        break;
      case ReadyState.CLOSED:
        setConnectionStatus("Disconnected");
        break;
      case ReadyState.CONNECTING:
        setConnectionStatus("Connecting");
        break;
      default:
        setConnectionStatus("Disconnected");
        break;
    }
  }, [readyState]);

  useEffect(() => {
    if (lastJsonMessage === null) return;

    const { battery_temperature, timestamp } = lastJsonMessage;
    setTemperature(battery_temperature);

    // record abnormal temperatures
    if (
      battery_temperature < SAFE_TEMP_RANGE.min ||
      battery_temperature > SAFE_TEMP_RANGE.max
    ) {
      setAbnormalTemperatures((prev) => {
        const formattedTime = new Date(timestamp).toLocaleTimeString();
        const newAbnormal = [
          { temperature: battery_temperature, timestamp: formattedTime },
          ...prev,
        ];
        return newAbnormal.slice(0, 10); // Keep 10 most recent logs
      });
    }
  }, [lastJsonMessage]);

  useEffect(() => {
    setClientTheme(resolvedTheme);
  }, [resolvedTheme]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-5 h-20 flex items-center gap-5 border-b">
        {clientTheme && (
          <Image
            src={
              clientTheme === "dark"
                ? RedbackLogoDarkMode
                : RedbackLogoLightMode
            }
            className="h-12 w-auto"
            alt="Redback Racing Logo"
            priority
          />
        )}
        <h1 className="text-foreground text-xl font-semibold">
          DAQ Technical Assessment
        </h1>
        <ThemeToggle />
        <Badge
          variant={connectionStatus === "Connected" ? "success" : "destructive"}
          className="ml-auto"
        >
          {connectionStatus}
        </Badge>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center p-8 ">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-light flex items-center gap-2">
              <Thermometer className="h-6 w-6" />
              Live Battery Temperature
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <Numeric
              temp={temperature !== null ? temperature.toFixed(3) : "N/A"}
            />
          </CardContent>
        </Card>

        {/* 温度趋势折线图 */}
        <div className="mt-8 w-full max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-light">
                Temperature Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TemperatureGraph temperature={temperature ?? 0} />
            </CardContent>
          </Card>
        </div>

        {/* Abnormal Temperature Logs here just record 10 messages here */}
        <div className="mt-8 w-full max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-light flex items-center gap-2 text-yellow-500">
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
                Abnormal Temperature Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {abnormalTemperatures.length > 0 ? (
                <ul className="space-y-2">
                  {abnormalTemperatures.map((item, index) => (
                    <li
                      key={index}
                      className="flex justify-between text-red-500 font-semibold"
                    >
                      <span>{item.timestamp}</span>
                      <span>{item.temperature.toFixed(3)}°C</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">
                  No abnormal temperatures recorded.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
