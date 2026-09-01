interface CostTotalBarProps {
  totalCost: number
  costPerServing: number | null
  isUpdating: boolean
  hasIngredients: boolean
}

function formatMoney(value: number): string {
  return value.toLocaleString('es-AR', { maximumFractionDigits: 0 })
}

export function CostTotalBar({
  totalCost,
  costPerServing,
  isUpdating,
  hasIngredients,
}: CostTotalBarProps) {
  return (
    <div className="cost-total-bar">
      <div className="cost-total-bar__content">
        <div className="cost-total-bar__meta">
          <span className="cost-total-bar__label">Costo total de la receta</span>
          {!isUpdating && hasIngredients && costPerServing !== null && (
            <span className="cost-total-bar__per-serving">
              ${formatMoney(costPerServing)} por porción
            </span>
          )}
        </div>
        <strong className="cost-total-bar__amount">
          {!hasIngredients
            ? 'Agregá ingredientes'
            : isUpdating
              ? 'Calculando...'
              : `$${formatMoney(totalCost)}`}
        </strong>
      </div>
    </div>
  )
}
