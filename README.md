# 时间感校准实验室 · Time Perception Lab

一个纯前端交互小作品——通过三轮时间感知测试，量化主观时间与物理时间的偏差，生成时间人格报告并匹配历史人物。

## 在线体验

双击 `index.html` 即可运行，无需服务器。

> 如需使用「保存图片」功能，建议通过 `npx serve .` 或 VS Code Live Server 以 localhost 方式访问。

## 玩法

1. 进入后点击「开始校准」
2. 三轮测试，每轮给定一个目标秒数（5–20 秒），凭直觉感受时间流逝，觉得「到了」就点击屏幕
3. 系统根据偏差率 + 波动度，将你匹配到九位历史人物之一
4. 结果页可截屏分享或点击「保存图片」导出

## 匹配矩阵

|  | 精密稳定 | 中等波动 | 混沌波动 |
|---|---|---|---|
| **偏快** | 拿破仑 | 特斯拉 | 毕加索 |
| **居中** | 康德 | 诸葛亮 | 莫扎特 |
| **偏慢** | 达尔文 | 村上春树 | 李白 |

## 目录结构

```
├── index.html          # 单文件 H5（HTML + CSS + JS 入口）
├── app.js              # 核心逻辑（计时、匹配、动效、保存）
├── portraits/          # 人物肖像（jpg）+ 文生图 prompt（txt）
│   ├── README.md       # prompt 统一规格说明
│   ├── napoleon.txt    # 各人物英文 prompt
│   └── ...
├── screenshots/        # 项目截图
├── 时间感校准实验室-设计文档.md
└── 视觉设计参考.png
```

## 技术栈

- 纯 HTML + CSS + Vanilla JS，无框架依赖
- Canvas 2D API：三轮动效背景 + 粒子聚合文字动画
- SVG 钟表头像框（结果页）
- html2canvas 导出结果图
- Web Audio API 提示音
- Google Fonts：Noto Serif SC / Playfair Display / Inter
- 移动优先响应式设计（375px–1440px）

## 设计风格

杂志感 · 大量留白 · 衬线字体 · 黑白人物照片 · 极简几何装饰

- 背景色 #f5f2ed（暖米白）
- 主色调纯黑 #1a1a1a
- 零圆角方形按钮
- 竖屏卡片式结果页，为手机截屏优化

## 人物肖像

`portraits/` 下包含 9 个英文 prompt 文件，用于文生图模型（Midjourney / Stable Diffusion）生成统一风格黑白肖像。规格：

- 1024×1024 px，纯黑白
- 中性灰背景 #9a9a9a
- 上左 30° 软光，LIFE 杂志风
- 正面半身像，目光直视

生成后将 jpg 文件放入 `portraits/` 即可自动加载，无需改代码。

## 本地开发

```bash
# 最简方式
npx serve .
# 然后访问 http://localhost:3000
```

## 版本

- v3.3 — 结果页布局重构：等距美学系统（双列上下沿对齐、水平居中、响应式断点优化）
- v3.2 — 页面极简化 + portrait prompt pack + file:// 头像修复
- v3.1 — 移动优先重构 + SVG 钟表头像 + saveImage 健壮性
- v3.0 — 粒子聚合动效 + 九宫格匹配 + html2canvas 导出
- v2.0 — 三轮动效 + 基础计时逻辑
- v1.0 — 概念原型

## License

MIT