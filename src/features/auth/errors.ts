export function authError(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";
  switch (code) {
    case "invalid_credentials":
      return "Email ou mot de passe incorrect.";
    case "email_not_confirmed":
      return "Confirme ton adresse email avant de te connecter.";
    case "user_already_exists":
      return "Impossible de créer ce compte. Essaie de te connecter ou de réinitialiser ton mot de passe.";
    case "weak_password":
      return "Choisis un mot de passe plus robuste (au moins 12 caractères).";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Trop de demandes. Patiente quelques minutes avant de réessayer.";
    case "otp_expired":
    case "flow_state_expired":
    case "flow_state_not_found":
      return "Ce lien est expiré ou a déjà été utilisé. Demande un nouveau lien.";
    case "23505":
      return "Ce pseudo est déjà utilisé. Choisis-en un autre.";
    default:
      return "La demande n’a pas abouti. Vérifie ta connexion et réessaie.";
  }
}
