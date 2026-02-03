目前只是初始化了仓库。

# 快速开始

> **注意**：在继续之前，请确保你已完成官方的 [环境搭建指南（Set Up Your Environment）](https://reactnative.dev/docs/set-up-your-environment)。

## 第一步：启动 Metro

首先，你需要运行 **Metro** —— React Native 的 JavaScript 构建工具。

在项目根目录下运行以下命令以启动 Metro 开发服务器：

```sh
# 使用 npm
npm start

# 或使用 Yarn
yarn start
```

## 第二步：构建并运行你的应用

在 Metro 启动后，打开一个新的终端窗口（或标签页），进入项目根目录，并根据你的目标平台运行以下命令之一：

### Android

```sh
# 使用 npm
npm run android

# 或使用 Yarn
yarn android
```

### iOS

对于 iOS 平台，请记得先安装 CocoaPods 依赖项（仅需在首次克隆项目或更新原生依赖后执行）。

首次创建新项目时，请先运行 Ruby Bundler 安装 CocoaPods 本身：

```sh
bundle install
```

然后，在每次更新原生依赖后，运行：

```sh
bundle exec pod install
```

更多详情请参阅 [CocoaPods 入门指南](https://guides.cocoapods.org/using/getting-started.html)。

接着，运行以下命令启动 iOS 应用：

```sh
# 使用 npm
npm run ios

# 或使用 Yarn
yarn ios
```

如果一切配置正确，你将看到你的新应用在 Android 模拟器、iOS 模拟器或已连接的真实设备上成功运行。

除了使用命令行方式，你也可以直接通过 Android Studio 或 Xcode 构建并运行应用。

## 第三步：修改你的应用

现在你已经成功运行了应用，接下来可以尝试修改它！

用你喜欢的代码编辑器打开 `App.tsx` 文件并进行任意修改。保存文件后，应用会自动刷新并立即反映你的更改 —— 这是由 [Fast Refresh](https://reactnative.dev/docs/fast-refresh) 功能实现的。

如果你需要强制重新加载（例如重置应用状态），可以执行完整重载：

- **Android**：快速按两次  键，或通过快捷键打开开发者菜单（Windows/Linux 上为  + ，macOS 上为  + ），然后选择 **“Reload”**。
- **iOS**：在 iOS 模拟器中按下  键。

## 热更新功能

本应用集成了 Expo Updates 热更新功能，支持在不重新发布应用的情况下推送 JavaScript 代码和资源更新。

### 热更新配置

应用在启动时会自动检查是否有可用更新。如果发现新版本，会自动下载并在下次启动时应用。

### 在开发环境中使用热更新

1. **启动开发服务器**：
   ```bash
   npm start
   ```

2. **在设备上运行应用**：
   ```bash
   npm run android  # Android
   npm run ios      # iOS
   ```

3. **向设备推送更新**：
   在开发过程中，当你修改代码并保存时，应用会通过 Fast Refresh 自动更新。

   若要模拟完整的热更新流程（例如测试生产环境行为），可运行：
   ```bash
   npx expo publish
   ```

### 生产环境热更新

在生产环境中，应用会按以下顺序处理更新：
1. 启动时检查远程是否有新版本；
2. 如果有，则在后台下载更新；
3. 下次启动时自动应用新版本。

### 热更新配置说明

热更新的行为由 `app.json` 文件中的以下配置控制：

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

- `enabled`: 启用热更新功能。
- `checkAutomatically: "ON_LOAD"`: 应用每次启动时自动检查更新。
- `fallbackToCacheTimeout: 0`: 若无法获取更新，则立即使用缓存版本（无等待超时）。
- `runtimeVersion.policy: "sdkVersion"`: 使用 Expo SDK 版本作为运行时版本标识，确保更新兼容性。
