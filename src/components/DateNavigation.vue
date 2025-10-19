<template>
  <nav class="time-navigation" aria-label="Date navigation">
    <div class="nav-controls">
      <div class="app-icon" data-testid="app-logo" aria-hidden="true">
        <img src="/logo.svg" alt="" class="icon" />
      </div>
      <button
        type="button"
        class="nav-btn"
        @click="$emit('goToPreviousDay')"
        title="Previous Day"
        aria-label="Previous day"
      >
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

    <button
      v-if="reportingAppUrl"
      type="button"
      class="reporting-app-btn"
      @click="$emit('openReportingApp')"
      :title="`Open ${reportingAppButtonText}`"
      :aria-label="`Open ${reportingAppButtonText}`"
    >
      <span class="reporting-app-icon" aria-hidden="true">🌐</span>
      {{ reportingAppButtonText }}
    </button>

    <button
      type="button"
      class="setup-btn"
      :class="{ 'has-error': httpServerError }"
      @click="$emit('openSetup')"
      :title="httpServerError ? `Settings (HTTP Server Error: ${httpServerError})` : 'Open Settings'"
      :aria-label="httpServerError ? `Open settings - HTTP Server Error: ${httpServerError}` : 'Open settings'"
    >
      <span class="setup-icon" aria-hidden="true">⚙️</span>
      <span v-if="httpServerError" class="error-indicator" aria-hidden="true">🔴</span>
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
  reportingAppButtonText: string
  reportingAppUrl: string
  httpServerError?: string
}>()

// Emits
defineEmits<{
  goToPreviousDay: []
  goToToday: []
  goToNextDay: []
  updateDate: [value: string]
  openReportingApp: []
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
  padding: var(--spacing-md) var(--spacing-xl);
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  box-shadow: 0 2px 8px var(--shadow-color);
  position: sticky;
  top: 0;
  z-index: 100;
  min-height: 56px;
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.nav-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  width: 36px;
  height: 36px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  color: var(--text-primary);
}

.nav-btn:hover {
  background: var(--primary);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px var(--shadow-color);
}

.nav-arrow {
  font-size: var(--font-xl);
  font-weight: bold;
  line-height: 1;
}

.today-btn {
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  padding: var(--spacing-sm) var(--spacing-lg);
  cursor: pointer;
  font-weight: 600;
  font-size: var(--font-base);
  transition: all var(--transition-fast);
}

.today-btn:hover {
  background: var(--emerald);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px var(--shadow-color);
}

.date-display {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--spacing-md);
  position: relative;
}

.date-label {
  font-weight: 600;
  color: var(--text-primary);
  font-size: var(--font-base);
  white-space: nowrap;
}

.date-picker {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  color: var(--text-primary);
  font-size: var(--font-base);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.date-picker:hover {
  border-color: var(--primary);
}

.date-picker:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(87, 189, 175, 0.1);
}

.reporting-app-btn {
  background: var(--aero);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  padding: var(--spacing-sm) var(--spacing-lg);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-weight: 600;
  font-size: var(--font-base);
  transition: all var(--transition-fast);
}

.reporting-app-btn:hover {
  background: #1ba3d1;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px var(--shadow-color);
}

.reporting-app-icon {
  font-size: var(--font-lg);
}

.setup-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--spacing-sm) var(--spacing-lg);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  color: var(--text-primary);
  font-weight: 600;
  font-size: var(--font-base);
  transition: all var(--transition-fast);
  position: relative;
}

.setup-btn:hover {
  background: var(--primary);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px var(--shadow-color);
}

.setup-icon {
  font-size: 16px;
}

.setup-btn.has-error {
  border-color: #e74c3c;
  background: rgba(231, 76, 60, 0.1);
}

.setup-btn.has-error:hover {
  background: #e74c3c;
  border-color: #e74c3c;
}

.error-indicator {
  font-size: 12px;
  position: absolute;
  top: -2px;
  right: -2px;
  background: white;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.app-icon {
  display: flex;
  align-items: center;
  margin-right: 12px;
}

.icon {
  width: 32px;
  height: 32px;
  transition: transform 0.2s ease;
}

.icon:hover {
  transform: scale(1.1);
}
</style>
