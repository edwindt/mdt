import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { nodeResolve } from '@rollup/plugin-node-resolve';
import nodePolyfills from 'rollup-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(),
    nodeResolve(),
    nodePolyfills(),],

  define: {

    'global.Buffer': true, // provide 'Buffer' global variable
    'global.process': true,
    'process.env.NODE_ENV': JSON.stringify('development'), // define NODE_ENV to avoid Plotly.js error
  },

})
