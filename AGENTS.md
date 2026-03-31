## 项目概览

手机端仓库，包含以下内容：

| 目录 | 技术栈 | 说明 |
| --- | --- | --- |
| `src/` | React Native 0.84 + TypeScript | 手机端业务代码 |
| `android/` | Gradle / Kotlin | Android 工程 |
| `ios/` | Xcode / Swift / ObjC | iOS 工程 |
| `tools/` | Python | 启动、构建、修复脚本 |

---

## 约定

- Node 使用 lint 和 typecheck
- React Native 原生改动优先保持现有工程结构
- 所有注释一律使用中文，回复也使用中文
- 如需安装库，直接安装
- 该项目为自用项目，可以重构不用向前兼容
