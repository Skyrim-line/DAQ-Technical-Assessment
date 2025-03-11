# Brainstorming

This file is used to document your thoughts, approaches and research conducted across all tasks in the Technical Assessment.

## Firmware

## Spyder

My solution here:

### **Task 1: Install and Configure `nodemon`**

### **Objective**

The UI service runs inside a Docker container, meaning that any changes made to the code will not be immediately reflected unless the container is rebuilt.
 To **avoid manually restarting the container each time a change is made**, we will install and configure **`nodemon`**, a package that **automatically restarts the Node.js application when files change**.

------

### **Step 1: Install `nodemon`**

1. Navigate to folder

   ```bash
   cd DAQ-Technical-Assessment/spyder/ui
   ```

2. Install nodemon

   ```bash
   npm install --save-dev nodemon
   ```

------

### **Step 2: Modify `package.json`**

1. Open the `package.json` file inside the `ui` directory then modify the scripts like following:

   ```json
   "scripts": {
     "dev": "nodemon server.js",
   }
   ```

### Task 2

#### Problem Statement

1. Data can be encoded as a binary string

- If `Math.random() < BINARY_PROBABILITY`, the `battery_temperature` is converted into a binary-encoded string.
- Our `streaming-service` must detect and decode these cases.

2. Temperature values may be out of range

- The generator occasionally sends temperatures outside of 20-80°C.
- We need to decide how to handle these (ignore, log, replace with defaults, etc.).

3. Temperature values might be missing or malformed

- Example: `{ "timestamp": 1700000000 }` (missing `battery_temperature`).
- We must validate data before sending it to the frontend.

#### How to solve this problem

After viewed code in server.ts and battery_emulator.ts, here are my ways to solve this problem:

1. Parse Incoming Data Safely

    Use `try-catch` to prevent crashes when parsing JSON.     

    Log errors for debugging.  

2. Validate `battery_temperature`  (Add a functino to validate data corre)

   Ensure the value exists and is a valid number. If encoded as a binary string, decode it before processing. And ignore messages where `battery_temperature` is `NaN` or infinite. 

   ```ts
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
   ```

   

3. Filter Out Invalid Data

   Reject malformed data (e.g., missing fields, incorrect types). Then log warnings for discarded messages.  

4. Finally send only valid data to the frontend

​		If the data passes validation, broadcast it to WebSocket clients.  

### Task 3

#### **Filtering Out-of-Range Temperatures**

First, we ensured that any battery temperature data received from the `data-emulator` is validated before being forwarded to the frontend. Since the **safe operating range** for battery temperature is **20-80°C**, we introduced a function `validateTemperature(temp: number)` that checks whether the received temperature falls within this range. If the temperature is **below 20°C or above 80°C**, the system logs a warning message and ignores the data, preventing it from being displayed on the frontend. This guarantees that only **valid and safe values** reach the UI.

#### **Tracking and Logging Temperature Exceedances**

Since individual temperature spikes may not always indicate a serious issue, we implemented a **rolling 5-second monitoring window** to track whether temperatures exceed the safe range **more than 3 times within 5 seconds**. We used an array `TEMPERATURE_HISTORY` to store timestamps and temperature values of each exceedance. Every time an out-of-range temperature is detected, the system:

```typescript
const TEMPERATURE_HISTORY: { timestamp: number; value: number }[] = [];
const EXCEED_LIMIT = 3;
const TIME_WINDOW_MS = 5000;

function logTemperatureExceedance(temp: number, timestamp: number) {
  // Store the exceedance record
  TEMPERATURE_HISTORY.push({ timestamp, value: temp });

  // Remove old exceedances (outside the 5-second window)
  const currentTime = Date.now();
  while (TEMPERATURE_HISTORY.length > 0 && currentTime - TEMPERATURE_HISTORY[0].timestamp > TIME_WINDOW_MS) {
    TEMPERATURE_HISTORY.shift();
  }

  // Count how many times the temperature exceeded the safe range
  const exceedCount = TEMPERATURE_HISTORY.filter(
    (entry) => entry.value < SAFE_TEMP_RANGE.min || entry.value > SAFE_TEMP_RANGE.max
  ).length;

  // If threshold exceeded, print an alert
  if (exceedCount > EXCEED_LIMIT) {
    console.error(`[ALERT] Battery temperature exceeded safe range more than ${EXCEED_LIMIT} times in ${TIME_WINDOW_MS / 1000} seconds!`);
    console.error(`Timestamp: ${formatTimestamp(timestamp)}, Temperature: ${temp}°C`);
  }
}
```

#### **Formatting Timestamps for Readability**

To ensure that all log messages contain human-readable timestamps instead of raw UNIX timestamps, we implemented a function `formatTimestamp(timestamp: number)`. This function **converts timestamps into a local date-time string**, making debugging and issue tracking much more intuitive.

```typescript
function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString(); // Converts UNIX timestamp to readable format
}
```

```plaintext
[ALERT] Battery temperature exceeded safe range more than 3 times in 5 seconds!
Timestamp: 2025-03-10 14:35:20, Temperature: 95°C
```

### Task4

The Connect/Disconnect button in the UI does not update correctly because the WebSocket connection status (`readyState`) is not re-evaluated when the streaming service sends data. This is likely due to:

1. The effect hook monitoring `readyState` missing necessary dependencies
   - If the `useEffect` handling WebSocket state changes does not include `readyState` in its dependency array, it won’t update when the connection state changes.
2. WebSocket state not triggering re-renders properly
   - If the `connectionStatus` state is updated outside the `useEffect` that listens for WebSocket state changes, the UI might not re-render correctly.

I already added readyState in useEffect this hook, another thing need to do is move WebSocket logic into a centralized context

```ts
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
}, [readyState]);  // Ensure `readyState` is included
```

### Task5

* Ensure the data displayed from `streaming-service` is correct to **3 decimal places** instead of being unbounded as it is currently.

To solve this question, i modified numeric.tsx file to apply `.toFixed(3)` to the temperature value. Ensure that `temp` is always a valid number. 

```tsx
return (
  <div className={`text-4xl font-bold ${getTempColor(temp)}`}>
    {`${temp.toFixed(3)}°C`}
  </div>
);
```

* Ensure the battery temperature value changes colours based on the current temperature (E.g. changing to red when the safe temperature range is exceeded).

To solve this question, I modified tailwind.config.js file to define three different range of colors, then I Implement a function `getTempColor(temp)` to return the correct class.

```tsx
theme: {
    extend: {
      colors: {
        safe: "#10B981", // Green
        warning: "#F59E0B", // Yellow
        danger: "#EF4444", // Red
      },
```

Here is code implementated in Numeric.tsx file 

```tsx
const getTempColor = (temp: number) => {
  if (temp < 20 || temp > 80) return "text-danger";
  if ((temp >= 20 && temp <= 25) || (temp >= 75 && temp <= 80)) return "text-warning";
  return "text-safe";
};
 return (
    <div className={cn("text-4xl font-bold", getTempColor(temp))}>
      {`${temp.toFixed(3)}°C`}
    </div>
  );
```

* Create three additional features in the provided system. **These should involve visible changes in the `ui` but do not have to exclusively involve the ui** (E.g. error messages interface, light-mode toggle, graphing data).

### **Live Temperature Graph**

#### **Approach:**

- Use `recharts` to create a real-time line graph.
- Store the last **20 temperature values** to display trends.

```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface GraphProps {
  data: { timestamp: string; battery_temperature: number }[];
}

export default function Graph({ data }: GraphProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" />
        <YAxis domain={[0, 100]} />
        <Tooltip />
        <Line type="monotone" dataKey="battery_temperature" stroke="#8884d8" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```



### **Toast Notifications for Unsafe Temperatures**

#### **Approach:**

- Use `react-toastify` to show notifications when **temperature is out of range**.
- Display an error message if temperature <20°C or >80°C.

```tsx
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

useEffect(() => {
  if (lastJsonMessage && (lastJsonMessage.battery_temperature < 20 || lastJsonMessage.battery_temperature > 80)) {
    toast.error(`Temperature out of range: ${lastJsonMessage.battery_temperature.toFixed(3)}°C`, {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: true,
    });
  }
}, [lastJsonMessage]);
```

Then we add this in page.tsx as `<ToastContainer />`

### **Dark/Light Mode Toggle**

To create additional features, personally I feel like build dark mode and light mode switches so that user can have a better experience when looking through websites. In order to solve this I use `next-themes` to allow users to switch between dark and light mode. In order to solve this we need to add a button and two different icons for user to click on.

```ts
"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 rounded-lg transition-all duration-200"
    >
      {theme === "dark" ? <Sun className="h-5 w-5 text-yellow-400" /> : <Moon className="h-5 w-5 text-gray-900" />}
    </button>
  );
}
```

