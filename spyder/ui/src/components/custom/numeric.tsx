interface TemperatureProps {
  temp: any;
}
import { cn } from "@/lib/utils";
// import { useEffect } from "react";
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

  const getTempColor = (tempValue: any) => {
    // convert tempValue to a number
    const numTemp = parseFloat(tempValue);
    // using tailwindcss color classes
    if (numTemp < 20 || numTemp > 80) return "text-red-500"; // danger color
    if ((numTemp >= 20 && numTemp <= 25) || (numTemp >= 75 && numTemp <= 80))
      return "text-yellow-500"; // warning color
    return "text-green-500"; // safe color
  };

  return (
    <div className={cn("text-4xl font-bold", getTempColor(temp))}>
      {`${temp}°C`}
    </div>
  );
}

export default Numeric;
