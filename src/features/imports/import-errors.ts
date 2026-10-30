const operations = {
  import: "Import",
  find_activity_duplicates: "Vérification des doublons",
  begin_activity_import: "Ouverture du lot",
  reserve_activity_file: "Réservation du fichier",
  commit_activity_import: "Enregistrement des activités",
  record_import_errors: "Enregistrement des fichiers ignorés",
  finish_activity_import: "Finalisation du lot",
  "import.receipts": "Lecture de la reprise",
  "source.info": "Vérification du fichier distant",
  "source.upload": "Envoi du fichier",
  "source.resume": "Reprise de l’envoi du fichier",
  "local.source": "Lecture de la copie locale",
} as const;
export type ImportOperation = keyof typeof operations;
const messages = {
  REQUEST_FAILED: "La requête a échoué.",
  NETWORK_ERROR: "La connexion au service a été interrompue.",
  SERVICE_UNAVAILABLE: "Le service est temporairement indisponible.",
  AUTH_REQUIRED: "La session n’est plus valide. Reconnecte-toi.",
  RLS_DENIED:
    "L’accès a été refusé par les règles de sécurité. Les protections restent actives.",
  BUCKET_NOT_FOUND:
    "L’espace de fichiers est indisponible. Vérifier sa configuration.",
  FILE_TOO_LARGE: "Le fichier dépasse la taille autorisée.",
  SOURCE_SIZE_MISMATCH:
    "La taille du fichier distant ne correspond pas au fichier réservé.",
  DUPLICATE_REVIEW_REQUIRED:
    "Un doublon probable est apparu. Vérifie les choix.",
  SOURCE_QUOTA_EXCEEDED:
    "Le plafond technique de sources privées (1 Go) est atteint. Supprime des sources ou importe sans les conserver.",
  SOURCE_NOT_FOUND: "La réservation de ce fichier est introuvable.",
  SOURCE_UPLOAD_MISSING:
    "Le fichier réservé n’a pas encore été reçu par le stockage.",
  SOURCE_MISMATCH:
    "Les caractéristiques du fichier ne correspondent pas à sa réservation.",
  BATCH_NOT_FOUND: "Le lot est introuvable pour ce compte.",
  BATCH_MISMATCH:
    "Ce lot ne correspond plus au brouillon. Recommence avec les mêmes fichiers.",
  ACTIVITY_NOT_FOUND:
    "L’activité de rattachement est introuvable pour ce compte.",
  BATCH_LIMIT: "Le lot dépasse la limite autorisée.",
  ITEM_TOO_LARGE:
    "Les métadonnées d’une activité dépassent la limite autorisée.",
  LIMIT_EXCEEDED:
    "Limite de sécurité atteinte. Divise ton historique en sélections plus petites.",
  LOCAL_SOURCE_MISSING:
    "La copie locale est absente. Recommence un import avec les mêmes fichiers ; les activités existantes seront reconnues.",
  LINK_CYCLE:
    "Les rattachements de doublons forment une boucle. Vérifie les choix.",
  LINK_TARGET_SKIPPED:
    "Une activité cible a été ignorée. Choisis une cible conservée.",
  PARTIAL: "Le serveur indique que le lot reste incomplet.",
  DATA_INVALID: "Les données ont été refusées par une contrainte de la base.",
  MIGRATION_REQUIRED:
    "Une fonction ou une table est indisponible. Vérifier les migrations du projet.",
  ABORT: "Import interrompu. Tu peux le reprendre ici.",
} as const;
type ImportCode = keyof typeof messages;
export class ImportFailure extends Error {
  constructor(
    public code: ImportCode,
    public operation: ImportOperation = "import",
    public status?: number,
    public databaseCode?: string,
  ) {
    // Never retain a server message, response, URL, token or source path.
    super(code);
    this.name = "ImportFailure";
  }
}
function record(error: unknown): Record<string, unknown> {
  return error !== null && typeof error === "object"
    ? (error as Record<string, unknown>)
    : {};
}
export function missingStorageObject(error: unknown) {
  const e = record(error);
  // Storage may wrap a 404/NoSuchKey body in HTTP 400. A missing bucket,
  // unauthorized request or failed network check is not an absent object.
  if (
    ![400, 404].includes(Number(e.status)) ||
    ["401", "403"].includes(String(e.statusCode)) ||
    ["NoSuchBucket", "BucketNotFound"].includes(String(e.code))
  )
    return false;
  return (
    ["NoSuchKey", "not_found"].includes(String(e.code)) ||
    (String(e.statusCode) === "404" &&
      ["Object not found", "Object not found."].includes(String(e.message)))
  );
}
export function requestFailure(
  operation: ImportOperation,
  error: unknown,
  httpStatus?: number,
): ImportFailure {
  if (error instanceof ImportFailure) return error;
  const e = record(error);
  const status = Number(httpStatus ?? e.status);
  const http = status >= 100 && status <= 599 ? status : undefined;
  const message = typeof e.message === "string" ? e.message : "";
  const apiCode = typeof e.code === "string" ? e.code : "";
  let code: ImportCode = "REQUEST_FAILED";
  if (Object.hasOwn(messages, message)) code = message as ImportCode;
  else if (e.name === "AbortError") code = "ABORT";
  else if (
    http === 401 ||
    apiCode === "PGRST301" ||
    message === "AUTH_REQUIRED"
  )
    code = "AUTH_REQUIRED";
  else if (
    apiCode === "42501" ||
    apiCode === "AccessDenied" ||
    /row-level security/i.test(message) ||
    http === 403
  )
    code = "RLS_DENIED";
  else if (["NoSuchBucket", "BucketNotFound"].includes(apiCode))
    code = "BUCKET_NOT_FOUND";
  else if (
    http === 413 ||
    ["EntityTooLarge", "PayloadTooLarge"].includes(apiCode)
  )
    code = "FILE_TOO_LARGE";
  else if (/^(22|23)[A-Z0-9]{3}$/.test(apiCode)) code = "DATA_INVALID";
  else if (["PGRST202", "PGRST205", "42883", "42P01"].includes(apiCode))
    code = "MIGRATION_REQUIRED";
  else if (http && http >= 500) code = "SERVICE_UNAVAILABLE";
  else if (!http && (e.name === "TypeError" || /fetch|network/i.test(message)))
    code = "NETWORK_ERROR";
  else if (/LIMITE|TROP_|VOLUMINEUSE/.test(message)) code = "LIMIT_EXCEEDED";
  // SQLSTATE only: never copy arbitrary server-supplied strings into the UI.
  const databaseCode = /^(?:[0-9][0-9A-Z]|P0|XX|HV|F0)[0-9A-Z]{3}$/.test(
    apiCode,
  )
    ? apiCode
    : undefined;
  return new ImportFailure(code, operation, http, databaseCode);
}
export function importError(error: unknown) {
  const e = requestFailure("import", error);
  if (e.code === "ABORT") return messages.ABORT;
  const details = [e.code, e.status && `HTTP ${e.status}`, e.databaseCode]
    .filter(Boolean)
    .join(" · ");
  return `${operations[e.operation]} : ${messages[e.code]} (${details}) Après correction, reprends l’import. Les activités déjà enregistrées ne seront pas ajoutées deux fois.`;
}
