# koishi-plugin-poke

[![npm](https://img.shields.io/npm/v/koishi-plugin-poke?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-poke)

## 戳一戳插件

仅兼容 OneBot 平台，支持 [Lagrange.OneBot] 和 [NapCat]

**最新版本NapCat支持主动发起戳一戳，请及时更新**

## 功能介绍

### 1. 主动发起戳一戳

NapCat支持主动发起戳一戳，需要[配置 PacketServer](https://napcat.napneko.icu/config/advanced#%E9%85%8D%E7%BD%AE-packetserver)

使用方法：`poke @user`

如果没有指定用户，默认戳自己，支持私聊和群聊

### 2. 响应戳一戳事件

Lagrange.OneBot 和 NapCat 均支持响应戳一戳事件

## 配置说明

### 基础配置

当前支持两种响应模式：

1. **命令模式**：被戳时执行指定命令，可指定触发概率，默认 50%
2. **消息模式**：被戳时发送随机消息，可指定每条消息的权重，默认权重 50

其他选项：
- **过滤选项**：是否只响应戳自己的事件
- **响应间隔**：设置最小触发间隔，防止频繁触发
- **频繁触发警告**：是否在频繁触发时发送警告消息

### 新增：群聊独立配置

您可以为不同的群聊设置独立的响应方式：
- 每个群聊可以有自己的响应模式（命令/消息）
- 群聊配置会覆盖全局配置
- 可以为不同群聊设置不同的回复内容

## 高级用法

### 消息模式扩展功能

- 命令模式适合简单使用，复杂需求请使用消息模式
- 消息模式不仅支持发送文本，还支持[标准元素]和[消息组件]
- 使用`<at id={userId}/>` 可以插入`@用户`，`userId`属性会自动替换为戳你的用户ID
- 使用`<at id={targetId}/>` 可以插入`@被戳用户`，`targetId`属性会自动替换为被戳的用户ID
- 支持替换的属性可以查看[Session]文档
- 在消息模式下可以执行命令：`<execute>status</execute>`
- 想要回戳对方？使用`<execute>poke <at id={userId}/></execute>`或简写`<execute>poke</execute>`

### 特别说明

- 戳一戳事件具有`targetId`属性，表示被戳的用户
- 关闭`filter`选项后，会响应所有戳一戳事件（不仅仅是戳机器人）
- 示例回复：`<at id={userId}/> 戳了一下 <at id={targetId}/>`

## 相关链接

- [Lagrange.OneBot](https://lagrangedev.github.io/Lagrange.Doc/)
- [NapCat](https://napcat.napneko.icu/)
- [标准元素](https://koishi.chat/zh-CN/api/message/elements.html)
- [消息组件](https://koishi.chat/zh-CN/api/message/components.html)
- [Session](https://koishi.chat/zh-CN/api/core/session.html)
