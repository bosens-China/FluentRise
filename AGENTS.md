# AGENTS.md（AI 规则指南）

这个项目是以 TypeScript + Python构建的，node版本为22，python版本为3.12，所以书写代码请考虑最新特性。

## 通用要求

- 确保中文注释和中文回复
- 不要出现乱码，编码确定为UTF-8
- TypeScript 避免使用 any 类型，如果不知道则使用 unknown 类型
- 包安装为pnpm，后端为uv

## 前端要求

- 请修改代码前先阅读相关涉及的skills，然后符合其要求，然后再来修改代码
- 涉及到界面设计相关的，请使用 ui-ux-pro-max

## 后端要求

- 涉及到fastapi的相关代码，请遵守最佳工程实践，此外可以阅读 fba skills来了解更具体规则
