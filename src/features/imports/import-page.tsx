import { useRef, useState } from "react";
import { FileArchive, Upload, X, ShieldCheck, FolderOpen } from "lucide-react";
import { PageHeader } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { inventoryFiles, type SelectedFile } from "./selection";
export function ImportPage() {
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  function select(list: FileList | null) {
    if (list) setFiles(inventoryFiles(Array.from(list)));
  }
  return (
    <>
      <PageHeader
        eyebrow="LE DÉBUT D’UNE BELLE COLLECTION"
        title="Importe ton histoire sportive."
        description="Tes fichiers d’hier racontent déjà de beaux exploits."
      />
      <div className="import-grid">
        <section>
          <div
            className={`dropzone ${dragging ? "dragging" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              select(e.dataTransfer.files);
            }}
          >
            <span className="upload-icon">
              <FileArchive size={36} strokeWidth={1.4} />
            </span>
            <h2>
              Une archive.
              <br />
              Ou plusieurs aventures.
            </h2>
            <p>
              Glisse tes fichiers ici, ou sélectionne-les depuis ton appareil.
            </p>
            <input
              ref={input}
              id="files"
              type="file"
              multiple
              accept=".zip,.fit,.gpx,.tcx"
              className="sr-only"
              aria-label="Fichiers sportifs"
              onChange={(e) => select(e.target.files)}
            />
            <Button onClick={() => input.current?.click()}>
              <Upload size={18} />
              Choisir des fichiers
            </Button>
            <span className="formats">ZIP · FIT · GPX · TCX</span>
          </div>
          {files.length > 0 && (
            <div className="panel padded selection" aria-live="polite">
              <div className="section-heading">
                <h2>{files.length} fichier(s) sélectionné(s)</h2>
                <Button
                  variant="ghost"
                  aria-label="Effacer la sélection"
                  onClick={() => {
                    setFiles([]);
                    if (input.current) input.current.value = "";
                  }}
                >
                  <X size={18} />
                </Button>
              </div>
              <ul>
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`}>
                    <FolderOpen size={18} />
                    <div>
                      <strong>{f.name}</strong>
                      <p>
                        {new Intl.NumberFormat("fr-FR").format(f.size)} octets ·{" "}
                        {f.supportedExtension
                          ? "Extension compatible, contenu non analysé"
                          : "Format non pris en charge ou fichier vide"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="small">
                Sélection locale uniquement. Aucun fichier lu, analysé, conservé
                ou envoyé.
              </p>
              <Button disabled className="w-full">
                Analyse disponible dans une prochaine étape
              </Button>
            </div>
          )}
        </section>
        <aside>
          <div className="panel padded">
            <p className="eyebrow">COMMENT ÇA MARCHERA</p>
            <ol className="steps">
              <li>
                <span>01</span>
                <div>
                  <h3>Rassemble tes sorties</h3>
                  <p>Une archive ZIP ou plusieurs fichiers sportifs.</p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <h3>Vérifie avant d’importer</h3>
                  <p>Sports, doublons et informations à compléter.</p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <h3>Découvre tes cartes</h3>
                  <p>Des récompenses liées à tes exploits, jamais au hasard.</p>
                </div>
              </li>
            </ol>
          </div>
          <div className="privacy-note">
            <ShieldCheck size={22} />
            <div>
              <strong>Ton histoire reste privée.</strong>
              <p>
                Dans cette démo, aucun fichier ne quitte ton appareil. L’import
                réel et les règles de conservation restent à implémenter.
              </p>
            </div>
          </div>
          <div className="panel padded">
            <h2>Tu préfères la saisie manuelle ?</h2>
            <p>
              Elle sera distincte de l’import et toujours identifiée comme
              déclarative.
            </p>
            <Button variant="outline" disabled>
              Bientôt disponible
            </Button>
          </div>
        </aside>
      </div>
    </>
  );
}
