import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function distance(metres: number) {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(metres / 1000)} km`;
}
export function date(utc: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(new Date(utc));
}
export function duration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`
    : `${minutes} min`;
}
