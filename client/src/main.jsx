import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import { App } from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { CartProvider } from './context/CartContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { CLERK_ENABLED, CLERK_PUBLISHABLE_KEY, clerkAppearance } from './clerkConfig.js'

import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import './styles/pages.css'
import './styles/seller.css'
import './styles/clerk.css'

const tree = (
  <BrowserRouter>
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  </BrowserRouter>
)

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {CLERK_ENABLED ? (
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} appearance={clerkAppearance}>
        {tree}
      </ClerkProvider>
    ) : (
      tree
    )}
  </React.StrictMode>
)
