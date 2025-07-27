import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
    plugins: [vue()],
    base: './',
    root: 'src/renderer',
    build: {
        outDir: '../../dist/renderer'
    },
    server: {
        port: 5173,
        strictPort: true
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        }
    }
})