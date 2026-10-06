import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffectiveTheme, useThemeStore } from "@/store/themeStore"

/** Botão que alterna entre o tema claro e o escuro. */
export function ThemeToggle() {
  const theme = useEffectiveTheme()
  const toggle = useThemeStore((s) => s.toggle)
  const label = theme === "dark" ? "Mudar para o tema claro" : "Mudar para o tema escuro"

  return (
    <Button type="button" variant="ghost" size="icon-sm" onClick={toggle} aria-label={label} title={label}>
      {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  )
}
