import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  // base 用相对路径，令单文件产物可被 file:// 直接打开
  base: './',
  plugins: [viteSingleFile()],
  build: {
    target: 'es2022',
    assetsInlineLimit: 100_000_000, // 强制内联一切资源
    cssCodeSplit: false,
  },
});
