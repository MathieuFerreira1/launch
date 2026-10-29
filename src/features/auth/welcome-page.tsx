import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
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
          <Link to="/auth">Me connecter</Link>
        </Button>
        <Button asChild>
          <Link to="/auth/signup">Créer mon compte</Link>
        </Button>
      </div>
    </div>
  );
}
