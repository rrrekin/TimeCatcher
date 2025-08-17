<template>
  <nav class="time-navigation" aria-label="Date navigation">
    <div class="nav-controls">
      <button type="button" class="nav-btn" @click="$emit('goToPreviousDay')" title="Previous Day" aria-label="Previous day">
        <span class="nav-arrow" aria-hidden="true">‹</span>
      </button>

      <button type="button" class="today-btn" @click="$emit('goToToday')" title="Today" aria-label="Today">
        Today
      </button>

      <button type="button" class="nav-btn" @click="$emit('goToNextDay')" title="Next Day" aria-label="Next day">
        <span class="nav-arrow" aria-hidden="true">›</span>
      </button>

      <div class="date-display">
        <label class="date-label" :for="dateInputId">{{ formattedDate }}</label>
        <input
            type="date"
            :id="dateInputId"
            :value="dateInputValue"
            @change="$emit('updateDate', ($event.target as HTMLInputElement).value)"
            class="date-picker"
        />
      </div>
    </div>

    <button type="button" class="setup-btn" @click="$emit('openSetup')" title="Open Settings" aria-label="Open settings">
      <span class="setup-icon" aria-hidden="true">⚙️</span>
      Settings
    </button>
  </nav>
</template>

<script setup lang="ts">
import { useId } from 'vue'

// Props
defineProps<{
  formattedDate: string
  dateInputValue: string
}>()

// Emits
defineEmits<{
  goToPreviousDay: []
  goToToday: []
  goToNextDay: []
  updateDate: [value: string]
  openSetup: []
}>()

// Generate SSR-safe unique identifier per component instance
const dateInputId = useId()
</script>

<style scoped>
.time-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  box-shadow: 0 2px 8px var(--shadow-color);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.nav-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  width: 40px;
  height: 40px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: var(--text-primary);
}

.nav-btn:hover {
  background: var(--primary);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--shadow-color);
}

.nav-arrow {
  font-size: 18px;
  font-weight: bold;
}

.today-btn {
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
}

.today-btn:hover {
  background: var(--emerald);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--shadow-color);
}

.date-display {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  position: relative;
}

.date-label {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 16px;
  white-space: nowrap;
}

.date-picker {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 8px 12px;
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.date-picker:hover {
  border-color: var(--primary);
}

.date-picker:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(87, 189, 175, 0.1);
}

.setup-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
  font-weight: 600;
  transition: all 0.2s ease;
}

.setup-btn:hover {
  background: var(--primary);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--shadow-color);
}

.setup-icon {
  font-size: 16px;
}
</style>