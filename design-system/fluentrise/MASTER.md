# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** FluentRise
**Updated:** 2026-03-12
**Category:** Language Learning App (Duolingo-inspired)

---

## Global Rules

### Color Palette

| Role | Hex | Dark Mode | CSS Variable |
|------|-----|-----------|--------------|
| Primary | `#58CC02` | `#6ADB1F` | `--primary` |
| Primary Hover | `#4CB000` | `#7FE835` | `--primary-hover` |
| Secondary | `#1CB0F6` | `#4CC4FF` | `--secondary` |
| Accent | `#FF9600` | `#FFB84D` | `--accent` |
| Success | `#58CC02` | `#6ADB1F` | `--success` |
| Warning | `#FFC800` | `#FFD940` | `--warning` |
| Error | `#FF4B4B` | `#FF6B6B` | `--error` |
| BG Primary | `#FFFFFF` | `#0F0F0F` | `--bg-primary` |
| BG Secondary | `#F7F7F7` | `#1A1A1A` | `--bg-secondary` |
| BG Elevated | `#FFFFFF` | `#2D2D2D` | `--bg-elevated` |
| Text Primary | `#262626` | `#FFFFFF` | `--text-primary` |
| Text Secondary | `#6B7280` | `#9CA3AF` | `--text-secondary` |
| Border | `#E5E7EB` | `#2D2D2D` | `--border` |

### Typography

- **Primary Font:** Plus Jakarta Sans (Google Fonts)
- **Weights:** 300, 400, 500, 600, 700, 800
- **Mood:** Modern, friendly, professional, gamified
- **Import:** `https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap`

### Spacing System (8px base)

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | `4px` / `0.25rem` | Tight gaps |
| `--space-2` | `8px` / `0.5rem` | Icon gaps |
| `--space-3` | `12px` / `0.75rem` | Small padding |
| `--space-4` | `16px` / `1rem` | Standard padding |
| `--space-5` | `20px` / `1.25rem` | Medium gaps |
| `--space-6` | `24px` / `1.5rem` | Section padding |
| `--space-8` | `32px` / `2rem` | Large gaps |
| `--space-10` | `40px` / `2.5rem` | Section margins |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `8px` | Small elements |
| `--radius-md` | `12px` | Buttons, inputs |
| `--radius-lg` | `16px` | Cards |
| `--radius-xl` | `20px` | Large cards |
| `--radius-2xl` | `24px` | Modals |
| `--radius-full` | `9999px` | Pills, avatars |

### Shadows

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-card` | `0 4px 12px rgba(0,0,0,0.08)` | Cards |
| `--shadow-card-hover` | `0 8px 24px rgba(0,0,0,0.12)` | Cards hover |
| `--shadow-button` | `0 4px 0 rgba(0,0,0,0.15)` | 3D buttons |
| `--shadow-button-active` | `0 2px 0 rgba(0,0,0,0.15)` | Active buttons |

---

## Component Specs

### Button (3D Duolingo Style)

```tsx
// Primary Button
<Button variant="primary" size="md">
  点击我
</Button>

// CSS Output:
// background: var(--primary)
// color: white
// border-radius: 12px
// box-shadow: 0 4px 0 rgba(0,0,0,0.15)
// hover: translateY(1px), shadow reduces
// active: translateY(2px), shadow reduces more
```

**Variants:** `primary` | `secondary` | `accent` | `outline` | `ghost` | `success`
**Sizes:** `sm` (h-9) | `md` (h-12) | `lg` (h-14)

### Card

```tsx
<Card variant="default" padding="md">
  Content
</Card>

// Variants:
// default: shadow + border
// flat: border only
// elevated: larger shadow
// interactive: hover lift effect
```

### Input

```tsx
<Input
  label="手机号"
  placeholder="请输入手机号"
  leftIcon={<Smartphone />}
  errorText={errors.phone}
/>
```

### Progress Ring (Gamification)

```tsx
<DailyGoalRing
  current={75}
  target={100}
  unit="%"
  size={160}
/>
```

### Streak Indicator

```tsx
<StreakIndicator days={7} size="md" />
// Shows flame icon with day count
// Frozen state: blue color
```

---

## Animation

| Effect | Duration | Easing |
|--------|----------|--------|
| Hover transitions | 200ms | ease-out |
| Button press | 150ms | ease-out |
| Card lift | 200ms | ease-out |
| Progress ring | 800ms | ease-out |
| Page transitions | 300ms | cubic-bezier(0.16, 1, 0.3, 1) |
| Toast slide | 300ms | ease-out |
| Modal scale | 200ms | ease-out |

---

## Gamification Elements

| Element | Icon | Color | Description |
|---------|------|-------|-------------|
| Streak | Flame | Accent (orange) | 连续学习天数 |
| XP | Zap | Warning (yellow) | 经验值 |
| Level | Target | Primary (green) | 等级徽章 |
| Gems | Circle | Secondary (blue) | 宝石/积分 |
| Hearts | Heart | Error (red) | 生命值/体力 |

---

## Responsive Breakpoints

| Breakpoint | Width | Description |
|------------|-------|-------------|
| `sm` | 640px | 大屏手机 |
| `md` | 768px | 平板 |
| `lg` | 1024px | 小桌面 |
| `xl` | 1280px | 桌面 |
| `2xl` | 1536px | 大桌面 |

### Mobile-First Approach

```tsx
// 默认移动端，逐步增强
className="text-sm md:text-base lg:text-lg"
```

---

## UX Guidelines

### Loading States

1. **骨架屏** - 用于内容区域首次加载
2. **Spinner** - 用于按钮操作和数据提交
3. **渐进加载** - 文字先显示，图片后加载

### Empty States

- 使用 `<Empty />` 组件
- 提供明确的行动号召按钮
- 使用友好的插图或图标

### Error Handling

- 使用 Toast 通知用户
- 提供重试机制
- 错误边界防止白屏

### Accessibility

- 所有交互元素最小 44x44px
- 支持键盘导航
- 支持 prefers-reduced-motion
- 适当的颜色对比度 (4.5:1)

---

## Anti-Patterns (Do NOT Use)

- ❌ **Emojis as icons** — Use Lucide React icons
- ❌ **Any type** — Use strict TypeScript types
- ❌ **Missing cursor-pointer** — All interactive elements need it
- ❌ **Instant state changes** — Always use transitions
- ❌ **Low contrast text** — Maintain 4.5:1 ratio
- ❌ **Layout-shifting hovers** — Use transform, not margin/padding changes
- ❌ **Hardcoded data** — Use dynamic data from API
- ❌ **No loading states** — Always show feedback

---

## Pre-Delivery Checklist

- [ ] No `any` types used
- [ ] All components have proper TypeScript interfaces
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with transitions (150-300ms)
- [ ] Light/Dark mode tested
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] Keyboard navigation works
- [ ] `prefers-reduced-motion` respected
- [ ] No horizontal scroll on mobile
- [ ] Loading states implemented
- [ ] Empty states handled
- [ ] Error boundaries in place

---

## File Organization

```
src/
├── components/
│   ├── ui/              # Base UI components
│   │   ├── Button, Card, Input, Badge
│   │   ├── Progress, Avatar, Tabs, Empty
│   │   ├── Skeleton, MobileNav, Tooltip
│   │   └── LoadingScreen
│   ├── gamification/    # Game elements
│   ├── layout/          # Layout components
│   └── providers/       # Global Providers
├── hooks/
│   ├── useAuth.ts
│   └── useData.ts
├── lib/
│   ├── utils.ts
│   ├── toast.tsx
│   └── greeting.ts      # Dynamic greetings
├── stores/              # Zustand stores
│   ├── userStore.ts
│   └── uiStore.ts
└── routes/              # Pages
```

---

## Performance Guidelines

1. **Lazy Loading** - 路由级代码分割
2. **Image Optimization** - 使用适当尺寸的图片
3. ** Debounce/Throttle** - 搜索和滚动事件
4. **Memoization** - 使用 useMemo/useCallback 优化重渲染
5. **Virtualization** - 长列表使用虚拟滚动
