import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { prefetchSucursales } from './services/preciosClaros/client'

prefetchSucursales()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
