import { Context, h, Schema, Session } from "koishi";
import {} from "koishi-plugin-adapter-onebot";

import zhCN from "./locale/zh-CN.yml";
import { MessageReply, CommandReply } from "./types";
import { parsePlatform } from "./utils";

// 插件名称和用法说明
export const name = "poke";
export const usage = zhCN._usage;

// 默认的回复消息配置
const defaultMessage: MessageReply = {
  content: "<at id={userId}/> 戳你一下",
  weight: 50,
};

// 群组配置类型
export interface GroupConfig {
  guildId: string;
  mode: "command" | "message";
  command?: CommandReply;
  messages?: MessageReply[];
}

export interface Config {
  filter: boolean;
  mode: "command" | "message";
  interval?: number;
  warning?: boolean;
  prompt?: string;
  command?: CommandReply;
  messages?: MessageReply[];
  // 新增: 群组特定配置
  groupConfigs?: GroupConfig[];
}

// 插件配置模式定义
export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    filter: Schema.boolean().default(true).description("只响应戳自己的事件"),
    mode: Schema.union([
      Schema.const("command").description("执行命令"),
      Schema.const("message").description("回复消息"),
    ])
      .default("command")
      .description("响应模式"),
  }),
  Schema.object({
    interval: Schema.number()
      .default(1000)
      .step(100)
      .description("最小触发间隔（毫秒)"),
    warning: Schema.boolean()
      .default(false)
      .description("频繁触发是否发送警告"),
    prompt: Schema.string().default("别戳了，歇一歇吧").description("警告内容"),
  }).description("响应间隔配置"),
  Schema.union([
    Schema.object({
      mode: Schema.const("command"),
      command: Schema.object({
        content: Schema.string().default("status").description("命令内容"),
        probability: Schema.number()
          .min(0)
          .max(100)
          .role("slider")
          .default(50)
          .description("触发概率"),
      }),
    }).description("命令模式配置"),
    Schema.object({
      mode: Schema.const("message").required(),
      messages: Schema.array(
        Schema.object({
          content: Schema.string().required().description("消息内容"),
          weight: Schema.number()
            .min(0)
            .max(100)
            .default(50)
            .description("权重"),
        })
      )
        .role("table")
        .default([defaultMessage])
        .description("消息内容"),
    }).description("消息模式配置"),
  ]),
  // 新增: 群组特定配置
  Schema.object({
    groupConfigs: Schema.array(
      Schema.object({
        guildId: Schema.string().required().description("群聊ID"),
        mode: Schema.union([
          Schema.const("command").description("执行命令"),
          Schema.const("message").description("回复消息"),
        ])
          .default("command")
          .description("该群聊的响应模式"),
        command: Schema.object({
          content: Schema.string().default("status").description("命令内容"),
          probability: Schema.number()
            .min(0)
            .max(100)
            .role("slider")
            .default(50)
            .description("触发概率"),
        }).description("该群聊的命令配置"),
        messages: Schema.array(
          Schema.object({
            content: Schema.string().required().description("消息内容"),
            weight: Schema.number()
              .min(0)
              .max(100)
              .default(50)
              .description("权重"),
          })
        )
          .role("table")
          .default([defaultMessage])
          .description("该群聊的消息内容"),
      })
    )
      .role("table")
      .default([])
      .description("群聊特定配置"),
  }).description("群聊独立配置"),
]);

export function apply(ctx: Context, config: Config) {
  // 存储用户上次触发戳一戳的时间戳
  const cache = new Map<string, number>();

  ctx.i18n.define("zh-CN", zhCN);

  // 注册戳一戳命令，允许主动戳其他用户
  ctx
    .platform("onebot")
    .command("poke [target:user]")
    .action(async ({ session }, target) => {
      // 不是 onebot 平台，则返回
      if (!session.onebot) {
        return;
      }

      const params = { user_id: session.userId };
      if (target) {
        const [platform, id] = parsePlatform(target);
        if (platform != "onebot") {
          return;
        }
        params.user_id = id;
      }

      // 根据私聊或群聊环境发送不同的戳一戳请求
      if (session.isDirect) {
        await session.onebot._request("friend_poke", params);
      } else {
        params["group_id"] = session.guildId;
        await session.onebot._request("group_poke", params);
      }
    });

  // 监听并处理收到的戳一戳事件
  ctx.platform("onebot").on("notice", async (session: Session) => {
    // 不是戳一戳事件，则返回
    if (session.subtype != "poke") {
      return;
    }

    // 被戳的不是自己，则返回
    if (config.filter && session.targetId != session.selfId) {
      return;
    }

    // 检查冷却时间，防止频繁触发
    if (config.interval > 0 && cache.has(session.userId)) {
      const ts = cache.get(session.userId)!;
      if (session.timestamp - ts < config.interval) {
        if (config.warning) session.sendQueued(config.prompt);
        return;
      }
    }

    // 更新缓存
    cache.set(session.userId, session.timestamp);

    // 获取当前群聊的特定配置（如果存在）
    const guildConfig = session.guildId && config.groupConfigs?.find(
      (gc) => gc.guildId === session.guildId
    );

    // 如果是群聊并且有特定配置，则使用群聊配置
    if (guildConfig) {
      switch (guildConfig.mode) {
        case "command":
          if (Math.random() * 100 < guildConfig.command.probability) {
            await session.execute(guildConfig.command.content);
          }
          break;
        case "message":
          if (guildConfig.messages && guildConfig.messages.length > 0) {
            const msg = randomMessage(guildConfig.messages);
            const content = h.parse(msg, session);
            await session.sendQueued(content);
          }
          break;
        default:
          break;
      }
    } else {
      // 没有特定配置，则使用全局配置
      switch (config.mode) {
        case "command":
          if (Math.random() * 100 < config.command.probability) {
            await session.execute(config.command.content);
          }
          break;
        case "message":
          if (config.messages.length > 0) {
            const msg = randomMessage(config.messages);
            const content = h.parse(msg, session);
            await session.sendQueued(content);
          }
          break;
        default:
          break;
      }
    }
  });
}

// 根据权重随机选择一条回复消息
function randomMessage(messages: MessageReply[]) {
  const totalWeight = messages.reduce((sum, cur) => sum + cur.weight, 0);
  const random = Math.random() * totalWeight;
  let sum = 0;
  for (const message of messages) {
    sum += message.weight;
    if (random < sum) return message.content;
  }
}
