import React from 'react'
import ReactDOM from 'react-dom/client'
import { PopupApp } from './PopupApp'
import '../ui/styles.css'
import '../ui/vibey-chat-orb.css'

const root = document.getElementById('root')
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <PopupApp />
    </React.StrictMode>,
  )
}
