/**
 * Clerk is opt-in: with no publishable key the app keeps using the built-in
 * password login, so the site runs out of the box. Add the key to `.env` and
 * Clerk takes over on the next restart.
 */
const key = (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? '').trim()

export const CLERK_PUBLISHABLE_KEY = key
export const CLERK_ENABLED = key.startsWith('pk_')

/**
 * Colour and type variables only — the structural work (stripping Clerk's card
 * chrome, dividers and footer band) lives in styles/clerk.css, because Clerk
 * injects its own stylesheet at runtime and specificity has to win there.
 */
export const clerkAppearance = {
  layout: {
    socialButtonsPlacement: 'top',
    socialButtonsVariant: 'blockButton',
    showOptionalFields: false,
    helpPageUrl: undefined,
  },
  variables: {
    colorPrimary: '#10293f',
    colorText: '#12263a',
    colorTextSecondary: '#5c7286',
    colorBackground: '#ffffff',
    colorInputBackground: '#ffffff',
    colorInputText: '#12263a',
    colorDanger: '#b4433f',
    colorSuccess: '#2c7fb8',
    colorNeutral: '#10293f',
    borderRadius: '8px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: '15px',
    spacingUnit: '1rem',
  },
}
