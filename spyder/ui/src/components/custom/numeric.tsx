interface TemperatureProps {
  temp: any;
}
import { cn } from "@/lib/utils";
import { useEffect } from "react";
/**
 * Numeric component that displays the temperature value.
 *
 * @param {number} props.temp - The temperature value to be displayed.
 * @returns {JSX.Element} The rendered Numeric component.
 */
function Numeric({ temp }: TemperatureProps) {
  // TODO: Change the color of the text based on the temperature
  // HINT:
  //  - Consider using cn() from the utils folder for conditional tailwind styling
  //  - (or) Use the div's style prop to change the colour
  //  - (or) other solution

  // Justify your choice of implementation in brainstorming.md

  const getTempColor = (temp: number) => {
    if (temp < 20 || temp > 80) return "text-danger"; // Unsafe (Red)
    if ((temp >= 20 && temp <= 25) || (temp >= 75 && temp <= 80))
      return "text-warning"; // Nearing unsafe (Yellow)
    return "text-safe"; // Safe (Green)
  };

  return (
    <div className={cn("text-4xl font-bold", getTempColor(temp))}>
      {`${temp}°C`}
    </div>
  );
}

export default Numeric;
