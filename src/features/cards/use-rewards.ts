import { createContext, useContext } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import type { CollectionData, processRewardBatch } from "./collection-api";
type Value = {
  collections: UseQueryResult<CollectionData, Error>;
  processing: UseQueryResult<
    Awaited<ReturnType<typeof processRewardBatch>>,
    Error
  >;
};
export const RewardsContext = createContext<Value | null>(null);
export function useRewards() {
  const value = useContext(RewardsContext);
  if (!value) throw new Error("RewardsProvider required");
  return value;
}
