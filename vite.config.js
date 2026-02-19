const { defineConfig } = require("vite");
const reactPlugin = require("@vitejs/plugin-react");

module.exports = defineConfig({
  plugins: [reactPlugin.default ? reactPlugin.default() : reactPlugin()],
  server: {
    host: "127.0.0.1",
    port: 5273,
    strictPort: true
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
