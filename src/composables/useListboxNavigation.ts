import { ref, nextTick, type Ref } from 'vue'

export interface UseListboxNavigationOptions<T> {
  /** Container element ref for scoping DOM queries */
  containerRef: Ref<HTMLElement | undefined>
  /** Items array for bounds checking */
  items: Ref<T[]>
  /** Callback when an item is selected - receives (item, index, contextId?) */
  onSelect: (item: T, index: number, contextId?: string | number) => void
  /** Callback when listbox should be closed (Escape key) - receives contextId? */
  onClose: (contextId?: string | number) => void
  /** Function to get option element selector */
  getOptionSelector: (contextId: string | number, optionIndex: number) => string
}

export function useListboxNavigation<T>(options: UseListboxNavigationOptions<T>) {
  const { containerRef, items, onSelect, onClose, getOptionSelector } = options
  
  // Reactive state for active option index per context
  const activeIndex = ref<Record<string | number, number>>({})
  
  /**
   * Handle keyboard navigation for listbox
   */
  const handleKeydown = async (event: KeyboardEvent, contextId: string | number) => {
    if (!items.value.length) return
    
    const currentIndex = getActiveIndex(contextId)
    
    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault()
        const nextIndex = Math.min(currentIndex + 1, items.value.length - 1)
        activeIndex.value[contextId] = nextIndex
        await nextTick()
        focusOption(contextId, nextIndex)
        break
      }
        
      case 'ArrowUp': {
        event.preventDefault()
        const prevIndex = Math.max(currentIndex - 1, 0)
        activeIndex.value[contextId] = prevIndex
        await nextTick()
        focusOption(contextId, prevIndex)
        break
      }
        
      case 'Home': {
        event.preventDefault()
        const targetIndex = 0
        activeIndex.value[contextId] = targetIndex
        await nextTick()
        focusOption(contextId, targetIndex)
        break
      }
        
      case 'End': {
        event.preventDefault()
        const targetIndex = items.value.length - 1
        activeIndex.value[contextId] = targetIndex
        await nextTick()
        focusOption(contextId, targetIndex)
        break
      }
        
      case 'Enter':
      case ' ': {
        event.preventDefault()
        const selectedItem = items.value[currentIndex]
        if (selectedItem) {
          onSelect(selectedItem, currentIndex, contextId)
        }
        break
      }
        
      case 'Escape':
        event.preventDefault()
        onClose(contextId)
        break
        
      case 'Tab':
        event.preventDefault()
        event.stopPropagation()
        onClose(contextId)
        break
    }
  }
  
  /**
   * Focus a specific option by index
   */
  const focusOption = (contextId: string | number, optionIndex: number) => {
    const selector = getOptionSelector(contextId, optionIndex)
    const option = containerRef.value?.querySelector<HTMLElement>(selector)
    option?.focus()
  }
  
  /**
   * Initialize active option when listbox opens
   */
  const initializeActiveOption = async (contextId: string | number, selectedIndex: number = 0) => {
    // Early return if there are no items to avoid setting invalid index
    if (!items.value.length) {
      return
    }
    
    const resolvedIndex = Math.max(0, Math.min(selectedIndex, items.value.length - 1))
    activeIndex.value[contextId] = resolvedIndex
    
    // Wait for DOM update to ensure listbox is rendered
    await nextTick()
    
    // Focus the active option
    focusOption(contextId, resolvedIndex)
  }
  
  /**
   * Focus the trigger button that controls this listbox
   */
  const focusTrigger = (triggerSelector: string) => {
    const button = containerRef.value?.querySelector<HTMLElement>(triggerSelector)
    button?.focus()
  }
  
  /**
   * Get current active index for a specific context
   * Returns -1 when the target list is empty, otherwise clamps to valid range
   */
  const getActiveIndex = (contextId: string | number): number => {
    // Return -1 if items array is empty
    if (!items.value.length) {
      return -1
    }
    
    // Get the current active index or default to 0
    const currentIndex = activeIndex.value[contextId] ?? 0
    
    // Clamp to valid range [0, items.length - 1]
    return Math.max(0, Math.min(currentIndex, items.value.length - 1))
  }
  
  return {
    activeIndex,
    getActiveIndex,
    handleKeydown,
    focusOption,
    initializeActiveOption,
    focusTrigger
  }
}