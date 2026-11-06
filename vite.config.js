import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        driver: resolve(import.meta.dirname, 'driver.html'),
        report: resolve(import.meta.dirname, 'report.html'),
        bericht: resolve(import.meta.dirname, 'bericht.html'),
        admin: resolve(import.meta.dirname, 'admin.html'),
        accountant: resolve(import.meta.dirname, 'accountant.html'),
      },
    },
  },
});
