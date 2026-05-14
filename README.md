# robot-phone

机器狗手机端 App，基于 React Native 0.84 和 TypeScript。

## 当前职责

- 云端账号与业务入口
- 局域网直控机器人
- 本地视频播放
- 音频输入输出
- 文件、相册、设备能力接入

## 目录结构

```text
robot-phone/
├── android/                 # Android 原生工程
├── ios/                     # iOS 原生工程
├── src/                     # React Native 业务代码
├── docs/                    # 手机端补充文档
├── tools/                   # 启动、打包、版本号脚本
└── README.md
```

## 环境要求

- Node.js `>= 22.11.0`
- React Native CLI
- Android Studio
- ADB

如果要做 iOS：

- Xcode
- CocoaPods
- Ruby / Bundler

## 安装依赖

```bash
npm install
```

iOS 额外步骤：

```bash
bundle install
bundle exec pod install
```

## 推荐启动方式

统一用脚本：

```bash
python tools/1.启动手机端.py
```

默认行为：

- Windows / Linux 默认走 Android
- macOS 默认走 iOS
- 不传参数时默认执行 `restart`

常用命令：

```bash
# Android
python tools/1.启动手机端.py --android

# iOS
python tools/1.启动手机端.py --ios

# 仅启动 Metro
python tools/1.启动手机端.py --metro

# 查看状态
python tools/1.启动手机端.py --status

# 停止
python tools/1.启动手机端.py --stop
```

## APK 构建

```bash
# 默认构建 Release APK
python tools/1.启动手机端.py --build

# 指定 Debug
python tools/1.启动手机端.py --build --debug

# 构建全部 7 个架构包
python tools/1.启动手机端.py --build --all

# 只构建某个架构
python tools/1.启动手机端.py --build --arm-v8a
python tools/1.启动手机端.py --build --x86_64
```

## 版本号更新

```bash
python tools/1.启动手机端.py --update-version 1.2.3
```

## 常用脚本

也可以直接使用 `package.json`：

```bash
npm run start
npm run android
npm run ios
npm run lint
npm run typecheck
npm test
```

## 校验

提交前至少执行：

```bash
npm run lint
npm run typecheck
```

## 说明

当前手机端仍以云端数据为主，同时保留局域网低时延控制链路。更细的页面和原生模块说明见 `docs/`。
