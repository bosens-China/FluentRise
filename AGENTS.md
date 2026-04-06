# AGENTS.md（AI 规则指南）

这个项目是以 TypeScript + Python构建的，node版本为22，python版本为3.12，所以书写代码请考虑最新特性。

## 通用要求

- 确保中文注释和中文回复
- 不要出现乱码，编码确定为UTF-8
- TypeScript 避免使用 any 类型，如果不知道则使用 unknown 类型
- 包安装为pnpm，后端为uv
- 每个文件尽量不要超出400行，如果超出请按照最佳工程结构拆分，检查可以使用pnpm run apps:lines
- 读取和写入文件，遵循utf-8编码规范，避免出现乱码问题

## 前端要求

- 请修改代码前先阅读相关涉及的skills，然后符合其要求，然后再来修改代码
- 涉及到界面设计相关的，请使用 ui-ux-pro-max
- 默认的设计规范位置 ./design-system/fluentrise/MASTER.md
- 运行 pnpm run lint 和 pnpm run type-check 来检查代码是否符合规范和类型要求

## py代码要求

- 涉及到fastapi的相关代码，请遵守最佳工程实践，此外可以阅读 fba skills来了解更具体规则
- 请使用ruff和pyright来格式化和检查代码，
