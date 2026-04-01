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

### Android

```bash
cd ./
python tools/1.启动手机端.py --android
```

### iOS

```bash
cd ./
python tools/1.启动手机端.py --ios
```

### Metro / 构建 / 状态

```bash
# 仅启动 Metro
python tools/1.启动手机端.py --metro

# 查看状态
python tools/1.启动手机端.py --status

# 构建 APK
python tools/1.启动手机端.py --build --release
```

### 其他

手机端暂时不储存数据，而是直接储存到云端，减少心智负担，之后再改成本地储存。并进行数据同步。
