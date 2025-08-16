import { ref, onMounted, type Ref } from 'vue'

type Theme = 'light' | 'dark' | 'auto'

export function useSettings() {
  const currentTheme: Ref<Theme> = ref('auto')
  const tempTheme: Ref<Theme> = ref('auto')
  const targetWorkHours = ref(8)
  const tempTargetWorkHours = ref(8)

  /**
   * Apply theme to document root
   */
  const applyTheme = (theme: Theme) => {
    const root = document.documentElement
    let resolvedTheme = theme

    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      resolvedTheme = prefersDark ? 'dark' : 'light'
    }

    if (resolvedTheme === 'dark') {
      root.style.setProperty('--bg-primary', '#1a1f2e')
      root.style.setProperty('--bg-secondary', '#232937')
      root.style.setProperty('--text-primary', '#e8f0ed')
      root.style.setProperty('--text-secondary', '#b8c5bf')
      root.style.setProperty('--text-muted', '#8a9690')
      root.style.setProperty('--border-color', '#3a4249')
      root.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.3)')
    } else {
      root.style.setProperty('--bg-primary', '#ffffff')
      root.style.setProperty('--bg-secondary', '#f8fffe')
      root.style.setProperty('--text-primary', '#2d4a3d')
      root.style.setProperty('--text-secondary', '#4a6b56')
      root.style.setProperty('--text-muted', '#7a9184')
      root.style.setProperty('--border-color', '#e0ede8')
      root.style.setProperty('--shadow-color', 'rgba(87, 189, 175, 0.1)')
    }
  }

  /**
   * Load settings from localStorage
   */
  const loadSettings = () => {
    // Load theme
    const savedTheme = localStorage.getItem('theme') as Theme
    if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
      currentTheme.value = savedTheme
    }

    // Load target work hours
    const savedTargetHours = localStorage.getItem('targetWorkHours')
    if (savedTargetHours) {
      const hours = parseFloat(savedTargetHours)
      if (!isNaN(hours) && hours > 0 && hours <= 24) {
        targetWorkHours.value = hours
      }
    }

    applyTheme(currentTheme.value)
  }

  /**
   * Save settings to localStorage
   */
  const saveSettings = () => {
    currentTheme.value = tempTheme.value
    targetWorkHours.value = tempTargetWorkHours.value
    
    applyTheme(currentTheme.value)
    localStorage.setItem('theme', currentTheme.value)
    localStorage.setItem('targetWorkHours', targetWorkHours.value.toString())
  }

  /**
   * Initialize temporary settings with current values
   */
  const initializeTempSettings = () => {
    tempTheme.value = currentTheme.value
    tempTargetWorkHours.value = targetWorkHours.value
  }

  // Load settings on mount
  onMounted(() => {
    loadSettings()
  })

  return {
    currentTheme,
    tempTheme,
    targetWorkHours,
    tempTargetWorkHours,
    applyTheme,
    loadSettings,
    saveSettings,
    initializeTempSettings
  }
}