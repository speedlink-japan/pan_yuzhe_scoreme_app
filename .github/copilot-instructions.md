# MyScore - Self-Development Game

自己育成ゲーム型の自己分析・習慣作り・作業サポートツール

## Project Status

- [x] Project structure scaffolded
- [x] Next.js + TypeScript + Tailwind CSS configured
- [x] Core components created:
  - BottomNavBar (選択バー)
  - TodoPanel (タスク管理)
  - CalendarPanel（カレンダー表示)
  - NotebookPanel (ノート・メモ・読書記録)
  - CharacterPanel (キャラクター育成・着せ替え)
- [ ] Dependencies need to be installed (`npm install`)
- [ ] Development server ready to start

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm installed

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will start on `http://localhost:3000`

### Build for Production

```bash
npm run build
npm start
```

## Features

### 1. 選択バー (Bottom Navigation Bar)
- 4つの主要機能を選択可能：
  - TODO (✓)
  - CALENDAR (📅)
  - NOTEBOOK (📝)
  - CHARACTER (🏠)

### 2. TODO Panel
- タスク追加・完了管理
- 完了ごとにポイント加算（後で実装）
- ポイント→報酬交換システム

### 3. Calendar Panel
- 月間カレンダー表示
- 当日ハイライト
- 予定管理機能（後で実装）

### 4. Notebook Panel
- メモ機能（色選択可能）
- 本読書記録（ページ数でポイント計算）
- 文字数→ポイント自動計算機能

### 5. Character Panel (メイン)
- キャラクター作成・かわいいビジュアル
- 着せ替え機能
- ゲーム要素：
  - ☕ 一息：キャラとリラックス
  - ✨ おしゃれ：着せ替え
  - 🎲 趣味：背景インタラクション
- 日替わり着せ替えモーダル
- 報酬交換システム（ポイント→アイテム）

## Components Architecture

```
Page (main layout)
├── BottomNavBar (navigation)
├── TodoPanel
├── CalendarPanel
├── NotebookPanel
└── CharacterPanel
```

## Styling

- Tailwind CSS for utility classes
- CSS Modules for component-scoped styling
- Cute pink/pastel color scheme matching the app concept

## Next Steps

1. Install dependencies: `npm install`
2. Run `npm run dev` to test
3. Implement persistent storage (localStorage or database)
4. Add point calculation system
5. Implement reward redemption
6. Add character customization options
7. Polish animations and transitions
8. Add sound effects and notifications
