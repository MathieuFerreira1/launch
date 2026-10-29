import { Link } from "react-router-dom";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoSession } from "./demo-session";
export function WelcomePage() {
  const { enter } = useDemoSession();
  return (
    <div className="welcome">
      <img
        src="/art/running.svg"
        alt="Illustration originale d’un coureur dans un paysage méditerranéen"
      />
      <div>
        <p className="eyebrow">COLLECTIONNE CE QUI TE FAIT AVANCER</p>
        <h1>Tes efforts méritent plus qu’un historique.</h1>
        <p>
          Des sorties qui deviennent des souvenirs. Des exploits qui deviennent
          des cartes.
        </p>
        <Button onClick={enter}>
          Explorer la démo <ArrowRight size={18} />
        </Button>
        <Button asChild variant="ghost">
          <Link to="/auth">À propos de la connexion</Link>
        </Button>
      </div>
    </div>
  );
}
export function AuthPage() {
  const { enter } = useDemoSession();
  return (
    <div className="empty panel">
      <LockKeyhole size={32} />
      <h1>Bienvenue chez Launch.</h1>
      <p>
        La connexion réelle sera disponible après la configuration de Supabase
        Auth. Aucun identifiant personnel n’est demandé ici.
      </p>
      <Button onClick={enter}>Continuer avec les données fictives</Button>
    </div>
  );
}
