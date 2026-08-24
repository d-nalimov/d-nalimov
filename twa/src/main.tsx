import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { App } from './App'
import { initTelegram } from './telegram/sdk'
import './styles/fonts.css'
import './styles/global.css'
import './styles/components.css'

initTelegram()

const container = document.getElementById('root')
if (!container) throw new Error('Не найден #root')

createRoot(container).render(
  <StrictMode>
    {/* HashRouter: мини-приложение раздаётся статикой и открывается по произвольному пути. */}
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
