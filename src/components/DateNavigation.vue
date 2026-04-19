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
  gap: 10px;
  padding: 6px var(--spacing-md);
  background: var(--toolbar-bg);
  border-bottom: 1px solid var(--paper-edge, var(--border-color));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    inset 0 -1px 0 rgba(0, 0, 0, 0.08),
    0 2px 0 rgba(0, 0, 0, 0.04);
  position: sticky;
  top: 0;
  z-index: 100;
  min-height: 44px;
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.nav-btn {
  background: var(--btn-bg);
  border: 1px solid var(--paper-edge, var(--border-color));
  border-radius: var(--radius-lg);
  width: 34px;
  height: 28px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  color: var(--ink, var(--text-primary));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    inset 0 -1px 0 rgba(0, 0, 0, 0.08);
  font-family: var(--font-body);
}

.nav-btn:hover {
  background: var(--btn-bg-hover);
}

.nav-arrow {
  font-size: var(--font-xl);
  font-weight: bold;
  line-height: 1;
}

.today-btn {
  background: var(--btn-bg);
  color: var(--ink, var(--text-primary));
  border: 1px solid var(--paper-edge, var(--border-color));
  border-radius: var(--radius-lg);
  padding: 0 14px;
  height: 28px;
  cursor: pointer;
  font-family: var(--font-body);
  font-weight: 600;
  font-size: var(--font-md);
  transition: all var(--transition-fast);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    inset 0 -1px 0 rgba(0, 0, 0, 0.08);
}

.today-btn:hover {
  background: var(--btn-bg-hover);
}

.date-display {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  height: 28px;
  background: var(--dateblock-bg);
  border: 1px solid var(--paper-edge, var(--border-color));
  border-radius: var(--radius-lg);
  color: var(--ink, var(--text-primary));
  font-family: var(--font-mono);
  font-size: var(--font-sm);
  letter-spacing: 0.04em;
  position: relative;
}

.date-display::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--teal-glow);
  box-shadow: 0 0 8px var(--teal-glow);
  animation: tc-pulse 2s infinite;
}

@keyframes tc-pulse {
  50% {
    opacity: 0.4;
  }
}

.date-label {
  font-family: var(--font-mono);
  font-weight: 500;
  color: var(--ink, var(--text-primary));
  font-size: var(--font-sm);
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.date-picker {
  background: transparent;
  border: none;
  border-left: 1px solid var(--paper-edge, var(--border-color));
  border-radius: 0;
  padding: 0 0 0 10px;
  color: var(--ink, var(--text-primary));
  font-family: var(--font-mono);
  font-size: var(--font-sm);
  cursor: pointer;
  outline: none;
  transition: all var(--transition-fast);
}

:global(body[data-theme='dark']) .date-picker {
  color-scheme: dark;
  border-left-color: #2a3b3e;
}

.date-picker:focus {
  outline: none;
}

.reporting-app-btn {
  background: linear-gradient(#1a6d6f, #0b4244);
  color: #f4ead0;
  border: 1px solid #062b2d;
  border-radius: var(--radius-lg);
  height: 28px;
  padding: 0 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-family: var(--font-display);
  letter-spacing: 0.12em;
  text-transform: lowercase;
  font-size: var(--font-sm);
  transition: all var(--transition-fast);
  text-shadow: 0 -1px 0 rgba(0, 0, 0, 0.3);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    inset 0 -2px 0 rgba(0, 0, 0, 0.25);
}

.reporting-app-btn:hover {
  filter: brightness(1.1);
}

.reporting-app-icon {
  font-size: var(--font-lg);
}

.setup-btn {
  background: var(--btn-bg);
  border: 1px solid var(--paper-edge, var(--border-color));
  border-radius: var(--radius-lg);
  height: 28px;
  padding: 0 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  color: var(--ink, var(--text-primary));
  font-family: var(--font-body);
  font-weight: 600;
  font-size: var(--font-md);
  transition: all var(--transition-fast);
  position: relative;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    inset 0 -1px 0 rgba(0, 0, 0, 0.08);
}

.setup-btn:hover {
  background: var(--btn-bg-hover);
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
