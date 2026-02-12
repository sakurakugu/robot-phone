# robot-phone - 手机端应用

基于 React Native 开发的移动端应用，用于远程控制机器狗。

## 技术栈

- **框架**: React Native
- **语言**: TypeScript
- **构建工具**: Metro
- **热更新**: Expo Updates

## 目录结构

```
RobotPhone/
├── __tests__/                 # 测试文件
│   └── App.test.tsx
├── android/                   # Android 原生代码
│   └── app/
│       ├── src/main/
│       │   ├── java/          # Kotlin 代码
│       │   └── res/           # 资源文件
│       ├── build.gradle
│       └── proguard-rules.pro
├── .bundle/                   # Ruby Bundler 配置
├── .eslintrc.js               # ESLint 配置
├── .prettierrc.js             # Prettier 配置
├── .watchmanconfig            # Watchman 配置
├── App.tsx                    # 应用入口
├── Gemfile                    # Ruby 依赖
├── app.json                   # Expo 配置
├── index.js                   # 入口文件
├── metro.config.js            # Metro 配置
├── package.json               # NPM 依赖
└── tsconfig.json              # TypeScript 配置
```

## 功能特性

- **远程控制**: 通过手机控制机器狗移动
- **语音对话**: 与机器狗进行语音交互
- **视频流**: 实时查看机器狗摄像头画面
- **动作执行**: 快捷动作按钮
- **热更新**: 支持 OTA 更新

## 开发环境

### 前置要求

请确保已完成官方的 [环境搭建指南](https://reactnative.dev/docs/set-up-your-environment)。

### 安装依赖

```bash
npm install
```

### iOS 额外步骤

```bash
# 安装 CocoaPods
bundle install

# 安装原生依赖
bundle exec pod install
```

## 运行应用

### 启动 Metro

```bash
npm start
```

### Android

```bash
npm run android
```

### iOS

```bash
npm run ios
```

## 热更新配置

应用集成了 Expo Updates 热更新功能，支持在不重新发布应用的情况下推送 JavaScript 代码和资源更新。

### 配置说明

`app.json` 中的热更新配置：

```json
{
  "expo": {
    "updates": {
      "enabled": true,
      "checkAutomatically": "ON_LOAD",
      "fallbackToCacheTimeout": 0
    },
    "runtimeVersion": {
      "policy": "sdkVersion"
    }
  }
}
```

| 配置项 | 说明 |
|--------|------|
| `enabled` | 启用热更新功能 |
| `checkAutomatically` | 应用启动时自动检查更新 |
| `fallbackToCacheTimeout` | 无法获取更新时立即使用缓存 |
| `runtimeVersion.policy` | 使用 SDK 版本作为运行时版本 |

### 更新流程

1. 应用启动时检查远程是否有新版本
2. 如果有，则在后台下载更新
3. 下次启动时自动应用新版本

## 应用架构

```
┌─────────────────────────────────────────┐
│              App.tsx                     │
│            (应用入口)                     │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│              页面组件                     │
├─────────────┬─────────────┬─────────────┤
│   控制页面   │   对话页面   │   设置页面   │
└──────┬──────┴──────┬──────┴──────┬──────┘
       │             │             │
       ▼             ▼             ▼
┌─────────────────────────────────────────┐
│              服务层                      │
├─────────────┬─────────────┬─────────────┤
│  WebSocket  │   音频服务   │   视频服务   │
└──────┬──────┴──────┬──────┴──────┬──────┘
       │             │             │
       ▼             ▼             ▼
┌─────────────────────────────────────────┐
│           robot-cloud 后端               │
│         (WebSocket / HTTP)              │
└─────────────────────────────────────────┘
```

## 与云端通信

手机应用通过 WebSocket 与 robot-cloud 后端通信：

| 功能 | 通信方式 |
|------|----------|
| 机器人状态 | WebSocket |
| 控制指令 | WebSocket |
| 语音对话 | WebSocket |
| 视频流 | RTSP / WebRTC |

## 开发调试

### Fast Refresh

修改代码后应用会自动刷新。

### 完整重载

- **Android**: 双击 R 键
- **iOS**: 按 Cmd + R

### 开发者菜单

- **Android**: Cmd + M (Mac) / Ctrl + M (Windows)
- **iOS**: Cmd + D

## 构建

### Android APK

```bash
cd android
./gradlew assembleRelease
```

### iOS IPA

通过 Xcode 进行 Archive 和导出。

## 注意事项

1. 确保手机和服务器在同一网络
2. 配置正确的服务器地址
3. 检查防火墙设置，确保端口开放
