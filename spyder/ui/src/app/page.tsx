"use client";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Thermometer, AlertTriangle } from "lucide-react";
import Numeric from "../components/custom/numeric";
import TemperatureGraph from "../components/custom/TempGraph";
import ThemeToggle from "../components/custom/ThemeToggle";
import { useData } from "../components/context/data-wrapper";
import RedbackLogoDarkMode from "../../public/logo-darkmode.svg";
import RedbackLogoLightMode from "../../public/logo-lightmode.svg";

export default function Page(): JSX.Element {
  const { resolvedTheme } = useTheme();
  const { temperature, abnormalTemperatures, connectionStatus } = useData();
  const [clientTheme, setClientTheme] = useState<string | undefined>(undefined);

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

      <main className="flex-grow flex flex-col items-center justify-center p-8">
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

        {/* Temperature graph */}
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

        {/* Abnormal temperature logs */}
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
