import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useListboxNavigation } from './useListboxNavigation'
import { ref, type Ref } from 'vue'

// Mock only nextTick from vue module  
vi.mock('vue', async () => {
  const actual = await vi.importActual('vue')
  return {
    ...actual,
    nextTick: vi.fn().mockResolvedValue(undefined)
  }
})

// Import the mocked nextTick
import { nextTick } from 'vue'

describe('useListboxNavigation', () => {
  let containerRef: Ref<HTMLElement | undefined>
  let itemsRef: Ref<Array<{ id: number; name: string }>>
  let mockOnSelect: ReturnType<typeof vi.fn>
  let mockOnClose: ReturnType<typeof vi.fn>
  let mockGetOptionSelector: ReturnType<typeof vi.fn>
  let composable: ReturnType<typeof useListboxNavigation>
  let mockContainer: HTMLElement
  let mockOption1: HTMLElement
  let mockOption2: HTMLElement

  beforeEach(() => {
    vi.clearAllMocks()

    // Create real DOM elements and spy on their focus methods
    mockOption1 = document.createElement('div')
    mockOption2 = document.createElement('div')
    vi.spyOn(mockOption1, 'focus').mockImplementation(() => {})
    vi.spyOn(mockOption2, 'focus').mockImplementation(() => {})
    
    mockContainer = document.createElement('div')
    vi.spyOn(mockContainer, 'querySelector').mockImplementation((selector: string) => {
      // Use exact selector matching by reusing the getOptionSelector mock
      const option0Selector = mockGetOptionSelector('test-context', 0)
      const option1Selector = mockGetOptionSelector('test-context', 1)
      
      if (selector === option0Selector) return mockOption1
      if (selector === option1Selector) return mockOption2
      return null
    })

    // Setup refs and mocks
    containerRef = ref(mockContainer)
    itemsRef = ref([
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' }
    ])

    mockOnSelect = vi.fn()
    mockOnClose = vi.fn()
    mockGetOptionSelector = vi.fn((contextId: string | number, optionIndex: number) => 
      `[data-context="${contextId}"][data-option="${optionIndex}"]`
    )

    // Create composable instance
    composable = useListboxNavigation({
      containerRef,
      items: itemsRef,
      onSelect: mockOnSelect,
      onClose: mockOnClose,
      getOptionSelector: mockGetOptionSelector
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getActiveIndex', () => {
    it('should return -1 when items array is empty', () => {
      itemsRef.value = []
      const activeIndex = composable.getActiveIndex('test-context')
      expect(activeIndex).toBe(-1)
    })

    it('should return 0 for new context when items exist', () => {
      const activeIndex = composable.getActiveIndex('new-context')
      expect(activeIndex).toBe(0)
    })

    it('should clamp active index to valid range', () => {
      // Set active index to an invalid value
      composable.activeIndex.value['test-context'] = 10
      
      const activeIndex = composable.getActiveIndex('test-context')
      expect(activeIndex).toBe(1) // Clamped to max valid index (items.length - 1)
    })

    it('should clamp negative active index to 0', () => {
      // Set active index to negative value
      composable.activeIndex.value['test-context'] = -5
      
      const activeIndex = composable.getActiveIndex('test-context')
      expect(activeIndex).toBe(0) // Clamped to minimum valid index
    })
  })

  describe('handleKeydown', () => {
    let mockEvent: KeyboardEvent

    beforeEach(() => {
      mockEvent = {
        key: '',
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as unknown as KeyboardEvent
    })

    describe('closing keys (Escape and Tab)', () => {
      it('should handle Escape key and call onClose', async () => {
        mockEvent.key = 'Escape'
        
        await composable.handleKeydown(mockEvent, 'test-context')
        
        expect(mockEvent.preventDefault).toHaveBeenCalled()
        expect(mockOnClose).toHaveBeenCalledWith('test-context')
      })

      it('should handle Tab key and call onClose with stopPropagation', async () => {
        mockEvent.key = 'Tab'
        
        await composable.handleKeydown(mockEvent, 'test-context')
        
        expect(mockEvent.preventDefault).toHaveBeenCalled()
        expect(mockEvent.stopPropagation).toHaveBeenCalled()
        expect(mockOnClose).toHaveBeenCalledWith('test-context')
      })

      it('should handle closing keys even when items list is empty', async () => {
        itemsRef.value = []
        mockEvent.key = 'Escape'
        
        await composable.handleKeydown(mockEvent, 'test-context')
        
        expect(mockOnClose).toHaveBeenCalledWith('test-context')
      })
    })

    describe('navigation keys', () => {
      it('should return early when items list is empty for navigation keys', async () => {
        itemsRef.value = []
        mockEvent.key = 'ArrowDown'
        
        await composable.handleKeydown(mockEvent, 'test-context')
        
        expect(mockEvent.preventDefault).not.toHaveBeenCalled()
        expect(mockGetOptionSelector).not.toHaveBeenCalled()
        expect(nextTick).not.toHaveBeenCalled()
      })

      it('should handle ArrowDown key and move to next option', async () => {
        mockEvent.key = 'ArrowDown'
        composable.activeIndex.value['test-context'] = 0
        
        await composable.handleKeydown(mockEvent, 'test-context')
        
        expect(mockEvent.preventDefault).toHaveBeenCalled()
        expect(composable.activeIndex.value['test-context']).toBe(1)
        expect(nextTick).toHaveBeenCalled()
        expect(mockGetOptionSelector).toHaveBeenCalledWith('test-context', 1)
      })

      it('should handle ArrowUp key and move to previous option', async () => {
        mockEvent.key = 'ArrowUp'
        composable.activeIndex.value['test-context'] = 1
        
        await composable.handleKeydown(mockEvent, 'test-context')
        
        expect(mockEvent.preventDefault).toHaveBeenCalled()
        expect(composable.activeIndex.value['test-context']).toBe(0)
        expect(nextTick).toHaveBeenCalled()
        expect(mockGetOptionSelector).toHaveBeenCalledWith('test-context', 0)
      })

      it('should handle ArrowDown at last option (should stay at last)', async () => {
        mockEvent.key = 'ArrowDown'
        composable.activeIndex.value['test-context'] = 1 // Last index
        
        await composable.handleKeydown(mockEvent, 'test-context')
        
        expect(composable.activeIndex.value['test-context']).toBe(1) // Should stay at 1
        expect(mockEvent.preventDefault).toHaveBeenCalled()
        expect(nextTick).toHaveBeenCalled()
        expect(mockGetOptionSelector).toHaveBeenCalledWith('test-context', 1)
      })

      it('should handle ArrowUp at first option (should stay at first)', async () => {
        mockEvent.key = 'ArrowUp'
        composable.activeIndex.value['test-context'] = 0 // First index
        
        await composable.handleKeydown(mockEvent, 'test-context')
        
        expect(composable.activeIndex.value['test-context']).toBe(0) // Should stay at 0
        expect(mockEvent.preventDefault).toHaveBeenCalled()
        expect(nextTick).toHaveBeenCalled()
        expect(mockGetOptionSelector).toHaveBeenCalledWith('test-context', 0)
      })

      it('should handle Home key and move to first option', async () => {
        mockEvent.key = 'Home'
        composable.activeIndex.value['test-context'] = 1
        
        await composable.handleKeydown(mockEvent, 'test-context')
        
        expect(mockEvent.preventDefault).toHaveBeenCalled()
        expect(composable.activeIndex.value['test-context']).toBe(0)
        expect(nextTick).toHaveBeenCalled()
        expect(mockGetOptionSelector).toHaveBeenCalledWith('test-context', 0)
      })

      it('should handle End key and move to last option', async () => {
        mockEvent.key = 'End'
        composable.activeIndex.value['test-context'] = 0
        
        await composable.handleKeydown(mockEvent, 'test-context')
        
        expect(mockEvent.preventDefault).toHaveBeenCalled()
        expect(composable.activeIndex.value['test-context']).toBe(1)
        expect(nextTick).toHaveBeenCalled()
        expect(mockGetOptionSelector).toHaveBeenCalledWith('test-context', 1)
      })

      it('should handle Enter key and call onSelect', async () => {
        mockEvent.key = 'Enter'
        composable.activeIndex.value['test-context'] = 1
        
        await composable.handleKeydown(mockEvent, 'test-context')
        
        expect(mockEvent.preventDefault).toHaveBeenCalled()
        expect(mockOnSelect).toHaveBeenCalledWith(
          itemsRef.value[1], // Selected item
          1,                  // Index
          'test-context'      // Context ID
        )
      })

      it('should handle Space key and call onSelect', async () => {
        mockEvent.key = ' '
        composable.activeIndex.value['test-context'] = 0
        
        await composable.handleKeydown(mockEvent, 'test-context')
        
        expect(mockEvent.preventDefault).toHaveBeenCalled()
        expect(mockOnSelect).toHaveBeenCalledWith(
          itemsRef.value[0], // Selected item
          0,                  // Index
          'test-context'      // Context ID
        )
      })

      it('should not call onSelect when items array is empty', async () => {
        itemsRef.value = []
        mockEvent.key = 'Enter'
        
        await composable.handleKeydown(mockEvent, 'test-context')
        
        expect(mockOnSelect).not.toHaveBeenCalled()
      })
    })

    describe('unhandled keys', () => {
      it('should not prevent default for unhandled keys', async () => {
        mockEvent.key = 'a'
        
        await composable.handleKeydown(mockEvent, 'test-context')
        
        expect(mockEvent.preventDefault).not.toHaveBeenCalled()
        expect(mockOnSelect).not.toHaveBeenCalled()
        expect(mockOnClose).not.toHaveBeenCalled()
      })
    })
  })

  describe('focusOption', () => {
    it('should focus the correct option element', () => {
      composable.focusOption('test-context', 1)
      
      expect(mockGetOptionSelector).toHaveBeenCalledWith('test-context', 1)
      expect(mockContainer.querySelector).toHaveBeenCalledWith('[data-context="test-context"][data-option="1"]')
      expect(mockOption2.focus).toHaveBeenCalled()
    })

    it('should handle missing container gracefully', () => {
      containerRef.value = undefined
      
      expect(() => composable.focusOption('test-context', 0)).not.toThrow()
      expect(mockGetOptionSelector).toHaveBeenCalledWith('test-context', 0)
      expect(mockContainer.querySelector).not.toHaveBeenCalled()
    })

    it('should handle missing option element gracefully', () => {
      ;(mockContainer.querySelector as ReturnType<typeof vi.fn>).mockReturnValue(null)
      
      expect(() => composable.focusOption('test-context', 0)).not.toThrow()
      expect(mockOption1.focus).not.toHaveBeenCalled()
      expect(mockOption2.focus).not.toHaveBeenCalled()
    })
  })

  describe('initializeActiveOption', () => {
    it('should set active index and focus option when items exist', async () => {
      await composable.initializeActiveOption('test-context', 1)
      
      expect(composable.activeIndex.value['test-context']).toBe(1)
      expect(nextTick).toHaveBeenCalled()
      expect(mockGetOptionSelector).toHaveBeenCalledWith('test-context', 1)
    })

    it('should clamp selectedIndex to valid range', async () => {
      await composable.initializeActiveOption('test-context', 10)
      
      expect(composable.activeIndex.value['test-context']).toBe(1) // Clamped to max
    })

    it('should handle negative selectedIndex by clamping to 0', async () => {
      await composable.initializeActiveOption('test-context', -5)
      
      expect(composable.activeIndex.value['test-context']).toBe(0) // Clamped to min
    })

    it('should return early and not focus when items list is empty', async () => {
      itemsRef.value = []
      
      await composable.initializeActiveOption('test-context', 0)
      
      expect(composable.activeIndex.value['test-context']).toBeUndefined()
      expect(mockGetOptionSelector).not.toHaveBeenCalled()
      expect(nextTick).not.toHaveBeenCalled()
    })
  })

  describe('focusTrigger', () => {
    it('should focus the trigger button', () => {
      const mockTrigger = { focus: vi.fn() } as unknown as HTMLElement
      ;(mockContainer.querySelector as ReturnType<typeof vi.fn>).mockReturnValue(mockTrigger)
      
      composable.focusTrigger('button[data-trigger]')
      
      expect(mockContainer.querySelector).toHaveBeenCalledWith('button[data-trigger]')
      expect(mockTrigger.focus).toHaveBeenCalled()
    })

    it('should handle missing container gracefully', () => {
      containerRef.value = undefined
      
      expect(() => composable.focusTrigger('button')).not.toThrow()
    })

    it('should handle missing trigger element gracefully', () => {
      ;(mockContainer.querySelector as ReturnType<typeof vi.fn>).mockReturnValue(null)
      
      expect(() => composable.focusTrigger('button')).not.toThrow()
    })
  })
})