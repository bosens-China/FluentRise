import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSvgr } from '@rsbuild/plugin-svgr';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { tanstackRouter } from '@tanstack/router-plugin/rspack';
import { codeInspectorPlugin } from 'code-inspector-plugin';

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  html: {
    title: 'FluentRise - 每日英语阅读',
    favicon: './public/favicon.svg',
  },
  plugins: [
    pluginReact(),
    pluginSvgr(),
    pluginBabel({
      include: /\.(?:jsx|tsx)$/,
      babelLoaderOptions(opts) {
        opts.plugins?.unshift('babel-plugin-react-compiler');
      },
    }),
  ],
  tools: {
    rspack: {
      plugins: [
        tanstackRouter({
          target: 'react',
          autoCodeSplitting: true,
        }),
        codeInspectorPlugin({
          bundler: 'rspack',
        }),
      ],
    },
  },
});
