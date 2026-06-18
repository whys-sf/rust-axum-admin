import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Mode = 'light' | 'dark' | 'system'
export type ColorTheme =
  | 'neutral'
  | 'blue'
  | 'green'
  | 'violet'
  | 'rose'
  | 'orange'

interface ColorVars {
  primary: string
  primaryForeground: string
}

/** Preset primary colors. `swatch` is the dot shown in the picker; `null` vars
 *  mean "use the stylesheet defaults" (the neutral shadcn palette). */
export const COLOR_PRESETS: {
  value: ColorTheme
  label: string
  swatch: string
  light: ColorVars | null
  dark: ColorVars | null
}[] = [
  {
    value: 'neutral',
    label: '默认',
    swatch: 'oklch(0.45 0 0)',
    light: null,
    dark: null,
  },
  {
    value: 'blue',
    label: '蓝色',
    swatch: 'oklch(0.55 0.2 255)',
    light: { primary: 'oklch(0.55 0.2 255)', primaryForeground: 'oklch(0.985 0 0)' },
    dark: { primary: 'oklch(0.62 0.19 255)', primaryForeground: 'oklch(0.985 0 0)' },
  },
  {
    value: 'green',
    label: '绿色',
    swatch: 'oklch(0.6 0.16 150)',
    light: { primary: 'oklch(0.6 0.16 150)', primaryForeground: 'oklch(0.985 0 0)' },
    dark: { primary: 'oklch(0.68 0.16 150)', primaryForeground: 'oklch(0.205 0 0)' },
  },
  {
    value: 'violet',
    label: '紫色',
    swatch: 'oklch(0.55 0.22 295)',
    light: { primary: 'oklch(0.55 0.22 295)', primaryForeground: 'oklch(0.985 0 0)' },
    dark: { primary: 'oklch(0.62 0.2 295)', primaryForeground: 'oklch(0.985 0 0)' },
  },
  {
    value: 'rose',
    label: '玫红',
    swatch: 'oklch(0.6 0.22 12)',
    light: { primary: 'oklch(0.6 0.22 12)', primaryForeground: 'oklch(0.985 0 0)' },
    dark: { primary: 'oklch(0.66 0.2 12)', primaryForeground: 'oklch(0.985 0 0)' },
  },
  {
    value: 'orange',
    label: '橙色',
    swatch: 'oklch(0.66 0.18 50)',
    light: { primary: 'oklch(0.66 0.18 50)', primaryForeground: 'oklch(0.205 0 0)' },
    dark: { primary: 'oklch(0.7 0.16 50)', primaryForeground: 'oklch(0.205 0 0)' },
  },
]

const PRESET_BY_VALUE = new Map(COLOR_PRESETS.map((p) => [p.value, p]))

/** CSS variables we override so the primary color cascades to buttons, rings,
 *  and the sidebar accent. */
const VARS = ['--primary', '--primary-foreground', '--ring', '--sidebar-primary', '--sidebar-ring']

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function applyTheme(mode: Mode, color: ColorTheme) {
  const dark = mode === 'dark' || (mode === 'system' && systemPrefersDark())
  const root = document.documentElement
  root.classList.toggle('dark', dark)

  const preset = PRESET_BY_VALUE.get(color)
  const vars = dark ? preset?.dark : preset?.light
  if (!vars) {
    VARS.forEach((v) => root.style.removeProperty(v))
    return
  }
  root.style.setProperty('--primary', vars.primary)
  root.style.setProperty('--primary-foreground', vars.primaryForeground)
  root.style.setProperty('--ring', vars.primary)
  root.style.setProperty('--sidebar-primary', vars.primary)
  root.style.setProperty('--sidebar-ring', vars.primary)
}

interface ThemeState {
  mode: Mode
  color: ColorTheme
  setMode: (mode: Mode) => void
  setColor: (color: ColorTheme) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      color: 'neutral',
      setMode: (mode) => {
        applyTheme(mode, get().color)
        set({ mode })
      },
      setColor: (color) => {
        applyTheme(get().mode, color)
        set({ color })
      },
    }),
    {
      name: 'aa-theme',
      onRehydrateStorage: () => (state) =>
        applyTheme(state?.mode ?? 'system', state?.color ?? 'neutral'),
    },
  ),
)

/** Apply the stored theme on boot and keep `system` in sync with the OS. */
export function initTheme() {
  const { mode, color } = useThemeStore.getState()
  applyTheme(mode, color)
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      const s = useThemeStore.getState()
      if (s.mode === 'system') applyTheme('system', s.color)
    })
}
