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
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  height: 100vh;
  overflow: hidden;
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
  background: #2c3e50;
  color: white;
  padding: 1.5rem;
  text-align: center;
  border-bottom: 1px solid #34495e;
}

.header h1 {
  margin: 0;
  font-size: 2rem;
}

.header p {
  margin: 0.5rem 0 0 0;
  opacity: 0.8;
  font-size: 0.9rem;
}

.layout {
  display: flex;
  height: calc(100vh - 120px);
}

.sidebar {
  width: 250px;
  background: #34495e;
  border-right: 1px solid #2c3e50;
}

.nav-menu {
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-item {
  padding: 1rem 1.5rem;
  color: #bdc3c7;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-bottom: 1px solid #2c3e50;
}

.nav-item:hover {
  background: #3c5675;
  color: white;
}

.nav-item.active {
  background: #3498db;
  color: white;
}

.nav-icon {
  font-size: 1.2rem;
}

.main-content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  background: #f8f9fa;
}

.section h2 {
  color: #2c3e50;
  margin-bottom: 0.5rem;
  font-size: 1.8rem;
}

.section p {
  color: #7f8c8d;
  margin-bottom: 2rem;
}

.placeholder-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.card {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  text-align: center;
  color: #34495e;
  font-weight: 500;
  border: 1px solid #e9ecef;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}
</style>