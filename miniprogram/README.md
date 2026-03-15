# AI证件照制作（微信小程序前端）

这是一个可商用扩展的微信小程序前端项目，采用“固定场景模板 + 自定义尺寸”的产品策略，覆盖求职、护照、签证、驾驶证、考试报名等证件照需求。

## 技术栈

- 微信小程序原生开发
- JavaScript + WXML + WXSS

## 目录结构

```text
miniprogram/
  app.js
  app.json
  app.wxss
  sitemap.json
  project.config.json
  pages/
    home/
    upload/
    editor/
    result/
    custom-size/
    history/
    history-detail/
    profile/
  components/
    scene-card/
    color-picker/
    size-info-card/
    primary-button/
    upload-box/
    record-card/
  utils/
    constants.js
    storage.js
    format.js
    request.js
    api.js
  README.md
```

## 运行方式

1. 打开微信开发者工具。
2. 选择“导入项目”。
3. 项目目录选择：`/workspace/id-editor-ui/miniprogram`。
4. AppID 可使用 `touristappid` 进行本地开发。
5. 编译后即可运行。

## 数据说明

- 固定场景模板、颜色选项、mock 结果与 mock 历史数据均在 `utils/constants.js`。
- 页面间数据通过本地缓存（`utils/storage.js`）传递。
- 网络请求封装在 `utils/request.js` 与 `utils/api.js`，后续可直接接入后端与支付。
