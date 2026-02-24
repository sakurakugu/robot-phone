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
# npm start
npm run android
```

### iOS

```bash
npm start
npm run ios
```

### 其他

手机端暂时不储存数据，而是直接储存到云端，减少心智负担，之后再改成本地储存。并进行数据同步。
