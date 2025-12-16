# AI Reader 浏览器扩展

一键保存网页到 AI Reader 阅读列表。

## 功能

- 点击扩展图标快速保存当前页面
- 右键菜单保存页面或链接
- 选中文字保存为高亮
- 自定义服务器地址

## 安装方法

### Chrome / Edge / Brave

1. 打开浏览器扩展管理页面
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`

2. 开启"开发者模式"

3. 点击"加载已解压的扩展程序"

4. 选择 `browser-extension` 文件夹

### Firefox

1. 打开 `about:debugging`
2. 点击"此 Firefox"
3. 点击"临时加载附加组件"
4. 选择 `manifest.json` 文件

## 使用方法

1. 点击扩展图标
2. 设置 AI Reader 服务器地址（默认 `http://localhost:3001`）
3. 点击"保存到阅读列表"

## 快捷键

- 保存当前页面：需在扩展设置中自行配置

## 注意事项

- 确保 AI Reader 服务器正在运行
- 如遇跨域问题，请确保服务器配置了正确的 CORS 设置
