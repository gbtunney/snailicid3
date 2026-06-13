import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const root = document.querySelector<HTMLDivElement>('#root')

if (!root) {
    throw new Error('Playground root element not found.')
}

createRoot(root).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
