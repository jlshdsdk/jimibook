# 吉米多维奇高等数学刷题版

《吉米多维奇高等数学习题精选精解》（张天德、蒋晓云主编）在线刷题站 —— 纯静态 MPA 架构，KaTeX 本地渲染，无任何框架依赖。

## 目录结构

```
site/
├── index.html            # 首页：全书 12 章总目录 + 学习进度
├── assets/
│   ├── style.css         # 全局样式（护眼浅色 / 深色双主题）
│   ├── script.js         # 交互：主题切换 / 解析折叠 / 进度标记 / 上下题导航 / 懒展开
│   └── katex/            # KaTeX 0.16 本地化（css + js + fonts），无 CDN 依赖
└── chapters/
    ├── chapter-01.html   # 第一章 极限与连续
    ├── ...               # 与原书目录 1:1 对应，每章一个独立页面
    └── chapter-12.html   # 第十二章 常微分方程
```

## 功能

- 按原书章节目录组织，题号与原书一致
- 每题固定结构：题干 → 分隔线 → 解析（可折叠）→ 最终答案（绿色高亮）
- 夜间模式一键切换，偏好本地保存
- 「标记已做」进度记录（localStorage），首页显示每章进度条
- 左侧目录 + 题号索引，点击定位；右下角 ↑↓ 按钮上下题切换
- 超过 50 题的章节自动懒展开：视口外解析默认折叠，滚入视口自动展开
- 手机 / 平板 / 电脑全响应式

## 本地预览

```bash
cd site
python -m http.server 8000
# 浏览器打开 http://localhost:8000
```

## GitHub Pages 部署步骤（零基础版）

### 1. 创建仓库
登录 GitHub → 右上角 **+** → **New repository** →
名称填 `jimibook`（示例），选 **Public**，**不要**勾选任何初始化选项 → **Create repository**。

### 2. 上传文件
在 `site/` 目录下执行：

```bash
git init
git add .
git commit -m "init: 吉米多维奇刷题站"
git branch -M main
git remote add origin https://github.com/<你的用户名>/jimibook.git
git push -u origin main
```

（也可用 GitHub Desktop 直接拖拽 `site/` 文件夹上传。）

### 3. 开启 Pages
仓库页面 → **Settings** → 左侧 **Pages** →
**Source** 选 `Deploy from a branch` → **Branch** 选 `main` / `(root)` → **Save**。

### 4. 访问
等待 1~2 分钟，访问 `https://<你的用户名>.github.io/jimibook/` 即可。
手机、平板直接用同一网址访问，进度各设备独立保存在各自浏览器中。

## 版权说明

题目与解析内容版权归原书出版社与作者所有，本站仅供个人学习使用，请勿商用或二次分发。
