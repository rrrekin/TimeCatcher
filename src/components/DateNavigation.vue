<template>
  <nav class="time-navigation">
    <div class="nav-controls">
      <button class="nav-btn" @click="$emit('goToPreviousDay')" title="Previous Day">
        <span class="nav-arrow">‹</span>
      </button>

      <button class="today-btn" @click="$emit('goToToday')">
        Today
      </button>

      <button class="nav-btn" @click="$emit('goToNextDay')" title="Next Day">
        <span class="nav-arrow">›</span>
      </button>

      <div class="date-display">
        <label class="date-label">{{ formattedDate }}</label>
        <input
            type="date"
            :value="dateInputValue"
            @input="$emit('updateDate', ($event.target as HTMLInputElement).value)"
            class="date-picker"
        />
      </div>
    </div>

    <button class="setup-btn" @click="$emit('openSetup')" title="Open Settings">
      <span class="setup-icon">⚙️</span>
      Setup
    </button>
  </nav>
</template>

<script setup lang="ts">
// Props
defineProps({
  formattedDate: {
    type: String,
    required: true
  },
  dateInputValue: {
    type: String,
    required: true
  }
})

// Emits
defineEmits<{
  goToPreviousDay: []
  goToToday: []
  goToNextDay: []
  updateDate: [value: string]
  openSetup: []
}>()
</script>

<style scoped>
.time-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
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
  flex-direction: column;
  align-items: center;
  gap: 8px;
  position: relative;
}

.date-label {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 16px;
  text-align: center;
  min-width: 200px;
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