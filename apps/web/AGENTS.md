# AGENTS.md

你是 JavaScript、Rsbuild 和 Web 应用开发方面的专家。你编写的代码具有可维护性、高性能和良好的可访问性。

## 通用建议

- 导入svg，安装了 `@rsbuild/plugin-svgr`，可以直接 `import Logo from './logo.svg?react';`
- 开启了 `React Compiler`，需要代码请额外注意
- 路由使用了 `@tanstack/router`，确保编写的路由代码符合 `@tanstack/router` 的规范。
- 样式使用了 Tailwind，我们优先使用Tailwind，实在不方便书写再用style等方案
- ui库和hooks，分别用了ahooks和antd，请确保优先复用
- 禁止启动开发服务器，可以运行 `pnpm run build`来测试
- 每次修改完代码，都运行 `pnpm run type-check` 来检查类型错误 和 `pnpm run lint` 来检查代码规范

## 文档

- Rsbuild: https://rsbuild.rs/llms.txt
- Rspack: https://rspack.rs/llms.txt
- Antd：https://ant.design/llms.txt
