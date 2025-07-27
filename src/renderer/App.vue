<template>
  <div id="app">
    <header class="header">
      <h1>TimeCatcher</h1>
      <p>Task & Time Tracking Desktop App</p>
    </header>
    
    <main class="main">
      <div class="welcome">
        <h2>Welcome to TimeCatcher</h2>
        <p>Your productivity companion for tracking tasks and time.</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
// Main app component
</script>

<style scoped>
.header {
  background: #2c3e50;
  color: white;
  padding: 2rem;
  text-align: center;
}

.header h1 {
  margin: 0;
  font-size: 2.5rem;
}

.header p {
  margin: 0.5rem 0 0 0;
  opacity: 0.8;
}

.main {
  padding: 2rem;
}

.welcome {
  text-align: center;
  max-width: 600px;
  margin: 0 auto;
}

.welcome h2 {
  color: #2c3e50;
  margin-bottom: 1rem;
}
</style>