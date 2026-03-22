# FluentRise 工程结构说明

本文档记录当前主要前端页面的职责拆分，方便后续继续补功能时快速定位。

## 1. 前端页面拆分原则

- 路由文件优先负责数据请求、页面状态编排和跳转。
- 展示层、面板区、弹窗区尽量拆到组件目录。
- 当单个文件明显超过 `400` 行时，优先考虑按“页面区块”拆分，而不是按零散函数拆分。

## 2. 当前重点页面结构

### 2.1 课文页

主路由：

- `apps/web/src/routes/article.$articleId.tsx`

相关组件：

- `apps/web/src/components/article/ArticleReader.tsx`
  - 负责课文阅读、音频播放、句子拆解、练习和笔记入口。
- `apps/web/src/components/article/ArticlePageActions.tsx`
  - 负责页面顶部返回、重生成、AI 对话入口。
- `apps/web/src/components/article/ArticlePageStatusPanels.tsx`
  - 负责提示卡、Lesson Helper、复习进度条、复习唤醒卡片。
- `apps/web/src/components/article/ArticlePageModals.tsx`
  - 负责反馈弹窗、复习前自评弹窗、复习完成弹窗、课后鼓励弹窗。

当前约定：

- 路由文件保留请求逻辑和状态机。
- 页面区块与弹窗统一通过组件承接。
- 新增语音纠错时，优先挂在课文页状态面板区或阅读器区，不要再把弹窗逻辑堆回路由文件。

### 2.2 游乐园页

主路由：

- `apps/web/src/routes/playground.tsx`

相关组件：

- `apps/web/src/components/playground/PlaygroundQuestionCard.tsx`
  - 负责题目展示、输入区、提示与答案反馈。
- `apps/web/src/components/playground/PlaygroundCompleteModal.tsx`
  - 负责完成弹窗和统计展示。

当前约定：

- 路由文件负责题目请求、答题状态、音频播放和最终提交。
- 题目 UI 与完成弹窗统一复用组件，后续新增题型时优先扩展组件而不是继续膨胀路由。

## 3. 后续拆分建议

目前仍建议保持关注但不必立刻继续拆分的文件：

- `apps/backend/app/services/question_generator.py`
- `apps/backend/app/api/v1/review.py`
- `apps/web/src/components/assessment/index.tsx`

原因：

- 它们还没有超过当前约定阈值太多，且逻辑仍具备较强连续性。
- 后续如果继续加题型、复习策略或评测步骤，再考虑按“策略层 / 数据层 / 展示层”进一步拆分。
