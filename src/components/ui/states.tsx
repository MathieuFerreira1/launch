import { Link } from "react-router-dom";
import { CircleAlert, Layers } from "lucide-react";
import { Button } from "./button";
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty panel">
      <Layers size={30} />
      <h2>{title}</h2>
      <p>{children ?? "Tes prochains efforts écriront la suite."}</p>
      <Button asChild variant="outline">
        <Link to="/import">Ajouter une activité</Link>
      </Button>
    </div>
  );
}
export function InlineError({ retry }: { retry: () => void }) {
  return (
    <div className="empty panel" role="alert">
      <CircleAlert />
      <h2>Chargement indisponible</h2>
      <p>
        Vérifie ta connexion, puis réessaie. Tes données enregistrées restent
        conservées.
      </p>
      <Button onClick={retry}>Réessayer</Button>
    </div>
  );
}
export function LoadingState() {
  return (
    <div role="status" className="empty panel">
      <span className="loader" />
      Chargement de ta collection…
    </div>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <header className="page-header">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 tabIndex={-1}>{title}</h1>
      <p>{description}</p>
    </header>
  );
}
