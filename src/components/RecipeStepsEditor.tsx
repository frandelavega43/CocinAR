interface RecipeStepsEditorProps {
  steps: string[]
  onChange: (steps: string[]) => void
}

export function RecipeStepsEditor({ steps, onChange }: RecipeStepsEditorProps) {
  function updateStep(index: number, value: string) {
    const next = [...steps]
    next[index] = value
    onChange(next)
  }

  function addStep() {
    onChange([...steps, ''])
  }

  function removeStep(index: number) {
    onChange(steps.filter((_, stepIndex) => stepIndex !== index))
  }

  return (
    <div className="recipe-steps-field">
      <div className="recipe-steps-header">
        <span>Preparación (opcional)</span>
        <button type="button" className="recipe-step-add" onClick={addStep}>
          Agregar paso
        </button>
      </div>

      {steps.length === 0 ? (
        <p className="recipe-steps-empty">Podés agregar los pasos cuando quieras.</p>
      ) : (
        <ol className="recipe-steps-list">
          {steps.map((step, index) => (
            <li key={index} className="recipe-step-row">
              <span className="recipe-step-number" aria-hidden="true">
                {index + 1}
              </span>
              <textarea
                value={step}
                onChange={(event) => updateStep(index, event.target.value)}
                placeholder={`Paso ${index + 1}. Ej: Precalentar el horno a 180°`}
                rows={2}
                aria-label={`Paso ${index + 1}`}
              />
              <button
                type="button"
                className="recipe-step-remove"
                onClick={() => removeStep(index)}
                aria-label={`Quitar paso ${index + 1}`}
              >
                Quitar
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
