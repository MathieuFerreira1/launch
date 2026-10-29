import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Database, LogOut } from "lucide-react";
import { PageHeader } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import type { DemoData } from "@/lib/demo";
import { distance, duration } from "@/lib/utils";
import { useDemoSession } from "@/features/auth/demo-session";
export function ProfilePage({ data }: { data: DemoData }) {
  const { leave } = useDemoSession();
  return (
    <>
      <PageHeader
        eyebrow="L’ATHLÈTE DERRIÈRE LES CARTES"
        title="Ton espace personnel."
        description="Ta collection, ton histoire. Toujours privée."
      />
      <div className="profile-grid">
        <section className="panel padded profile-card">
          <div className="portrait">
            A<span>●</span>
          </div>
          <h2>Alex</h2>
          <p>Sportif curieux · Profil de démonstration</p>
          <div className="profile-stats">
            <div>
              <strong>{data.activities.length}</strong>
              <span>activités</span>
            </div>
            <div>
              <strong>{data.cards.filter((c) => c.owned).length}</strong>
              <span>cartes</span>
            </div>
            <div>
              <strong>4</strong>
              <span>collections</span>
            </div>
          </div>
          <Button variant="outline" onClick={leave}>
            <LogOut size={16} />
            Quitter la démo
          </Button>
        </section>
        <section className="stack">
          <div className="panel padded">
            <h2>Les efforts s’additionnent.</h2>
            <dl className="metrics">
              <div>
                <dt>Distance totale</dt>
                <dd>
                  {distance(
                    data.activities.reduce((n, a) => n + a.distanceM, 0),
                  )}
                </dd>
              </div>
              <div>
                <dt>Temps en mouvement</dt>
                <dd>
                  {duration(
                    data.activities.reduce((n, a) => n + a.durationS, 0),
                  )}
                </dd>
              </div>
            </dl>
            <Button asChild variant="ghost">
              <Link to="/activities">
                Retrouver mes activités
                <ArrowRight size={16} />
              </Link>
            </Button>
          </div>
          <div className="panel padded">
            <h2>
              <ShieldCheck size={20} />
              Confidentialité
            </h2>
            <p>
              Ces activités et ce profil sont fictifs. Aucune authentification
              réelle n’est active.
            </p>
            <p>
              La connexion Supabase, les consentements, l’export et la
              suppression des données seront ajoutés dans une mission dédiée.
            </p>
            <div className="privacy-line">
              <Database size={18} />
              Aucune donnée envoyée à Supabase
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
