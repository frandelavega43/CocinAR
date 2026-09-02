import { useState } from 'react'
import { DEFAULT_UNIT } from '../constants/units'
import type { PersonalIngredient } from '../types'
import { UnitSelect } from './UnitSelect'

interface PersonalIngredientsPanelProps {
  ingredients: PersonalIngredient[]
  onAdd: (name: string, unit: string, manualUnitPrice: number) => void
  onUpdate: (id: string, name: string, unit: string, manualUnitPrice: number) => void
  onDelete: (id: string) => void
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function PersonalIngredientsPanel({
  ingredients,
  onAdd,
  onUpdate,
  onDelete,
}: PersonalIngredientsPanelProps) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [name, setName] = useState('')
  const [unit, setUnit] = useState(DEFAULT_UNIT)
  const [unitPrice, setUnitPrice] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  function resetForm() {
    setName('')
    setUnit(DEFAULT_UNIT)
    setUnitPrice('')
    setFormError(null)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()
    const parsedPrice = Number(unitPrice)

    if (!trimmedName) {
      setFormError('Ingresá un nombre para el ingrediente.')
      return
    }

    if (unitPrice.trim() === '' || Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setFormError('Ingresá un precio por unidad válido (0 si es gratis).')
      return
    }

    onAdd(trimmedName, unit, parsedPrice)
    resetForm()
    setIsFormOpen(false)
  }

  return (
    <section className="panel my-ingredients-page">
      <div className="panel-header my-ingredients-page__header">
        <div>
          <h2>Mis ingredientes</h2>
          <p>
            Ingredientes con precio propio. Aparecen primero al buscar en una receta y se
            guardan solos cuando cargás uno con precio manual.
          </p>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={() => {
            setIsFormOpen((open) => {
              if (open) resetForm()
              return !open
            })
          }}
          aria-expanded={isFormOpen}
        >
          {isFormOpen ? 'Cerrar' : 'Nuevo ingrediente'}
        </button>
      </div>

      {isFormOpen ? (
        <div className="add-ingredient-section add-ingredient-section--manual my-ingredients-form">
          <form className="add-ingredient-form add-ingredient-form--personal" onSubmit={handleSubmit}>
            <label>
              <span>Ingrediente</span>
              <input
                className="recipe-form-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej: limón, manteca casera..."
                required
              />
            </label>
            <label>
              <span>Unidad</span>
              <UnitSelect value={unit} onChange={setUnit} />
            </label>
            <label>
              <span>Precio por unidad ($)</span>
              <input
                className="recipe-form-input"
                value={unitPrice}
                onChange={(event) => setUnitPrice(event.target.value)}
                type="number"
                min={0}
                step="any"
                placeholder="0"
                required
              />
            </label>
            <button type="submit" className="primary-button">
              Guardar ingrediente
            </button>
          </form>
          {formError ? <p className="status error">{formError}</p> : null}
        </div>
      ) : null}

      {ingredients.length === 0 ? (
        <p className="empty-state">
          Todavía no tenés ingredientes propios. Tocá <strong>Nuevo ingrediente</strong> o
          cargá uno con precio manual en una receta.
        </p>
      ) : (
        <ul className="personal-ingredients-list">
          {ingredients.map((ingredient) => (
            <PersonalIngredientRow
              key={ingredient.id}
              ingredient={ingredient}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function PersonalIngredientRow({
  ingredient,
  onUpdate,
  onDelete,
}: {
  ingredient: PersonalIngredient
  onUpdate: (id: string, name: string, unit: string, manualUnitPrice: number) => void
  onDelete: (id: string) => void
}) {
  const [name, setName] = useState(ingredient.name)
  const [unit, setUnit] = useState(ingredient.unit)
  const [unitPrice, setUnitPrice] = useState(String(ingredient.manualUnitPrice))

  function commitChanges() {
    const trimmedName = name.trim()
    const parsedPrice = Number(unitPrice)
    if (!trimmedName || Number.isNaN(parsedPrice) || parsedPrice < 0) return

    if (
      trimmedName === ingredient.name &&
      unit === ingredient.unit &&
      parsedPrice === ingredient.manualUnitPrice
    ) {
      return
    }

    onUpdate(ingredient.id, trimmedName, unit, parsedPrice)
  }

  return (
    <li className="ingredient-row personal-ingredient-row">
      <div className="personal-ingredient-row__main">
        <div className="personal-ingredient-row__fields">
          <input
            className="recipe-form-input recipe-form-input--name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={commitChanges}
            aria-label="Nombre del ingrediente"
          />
          <UnitSelect
            value={unit}
            onChange={(next) => {
              setUnit(next)
              const trimmedName = name.trim()
              const parsedPrice = Number(unitPrice)
              if (!trimmedName || Number.isNaN(parsedPrice) || parsedPrice < 0) return
              onUpdate(ingredient.id, trimmedName, next, parsedPrice)
            }}
          />
          <input
            className="recipe-form-input"
            type="number"
            min={0}
            step="any"
            value={unitPrice}
            onChange={(event) => setUnitPrice(event.target.value)}
            onBlur={commitChanges}
            aria-label="Precio por unidad"
          />
        </div>
        <div className="personal-ingredient-row__meta">
          <span className="ingredient-status ingredient-status--manual">
            Ingrediente propio · $
            {ingredient.manualUnitPrice.toLocaleString('es-AR', {
              maximumFractionDigits: 2,
            })}{' '}
            / {ingredient.unit}
          </span>
          <span className="personal-ingredient-row__date">
            Actualizado {formatDate(ingredient.updatedAt)}
          </span>
        </div>
      </div>
      <button
        type="button"
        className="delete-recipe-button personal-ingredient-row__delete"
        onClick={() => onDelete(ingredient.id)}
      >
        Eliminar
      </button>
    </li>
  )
}
