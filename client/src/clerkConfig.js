/**
 * Clerk is opt-in: with no publishable key the app keeps using the built-in
 * password login, so the site runs out of the box. Add the key to `.env` and
 * Clerk takes over on the next restart.
 */
const key = (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? '').trim()

export const CLERK_PUBLISHABLE_KEY = key
export const CLERK_ENABLED = key.startsWith('pk_')

/** Clerk's own UI, restyled to match the storefront. */
export const clerkAppearance = {
  variables: {
    colorPrimary: '#10293f',
    colorText: '#12263a',
    colorTextSecondary: '#5c7286',
    colorBackground: '#ffffff',
    colorInputBackground: '#ffffff',
    colorInputText: '#12263a',
    colorDanger: '#b4433f',
    borderRadius: '8px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: '15px',
  },
  elements: {
    rootBox: { width: '100%' },
    card: { boxShadow: 'none', border: 'none', padding: 0, width: '100%' },
    header: { display: 'none' },
    footer: { background: 'transparent' },
    formButtonPrimary: {
      background: '#10293f',
      borderRadius: '999px',
      padding: '0.85rem 1.6rem',
      fontSize: '0.83rem',
      fontWeight: 600,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      '&:hover': { background: '#0b3f66' },
    },
    formFieldInput: {
      borderColor: '#c8dbe9',
      borderRadius: '8px',
      padding: '0.8rem 1rem',
    },
    socialButtonsBlockButton: {
      borderColor: '#c8dbe9',
      borderRadius: '999px',
      '&:hover': { borderColor: '#10293f' },
    },
    dividerLine: { background: '#e2edf5' },
    formFieldLabel: { fontWeight: 600, color: '#10293f' },
  },
}
