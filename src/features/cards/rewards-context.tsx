import { useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/states";
import { loadCollections, processRewardBatch } from "./collection-api";
import { RewardsContext, useRewards } from "./use-rewards";

function useRewardQueries(owner: string) {
  const cache = useQueryClient();
  const processing = useQuery({
    queryKey: ["reward-processing", owner],
    queryFn: processRewardBatch,
    retry: 1,
    refetchInterval: (q) =>
      q.state.status !== "error" && q.state.data?.status === "processing"
        ? 150
        : false,
  });
  const collections = useQuery({
    queryKey: ["collection-data", owner],
    queryFn: loadCollections,
    staleTime: 30000,
    retry: 1,
    enabled: processing.data?.status === "ready",
  });
  useEffect(() => {
    if (processing.data?.status === "ready") {
      void cache.invalidateQueries({ queryKey: ["collection-data", owner] });
      void cache.invalidateQueries({ queryKey: ["reveal", owner] });
    }
  }, [processing.dataUpdatedAt, processing.data?.status, cache, owner]);
  return { processing, collections };
}
export function RewardsProvider({ children }: { children: ReactNode }) {
  const owner = useAuth().session!.user.id;
  const value = useRewardQueries(owner);
  return (
    <RewardsContext.Provider value={value}>{children}</RewardsContext.Provider>
  );
}
export function RewardsStatus() {
  const { processing } = useRewards();
  if (processing.isError)
    return (
      <div className="panel padded" role="alert">
        <p>
          Le calcul de tes cartes est interrompu. Tes activités et cartes
          acquises restent enregistrées.
        </p>
        <Button variant="outline" onClick={() => void processing.refetch()}>
          Reprendre le calcul
        </Button>
      </div>
    );
  if (processing.isFetching && processing.data?.status === "ready")
    return (
      <p className="small" role="status">
        Vérification de tes collections…
      </p>
    );
  if (processing.isPending || processing.data?.status === "processing")
    return (
      <div className="panel padded reward-progress" role="status">
        <p>Ta collection se prépare…</p>
        {processing.data && (
          <>
            <progress
              value={processing.data.processed}
              max={Math.max(1, processing.data.total)}
              aria-label="Calcul de la collection"
            />
            <span>
              {processing.data.processed} / {processing.data.total} activités
              examinées
            </span>
          </>
        )}
      </div>
    );
  return null;
}
export function CollectionLoading() {
  const { processing } = useRewards();
  return (
    <>
      <RewardsStatus />
      {processing.data?.status === "ready" &&
        !processing.isError &&
        !processing.isFetching && <LoadingState />}
    </>
  );
}
export function RewardsNotice() {
  const { collections, processing } = useRewards();
  const pending = collections.data?.pending[0];
  if (
    !pending ||
    processing.data?.status !== "ready" ||
    processing.isError ||
    processing.isFetching
  )
    return null;
  return (
    <div className="rewards-notice panel">
      <Sparkles size={25} />
      <div>
        <strong>
          {pending.kind === "initial_collection"
            ? "Ta collection prend vie."
            : "De nouveaux souvenirs t’attendent."}
        </strong>
        <p>
          {pending.card_count}{" "}
          {pending.card_count > 1
            ? "cartes déjà acquises, prêtes"
            : "carte déjà acquise, prête"}{" "}
          à découvrir.
        </p>
      </div>
      <Button asChild>
        <Link to={`/reveal/${pending.id}`}>
          {pending.status === "viewing"
            ? "Reprendre la découverte"
            : "Découvrir mes cartes"}
        </Link>
      </Button>
    </div>
  );
}
