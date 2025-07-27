# TimeCatcher Development Instructions

## Code Style
- Use TypeScript strict mode
- Follow Vue 3 Composition API
- Prefer async/await over promises
- Use meaningful variable names
- Add JSDoc comments for functions

## Database Operations
- All database operations in main process
- Use IPC for renderer communication
- Handle errors gracefully
- Use transactions for multiple operations

## Vue Components
- Single File Components (.vue)
- Composition API with <script setup>
- TypeScript props validation
- Emit events for parent communication