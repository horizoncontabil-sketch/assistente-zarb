import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './estilo.css'
import { App } from './App'
import { registrarSw } from './avisos'

registrarSw()

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
