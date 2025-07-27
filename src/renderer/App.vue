<template>
  <div id="app">
    <header class="header">
      <h1>TimeCatcher</h1>
      <p>Task & Time Tracking Desktop App</p>
    </header>
    
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
import { ref } from 'vue'

const activeSection = ref('dashboard')
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

.header {
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  color: white;
  padding: 1.5rem;
  text-align: center;
  border-bottom: 1px solid var(--border-color);
  box-shadow: 0 2px 8px var(--shadow-color);
}

.header h1 {
  margin: 0;
  font-size: 2rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.header p {
  margin: 0.5rem 0 0 0;
  opacity: 0.9;
  font-size: 0.9rem;
}

.layout {
  display: flex;
  height: calc(100vh - 120px);
}

.sidebar {
  width: 250px;
  background: var(--bg-primary);
  border-right: 1px solid var(--border-color);
  box-shadow: 2px 0 8px var(--shadow-color);
}

.nav-menu {
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-item {
  padding: 1rem 1.5rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.nav-item:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
  transform: translateX(2px);
}

.nav-item.active {
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  color: white;
  box-shadow: inset 3px 0 0 var(--accent);
}

.nav-icon {
  font-size: 1.2rem;
}

.main-content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  background: var(--bg-secondary);
}

.section h2 {
  color: var(--text-primary);
  margin-bottom: 0.5rem;
  font-size: 1.8rem;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.section p {
  color: var(--text-muted);
  margin-bottom: 2rem;
}

.placeholder-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.card {
  background: var(--bg-primary);
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 12px var(--shadow-color);
  text-align: center;
  color: var(--text-secondary);
  font-weight: 500;
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--primary), var(--secondary), var(--accent));
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px var(--shadow-color);
  border-color: var(--primary);
}
</style>