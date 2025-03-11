"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";

const WS_URL = "ws://localhost:8080";
const SAFE_TEMP_RANGE = { min: 20, max: 80 };

interface VehicleData {
  battery_temperature: number;
  timestamp: number;
}

interface DataContextType {
  temperature: number | null;
  abnormalTemperatures: { temperature: number; timestamp: string }[];
  connectionStatus: string;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataWrapper({ children }: { children: ReactNode }) {
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

    // 记录异常温度
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
        return newAbnormal.slice(0, 10); // only keep the last 10 abnormal temperatures
      });
    }
  }, [lastJsonMessage]);

  return (
    <DataContext.Provider
      value={{ temperature, abnormalTemperatures, connectionStatus }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataWrapper");
  }
  return context;
}
