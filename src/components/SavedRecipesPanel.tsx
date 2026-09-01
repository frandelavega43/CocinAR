import { useRef, useState } from 'react'
import type { SavedRecipe } from '../types'

interface SavedRecipesPanelProps {
  recipes: SavedRecipe[]
  activeRecipeId: string | null
  onLoad: (recipe: SavedRecipe) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onNewRecipe: () => void
  onExportBackup: () => void
  onImportBackup: (file: File, mode: 'merge' | 'replace') => Promise<void>
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function SavedRecipesPanel({
  recipes,
  activeRecipeId,
  onLoad,
  onDelete,
  onDuplicate,
  onNewRecipe,
  onExportBackup,
  onImportBackup,
}: SavedRecipesPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importMode, setImportMode] = useState<'merge' | 'replace' | null>(null)
  const [backupMessage, setBackupMessage] = useState<string | null>(null)
  const [backupError, setBackupError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  function handleExport() {
    setBackupError(null)
    setBackupMessage(null)
    onExportBackup()
    setBackupMessage('Respaldo descargado en tu dispositivo.')
  }

  function startImport(mode: 'merge' | 'replace') {
    setImportMode(mode)
    setBackupError(null)
    setBackupMessage(null)
    fileInputRef.current?.click()
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || !importMode) return

    setIsImporting(true)
    setBackupError(null)
    setBackupMessage(null)

    try {
      await onImportBackup(file, importMode)
      setBackupMessage(
        importMode === 'replace'
          ? 'Recetas importadas y reemplazadas correctamente.'
          : 'Recetas importadas y combinadas correctamente.',
      )
    } catch (error) {
      setBackupError(
        error instanceof Error ? error.message : 'No se pudo importar el respaldo.',
      )
    } finally {
      setIsImporting(false)
      setImportMode(null)
    }
  }

  return (
    <section className="panel my-recipes-page">
      <div className="panel-header my-recipes-page__header">
        <div>
          <h2>Mis recetas</h2>
          <p>Tus recetas se guardan solas en este dispositivo. Tocá una para abrirla.</p>
        </div>
        <button type="button" className="primary-button" onClick={onNewRecipe}>
          Nueva receta
        </button>
      </div>

      <section className="recipe-backup-panel" aria-label="Respaldo de recetas">
        <div>
          <h3>Respaldo</h3>
          <p>
            Exportá un archivo para no perder tus recetas si cambiás de celular o navegador.
          </p>
        </div>
        <div className="recipe-backup-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={handleExport}
            disabled={recipes.length === 0 || isImporting}
          >
            Exportar backup
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => startImport('merge')}
            disabled={isImporting}
          >
            Importar y combinar
          </button>
          <button
            type="button"
            className="secondary-button recipe-backup-actions__danger"
            onClick={() => startImport('replace')}
            disabled={isImporting}
          >
            Importar y reemplazar
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={handleFileChange}
        />
        {backupMessage ? <p className="recipe-backup-status">{backupMessage}</p> : null}
        {backupError ? <p className="recipe-backup-status error">{backupError}</p> : null}
      </section>

      {recipes.length === 0 ? (
        <div className="my-recipes-empty">
          <p className="empty-state">Todavía no guardaste ninguna receta.</p>
        </div>
      ) : (
        <ul className="saved-recipes-list saved-recipes-list--page">
          {recipes.map((recipe) => (
            <li key={recipe.id} className={recipe.id === activeRecipeId ? 'active' : undefined}>
              <button
                type="button"
                className="saved-recipe-card"
                onClick={() => onLoad(recipe)}
              >
                <strong>{recipe.name}</strong>
                <span>
                  {recipe.ingredients.length} ingrediente
                  {recipe.ingredients.length === 1 ? '' : 's'} · {recipe.servings} porciones
                </span>
                <span className="saved-recipe-date">Actualizada {formatDate(recipe.updatedAt)}</span>
              </button>
              <div className="saved-recipe-actions">
                <button
                  type="button"
                  className="secondary-button saved-recipe-actions__button"
                  onClick={() => onDuplicate(recipe.id)}
                >
                  Duplicar
                </button>
                <button
                  type="button"
                  className="delete-recipe-button"
                  onClick={() => onDelete(recipe.id)}
                  aria-label={`Eliminar ${recipe.name}`}
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
