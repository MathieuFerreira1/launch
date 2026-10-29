import type { Sport } from "@/features/cards/types";
export interface Activity {
  id: string;
  title: string;
  category: Sport | "unsupported" | "unknown";
  originalSport: string;
  startedAtUtc: string;
  distanceM: number;
  durationS: number;
  elevationM: number;
  evidence: "file_import" | "self_reported";
  status: "valid" | "needs_review";
}
