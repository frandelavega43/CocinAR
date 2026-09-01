import type { CostBreakdown } from '../types'

interface CostSummaryProps {
  breakdown: CostBreakdown
}

export function CostSummary({ breakdown }: CostSummaryProps) {
  const { totalCost, costPerServing, ingredients } = breakdown

  return (
    <section className="panel summary-panel">
      <div className="panel-header">
        <h2>Costo estimado</h2>
        <p>Promedio de precios entre marcas de supermercado.</p>
      </div>

      <div className="summary-total">
        <span>Total</span>
        <strong>
          ${totalCost.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
        </strong>
      </div>

      {costPerServing !== null && (
        <div className="summary-per-serving">
          <span>Por porción</span>
          <strong>
            ${costPerServing.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
          </strong>
        </div>
      )}

      {ingredients.length > 0 && (
        <ul className="summary-breakdown">
          {ingredients.map((ingredient) => (
            <li key={ingredient.id}>
              <span>{ingredient.name}</span>
              <span>
                $
                {ingredient.lineCost.toLocaleString('es-AR', {
                  maximumFractionDigits: 0,
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
