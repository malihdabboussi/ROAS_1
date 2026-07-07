import React from 'react'
import ReactDOM from 'react-dom/client'
import { SidepanelApp } from './SidepanelApp'
import '../ui/styles.css'
import '../ui/vibey-chat-orb.css'

const root = document.getElementById('root')
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <SidepanelApp />
    </React.StrictMode>,
  )
}
