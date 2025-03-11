import net from "net";
import { WebSocket, WebSocketServer } from "ws";

interface VehicleData {
  battery_temperature: number;
  timestamp: number;
}

const TCP_PORT = 12000;
const WS_PORT = 8080;
const tcpServer = net.createServer();
const websocketServer = new WebSocketServer({ port: WS_PORT });

// Threshold tracking
const TEMPERATURE_HISTORY: { timestamp: number; value: number }[] = [];
const SAFE_TEMP_RANGE = { min: 20, max: 80 };
const EXCEED_LIMIT = 3; // More than 3 times in 5 seconds
const TIME_WINDOW_MS = 5000;

/**
 * Checks if the value is a valid number.
 */
function isValidNumber(value: any): boolean {
  return typeof value === "number" && !isNaN(value) && isFinite(value);
}

/**
 * Decodes binary-encoded temperature strings.
 */
function decodeBinaryTemperature(data: any): number | null {
  if (typeof data === "string") {
    try {
      const buffer = Buffer.from(data, "binary");
      return new Uint32Array(buffer.buffer)[0];
    } catch (error) {
      console.warn("Failed to decode binary temperature:", data);
      return null;
    }
  }
  return null;
}

/**
 * Validates and filters incoming vehicle data.
 */
function validateVehicleData(data: any): VehicleData | null {
  if (!data || typeof data !== "object") return null;
  if (!("battery_temperature" in data) || !("timestamp" in data)) return null;

  let temperature: number;

  if (typeof data.battery_temperature === "string") {
    // Try decoding binary string
    const decodedTemp = decodeBinaryTemperature(data.battery_temperature);
    if (decodedTemp !== null) {
      temperature = decodedTemp;
    } else {
      console.warn(
        `Invalid battery_temperature format: ${data.battery_temperature}`
      );
      return null;
    }
  } else {
    temperature = Number(data.battery_temperature);
  }

  if (!isValidNumber(temperature)) {
    console.warn(`Invalid battery_temperature value: ${temperature}`);
    return null;
  }

  return { battery_temperature: temperature, timestamp: data.timestamp };
}

/**
 * Logs temperature exceedances and checks if the threshold is exceeded.
 */
function logTemperatureExceedance(temp: number, timestamp: number) {
  // Store new entry
  TEMPERATURE_HISTORY.push({ timestamp, value: temp });

  // Remove old entries beyond the time window
  const currentTime = Date.now();
  while (
    TEMPERATURE_HISTORY.length > 0 &&
    currentTime - TEMPERATURE_HISTORY[0].timestamp > TIME_WINDOW_MS
  ) {
    TEMPERATURE_HISTORY.shift();
  }

  // Count exceedances
  const exceedCount = TEMPERATURE_HISTORY.filter(
    (entry) =>
      entry.value < SAFE_TEMP_RANGE.min || entry.value > SAFE_TEMP_RANGE.max
  ).length;

  if (exceedCount > EXCEED_LIMIT) {
    console.error(
      `[ALERT] Battery temperature exceeded safe range more than ${EXCEED_LIMIT} times in ${
        TIME_WINDOW_MS / 1000
      } seconds! Timestamp: ${timestamp}`
    );
  }
}

tcpServer.on("connection", (socket) => {
  console.log("TCP client connected");

  socket.on("data", (msg) => {
    const message: string = msg.toString().trim();
    console.log(`Received raw data: ${message}`);

    try {
      const parsedData: any = JSON.parse(message);
      const validatedData = validateVehicleData(parsedData);

      if (!validatedData) {
        console.warn(`Filtered out invalid data: ${message}`);
        return;
      }

      const { battery_temperature, timestamp } = validatedData;

      // Check and log temperature exceedances
      if (
        battery_temperature < SAFE_TEMP_RANGE.min ||
        battery_temperature > SAFE_TEMP_RANGE.max
      ) {
        logTemperatureExceedance(battery_temperature, timestamp);
        console.warn(
          `Ignoring out-of-range temperature: ${battery_temperature}°C`
        );
        return;
      }

      // Send JSON over WS to frontend clients
      websocketServer.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(validatedData));
        }
      });
    } catch (error) {
      console.error(`Error parsing data: ${message}`, error);
    }
  });

  socket.on("end", () => {
    console.log("Closing connection with the TCP client");
  });

  socket.on("error", (err) => {
    console.log("TCP client error: ", err);
  });
});

websocketServer.on("listening", () =>
  console.log(`Websocket server started on port ${WS_PORT}`)
);

websocketServer.on("connection", (ws: WebSocket) => {
  console.log("Frontend websocket client connected");
  ws.on("error", console.error);
});

tcpServer.listen(TCP_PORT, () => {
  console.log(`TCP server listening on port ${TCP_PORT}`);
});
