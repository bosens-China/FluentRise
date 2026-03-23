# 2026-03-22 前后端对接补全记录

## 本轮补齐内容

- 用户资料
  - 前端新增 `ProfileDrawer`
  - 已对接 `GET /user/profile`
  - 已对接 `PUT /user/profile`
- 重新评测
  - 评测弹窗支持 `create` 和 `update` 两种模式
  - 已对接 `PUT /user/assessment`
- 复习日志
  - 前端新增 `ReviewLogDrawer`
  - 已对接 `GET /reviews/{schedule_id}/logs`
- 游乐园历史与统计
  - 前端新增 `PlaygroundInsightsDrawer`
  - 已对接 `GET /playground/history`
  - 已对接 `GET /playground/stats`
- 手动打卡
  - 学习日历增加“今日打卡”按钮
  - 已对接 `POST /study-logs/check-in`
- 单词专用发音
  - 生词页增加单词发音按钮
  - 已对接 `GET /tts/word/{word}`

## 2026-03-23 语音解析新增

- 新增 `POST /speech/analyze`
- 前端在课文页增加“朗读解析”入口
- 录音弹窗内明确展示 60 秒建议上限与倒计时
- 到达 60 秒后前端会自动停止
- 后端采用更宽松的时长策略
  - 建议时长：60 秒
  - 硬上限：65 秒
- 当前第一版返回：
  - 识别文本
  - 录音时长
  - 与当前课文的宽松匹配度
  - 识别稳定度
  - 可能漏读词 / 可能多读或替换词
  - 中文分析说明
- 当前产品定位：
  - 属于“朗读回看 / 跟读反馈”
  - 不承诺严格的音标级发音纠错

## 主要落点

- `apps/web/src/components/layout/ProfileDrawer.tsx`
- `apps/web/src/components/review/ReviewLogDrawer.tsx`
- `apps/web/src/components/playground/PlaygroundInsightsDrawer.tsx`
- `apps/web/src/components/studyLog/StudyCalendar.tsx`
- `apps/web/src/routes/vocabulary.tsx`
- `apps/web/src/components/assessment/index.tsx`
- `apps/web/src/routes/review.tsx`
- `apps/web/src/routes/playground.tsx`

## 备注

- 这轮没有新增后端接口，主要是把已有接口补到前端真实入口。
- 当前核心学习闭环、资料维护、复习历史、游乐园统计、手动打卡和单词发音都已经有前端承载点。
