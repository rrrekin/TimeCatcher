<template>
  <div
    v-if="shouldShowNotification"
    class="update-notification"
    @mouseenter="showTooltip = true"
    @mouseleave="showTooltip = false"
  >
    <!-- Red bell icon -->
    <div
      class="bell-icon"
      :class="{ 'bell-animate': isCheckingForUpdates }"
      aria-label="New version available"
      role="button"
      tabindex="0"
      @click="showTooltip = !showTooltip"
      @keydown.enter="showTooltip = !showTooltip"
      @keydown.escape="showTooltip = false"
    >
      🔔
    </div>

    <!-- Hover tooltip -->
    <Transition name="tooltip">
      <div v-if="showTooltip && releaseInfo" class="tooltip" role="tooltip" @click.stop>
        <div class="tooltip-content">
          <div class="version-info">
            <div class="update-title">Update Available</div>
            <div class="version-text">v{{ currentVersion }} → v{{ latestVersion }}</div>
          </div>

          <div class="tooltip-actions">
            <button class="action-btn view-btn" @click="handleViewRelease">View Release</button>
            <button class="action-btn dismiss-btn" @click="handleDismiss">Dismiss</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUpdateNotification } from '@/composables/useUpdateNotification'

const showTooltip = ref(false)

const {
  shouldShowNotification,
  isCheckingForUpdates,
  currentVersion,
  latestVersion,
  releaseInfo,
  dismissCurrentUpdate,
  openReleasePage
} = useUpdateNotification()

// Methods
const handleViewRelease = () => {
  showTooltip.value = false
  openReleasePage()
}

const handleDismiss = () => {
  showTooltip.value = false
  dismissCurrentUpdate()
}

// Close tooltip when clicking outside
const handleClickOutside = (event: Event) => {
  if (showTooltip.value) {
    const target = event.target as HTMLElement
    if (!target.closest('.update-notification')) {
      showTooltip.value = false
    }
  }
}

// Add global click listener when tooltip is shown
import { onMounted, onUnmounted, watch } from 'vue'

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

watch(showTooltip, newValue => {
  if (newValue) {
    // Close tooltip after 10 seconds of no interaction
    setTimeout(() => {
      if (showTooltip.value) {
        showTooltip.value = false
      }
    }, 10000)
  }
})
</script>

<style scoped>
.update-notification {
  position: relative;
  display: inline-block;
  margin-left: 0.5rem;
}

.bell-icon {
  font-size: 14px;
  cursor: pointer;
  padding: 2px;
  border-radius: 50%;
  transition: all var(--transition-fast);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: #dc3545; /* Red color for notification */
  filter: drop-shadow(0 0 2px rgba(220, 53, 69, 0.3));
}

.bell-icon:hover {
  transform: scale(1.1);
  filter: drop-shadow(0 0 4px rgba(220, 53, 69, 0.5));
}

.bell-icon:focus {
  outline: 2px solid var(--focus-shadow);
  outline-offset: 2px;
}

.bell-animate {
  animation: bell-ring 1s ease-in-out infinite;
}

@keyframes bell-ring {
  0%,
  50%,
  100% {
    transform: rotate(0deg);
  }
  10%,
  30% {
    transform: rotate(-10deg);
  }
  20%,
  40% {
    transform: rotate(10deg);
  }
}

.tooltip {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 8px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-shadow: 0 4px 12px var(--shadow-color);
  width: 240px;
  max-width: 90vw;
  z-index: 1000;
  overflow: hidden;
}

.tooltip-content {
  padding: 0.75rem;
}

.version-info {
  margin-bottom: 0.75rem;
  text-align: center;
}

.update-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.version-text {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.tooltip-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.action-btn {
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  flex: 1;
}

.view-btn {
  background: var(--primary);
  color: white;
}

.view-btn:hover {
  background: var(--secondary);
}

.dismiss-btn {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.dismiss-btn:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

/* Tooltip transition */
.tooltip-enter-active,
.tooltip-leave-active {
  transition: all 0.2s ease;
}

.tooltip-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
}

.tooltip-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
}

/* Responsive adjustments */
@media (max-width: 400px) {
  .tooltip {
    width: calc(100vw - 2rem);
    right: -1rem;
  }
}
</style>
