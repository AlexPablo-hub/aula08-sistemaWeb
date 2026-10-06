import { Toaster as Sonner, type ToasterProps } from "sonner"
import { useEffectiveTheme } from "@/store/themeStore"

// O tema efetivo vem do themeStore; as cores vêm dos tokens de index.css.
const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useEffectiveTheme()
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "font-sans text-sm",
        },
      }}
      style={
        {
          "--normal-bg": "var(--color-surface)",
          "--normal-text": "var(--color-ink)",
          "--normal-border": "var(--color-rule)",
          "--success-bg": "var(--color-success-wash)",
          "--success-text": "var(--color-success-ink)",
          "--success-border": "var(--color-success-ink)",
          "--error-bg": "var(--color-danger-wash)",
          "--error-text": "var(--color-danger-ink)",
          "--error-border": "var(--color-danger-ink)",
          "--border-radius": "var(--radius-lg)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
