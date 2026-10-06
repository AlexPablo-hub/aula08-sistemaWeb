// Tipos mínimos do Google Identity Services (script https://accounts.google.com/gsi/client).

export {}

declare global {
  interface GoogleCredentialResponse {
    credential: string
  }

  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: GoogleCredentialResponse) => void
            auto_select?: boolean
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black'
              size?: 'large' | 'medium' | 'small'
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
              shape?: 'rectangular' | 'pill'
              width?: number
              locale?: string
            },
          ) => void
        }
      }
    }
  }
}
