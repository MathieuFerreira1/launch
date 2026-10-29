import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PageHeader, LoadingState } from "@/components/ui/states";
import { useAuth } from "@/features/auth/auth-context";
import { getSupabaseClient } from "@/lib/supabase";
import type { StoredSource } from "./activity-api";
export function SourcesPage() {
  const owner = useAuth().session!.user.id;
  const [page, setPage] = useState(0);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const q = useQuery({
    queryKey: ["sources", owner, page],
    queryFn: async () => {
      const { data, error, count } = await getSupabaseClient()
        .from("activity_files")
        .select("id,original_name,storage_path,format,bytes,retained", {
          count: "exact",
        })
        .eq("retained", true)
        .order("created_at", { ascending: false })
        .range(page * 50, page * 50 + 49);
      if (error) throw error;
      return { items: data as StoredSource[], count: count ?? 0 };
    },
  });
  async function remove(f: StoredSource) {
    setPending(true);
    setError("");
    try {
      const c = getSupabaseClient();
      const { error } = await c.storage
        .from("sport-sources")
        .remove([f.storage_path]);
      if (error) throw error;
      const r = await c.rpc("forget_activity_source", { p_id: f.id });
      if (r.error) throw r.error;
      setConfirm(null);
      await q.refetch();
    } catch {
      setError("Suppression non terminée. Réessaie.");
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Tes sources privées."
        description="Supprime les originaux dont tu n’as plus besoin, y compris ceux d’un import abandonné. Les activités normalisées restent dans ton historique."
      />
      {q.isPending ? (
        <LoadingState />
      ) : q.isError ? (
        <div role="alert">
          <p>Sources indisponibles.</p>
          <Button onClick={() => void q.refetch()}>Réessayer</Button>
        </div>
      ) : (
        <>
          <p>{q.data.count} fichiers conservés ou réservés pour une reprise.</p>
          {q.data.items.map((f) => (
            <div className="panel padded source-row" key={f.id}>
              <h2 className="file-name">{f.original_name}</h2>
              <p>
                {(f.bytes / 1024 / 1024).toFixed(2)} Mo ·{" "}
                {f.format.toUpperCase()}
              </p>
              {confirm === f.id ? (
                <div role="alert">
                  <p>
                    Supprimer définitivement ce fichier ? Sa réanalyse future ne
                    sera plus garantie.
                  </p>
                  <div className="actions">
                    <Button disabled={pending} onClick={() => void remove(f)}>
                      Confirmer la suppression
                    </Button>
                    <Button variant="ghost" onClick={() => setConfirm(null)}>
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  disabled={pending}
                  variant="outline"
                  onClick={() => setConfirm(f.id)}
                >
                  Supprimer le fichier
                </Button>
              )}
            </div>
          ))}
          <div className="actions">
            <Button
              variant="outline"
              disabled={!page}
              onClick={() => setPage((n) => n - 1)}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              disabled={(page + 1) * 50 >= q.data.count}
              onClick={() => setPage((n) => n + 1)}
            >
              Suivant
            </Button>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </>
  );
}
