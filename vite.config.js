import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        solutions: resolve(__dirname, 'solutions.html'),
        pricing: resolve(__dirname, 'pricing.html'),
        ai: resolve(__dirname, 'ai.html'),
        about: resolve(__dirname, 'about.html'),
        developers: resolve(__dirname, 'developers.html'),
        security: resolve(__dirname, 'security.html'),
        contact: resolve(__dirname, 'contact.html'),
        careers: resolve(__dirname, 'careers.html'),
        team: resolve(__dirname, 'team.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        terms: resolve(__dirname, 'terms.html'),
        cookies: resolve(__dirname, 'cookies.html'),
        refund_policy: resolve(__dirname, 'refund-policy.html'),
        dpa: resolve(__dirname, 'dpa.html'),
        merchant_agreement: resolve(__dirname, 'merchant-agreement.html'),
        sla: resolve(__dirname, 'sla.html'),
        samples: resolve(__dirname, 'samples.html'),
        knowledge: resolve(__dirname, 'knowledge.html'),
        blog: resolve(__dirname, 'blog.html'),
        article: resolve(__dirname, 'article.html'),
        admin: resolve(__dirname, 'admin.html')
      }
    }
  }
});
