<template>
  <div id="app">
    <nav class="time-navigation">
      <div class="nav-controls">
        <button class="nav-btn" @click="goToPreviousDay" title="Previous Day">
          <span class="nav-arrow">‹</span>
        </button>
        
        <button class="today-btn" @click="goToToday">
          Today
        </button>
        
        <button class="nav-btn" @click="goToNextDay" title="Next Day">
          <span class="nav-arrow">›</span>
        </button>
        
        <div class="date-display">
          <label class="date-label">{{ formattedDate }}</label>
          <input 
            type="date" 
            v-model="dateInputValue" 
            class="date-picker"
          />
        </div>
      </div>
      
      <button class="setup-btn" @click="openSetup" title="Open Settings">
        <span class="setup-icon">⚙️</span>
        Setup
      </button>
    </nav>
    
    <div class="layout">
      <nav class="sidebar">
        <ul class="nav-menu">
          <li class="nav-item" :class="{ active: activeSection === 'dashboard' }" @click="activeSection = 'dashboard'">
            <span class="nav-icon">📊</span>
            Dashboard
          </li>
          <li class="nav-item" :class="{ active: activeSection === 'tracking' }" @click="activeSection = 'tracking'">
            <span class="nav-icon">⏱️</span>
            Time Tracking
          </li>
          <li class="nav-item" :class="{ active: activeSection === 'projects' }" @click="activeSection = 'projects'">
            <span class="nav-icon">📁</span>
            Projects
          </li>
          <li class="nav-item" :class="{ active: activeSection === 'reports' }" @click="activeSection = 'reports'">
            <span class="nav-icon">📈</span>
            Reports
          </li>
          <li class="nav-item" :class="{ active: activeSection === 'settings' }" @click="activeSection = 'settings'">
            <span class="nav-icon">⚙️</span>
            Settings
          </li>
        </ul>
      </nav>
      
      <main class="main-content">
        <div v-if="activeSection === 'dashboard'" class="section">
          <h2>Dashboard</h2>
          <p>Overview of your productivity metrics and recent activity.</p>
          <div class="placeholder-content">
            <div class="card">Today's Progress</div>
            <div class="card">Recent Tasks</div>
            <div class="card">Time Summary</div>
          </div>
        </div>
        
        <div v-if="activeSection === 'tracking'" class="section">
          <h2>Time Tracking</h2>
          <p>Start and stop time tracking for your tasks.</p>
          <div class="placeholder-content">
            <div class="card">Active Timer</div>
            <div class="card">Quick Start Tasks</div>
            <div class="card">Today's Sessions</div>
          </div>
        </div>
        
        <div v-if="activeSection === 'projects'" class="section">
          <h2>Projects</h2>
          <p>Manage your projects and associated tasks.</p>
          <div class="placeholder-content">
            <div class="card">Active Projects</div>
            <div class="card">Project Statistics</div>
            <div class="card">Create New Project</div>
          </div>
        </div>
        
        <div v-if="activeSection === 'reports'" class="section">
          <h2>Reports</h2>
          <p>View detailed reports and analytics of your time usage.</p>
          <div class="placeholder-content">
            <div class="card">Weekly Report</div>
            <div class="card">Project Breakdown</div>
            <div class="card">Export Data</div>
          </div>
        </div>
        
        <div v-if="activeSection === 'settings'" class="section">
          <h2>Settings</h2>
          <p>Configure your TimeCatcher preferences.</p>
          <div class="placeholder-content">
            <div class="card">General Settings</div>
            <div class="card">Notifications</div>
            <div class="card">Data Export</div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const activeSection = ref('dashboard')
const selectedDate = ref(new Date())

const formattedDate = computed(() => {
  return selectedDate.value.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

const dateInputValue = computed({
  get: () => selectedDate.value.toISOString().split('T')[0],
  set: (value: string) => {
    selectedDate.value = new Date(value + 'T00:00:00')
  }
})

const goToPreviousDay = () => {
  const newDate = new Date(selectedDate.value)
  newDate.setDate(newDate.getDate() - 1)
  selectedDate.value = newDate
}

const goToNextDay = () => {
  const newDate = new Date(selectedDate.value)
  newDate.setDate(newDate.getDate() + 1)
  selectedDate.value = newDate
}

const goToToday = () => {
  selectedDate.value = new Date()
}

const openSetup = () => {
  // TODO: Implement setup modal
  console.log('Opening setup modal...')
}
</script>

<style>
:root {
  --verdigris: #57bdaf;
  --mantis: #59c964;
  --asparagus: #69966f;
  --emerald: #56b372;
  --aero: #1fbff0;
  
  --primary: var(--verdigris);
  --secondary: var(--emerald);
  --accent: var(--aero);
  --success: var(--mantis);
  --neutral: var(--asparagus);
  
  --bg-primary: #ffffff;
  --bg-secondary: #f8fffe;
  --text-primary: #2d4a3d;
  --text-secondary: #4a6b56;
  --text-muted: #7a9184;
  --border-color: #e0ede8;
  --shadow-color: rgba(87, 189, 175, 0.1);
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-secondary);
}

#app {
  height: 100vh;
}
</style>

<style scoped>
* {
  box-sizing: border-box;
}

.time-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  box-shadow: 0 1px 2px var(--shadow-color);
  min-height: 50px;
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-btn {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-secondary);
}

.nav-btn:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.nav-arrow {
  font-size: 1.2rem;
  font-weight: bold;
}

.today-btn {
  background: var(--success);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.today-btn:hover {
  background: var(--mantis);
}

.date-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: 0.5rem;
}

.date-label {
  color: var(--text-primary);
  font-weight: 500;
  font-size: 0.9rem;
  min-width: 180px;
}

.date-picker {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  color: var(--text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.date-picker:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 1px rgba(87, 189, 175, 0.3);
}

.setup-btn {
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.setup-btn:hover {
  background: var(--aero);
}

.setup-icon {
  font-size: 0.9rem;
}

.layout {
  display: flex;
  height: calc(100vh - 50px);
}

.sidebar {
  width: 180px;
  background: var(--bg-primary);
  border-right: 1px solid var(--border-color);
  box-shadow: 1px 0 3px var(--shadow-color);
}

.nav-menu {
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-item {
  padding: 0.75rem 1rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.9rem;
}

.nav-item:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.nav-item.active {
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  color: white;
  box-shadow: inset 2px 0 0 var(--accent);
}

.nav-icon {
  font-size: 1rem;
}

.main-content {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  background: var(--bg-secondary);
}

.section h2 {
  color: var(--text-primary);
  margin-bottom: 0.25rem;
  font-size: 1.4rem;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.section p {
  color: var(--text-muted);
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.placeholder-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.card {
  background: var(--bg-primary);
  padding: 1rem;
  border-radius: 6px;
  box-shadow: 0 2px 6px var(--shadow-color);
  text-align: center;
  color: var(--text-secondary);
  font-weight: 500;
  border: 1px solid var(--border-color);
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  font-size: 0.9rem;
}

.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--primary), var(--secondary), var(--accent));
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--shadow-color);
  border-color: var(--primary);
}
</style>