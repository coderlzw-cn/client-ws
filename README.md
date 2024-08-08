# 介绍

`ClientWs` 是一个灵活且功能丰富的 `WebSocket` 客户端类，用于与 `WebSocket` 服务器进行通信。它支持自动重连、消息缓存和事件监听等功能

# 安装

```shell
npm add @coderlzw/client-ws
// or
yarn add @coderlzw/client-ws
// or
pnpm add @coderlzw/client-ws
```

# 使用

```shell
import ClientWs from '@coderlzw/client-ws';

const wsClient = new ClientWs({
  url: 'wss://example.com/socket', // WebSocket 服务器地址
  timeout: 5000, // 可选，连接超时时间（毫秒）
  reconnect: true, //可选，是否自动重连，默认为 true
  reconnectInterval: 5000, //可选， 重连间隔（毫秒），默认为 5000
  reconnectMaxInterval: 10000, // 可选，最大重连间隔（毫秒），默认为 10000
  reconnectMaxTimes: 10, // 可选，最大重连次数，默认为 10
  uniqueKey: 'message_id', // 消息唯一标识符，。默认值为 message_id
  cacheMessage: true, // 是否缓存未发送的消息，默认值为 false
  maxCacheMessage: 100 // 缓存消息的最大数量，默认值为 100
});

// 连接到 WebSocket 服务器
wsClient.connect();

// 监听事件
wsClient.on('open', (event) => {
  console.log('WebSocket 连接已打开', event);
});

wsClient.on('message', (event) => {
  console.log('收到消息:', event.data);
});

wsClient.on('close', (event) => {
  console.log('WebSocket 连接已关闭', event);
});

wsClient.on('error', (event) => {
  console.error('WebSocket 错误:', event);
});

// 发送消息
wsClient.sendMessage({ text: 'Hello, World!' }, (error, response) => {
  if (error) {
    console.error('消息发送失败:', error);
  } else {
    console.log('消息发送成功:', response);
  }
});

// 使用异步发送消息
wsClient.sendMessageAsync({ text: 'Hello, Async!' })
  .then(response => {
    console.log('异步消息发送成功:', response);
  })
  .catch(error => {
    console.error('异步消息发送失败:', error);
  });

// 关闭连接
wsClient.close();

// 销毁客户端
wsClient.destroy();
```

# 方法

- `connect()`: 连接到 WebSocket 服务器。
- `sendMessage<R = any, S = any>(data: S, callback?: MessageCallback<R>)`: 发送消息。如果 `WebSocket` 未连接且
  `cacheMessage`
  选项为 true，则消息会被缓存。`data` 可以是字符串或对象。
- `sendMessageAsync<R = any, S = any>(data: S): Promise<R>`: 发送消息并返回一个 Promise。
- `close()`: 关闭 WebSocket 连接。
- `destroy()`: 销毁 WebSocket 客户端，移除所有监听器并关闭连接。
- `on(event: string, listener: SocketEventListener)`: 添加事件监听器。支持的事件包括 `open`、`close`、`message` 和 `error`。
- `once(event: string, listener: SocketEventListener)`: 添加一个一次性事件监听器。
- `removeListener(event: string)`: 移除指定事件的所有监听器。
- `removeAllListeners()`: 移除所有事件监听器。

# 配置选项（Options）

- `url: string`：WebSocket 服务器地址。必需。
- `timeout?: number`：连接超时时间（毫秒），默认 `5000`。
- `reconnect?: boolean`：是否自动重连，默认 `true`。
- `reconnectInterval?: number`：重连间隔（毫秒），默认 `5000`。
- `reconnectMaxInterval?: number`：最大重连间隔（毫秒），默认 `10000`。
- `reconnectMaxTimes?: number`：最大重连次数，默认为 0 不限制。
- `uniqueKey?: string`：每条消息携带的唯一标识符，默认为 `message_id`。
- `cacheMessage?: boolean`：是否缓存发送失败的消息，默认为 `false`。
- `maxCacheMessage?: number`：缓存消息的最大数量，默认为 `100`。

# 贡献

如果你希望为这个项目做出贡献，请在 GitHub 上提交 [Issues](https://github.com/coderlzw-cn/client-ws/issues)
或 [Pull Requests](https://github.com/coderlzw-cn/client-ws/pulls)。

# 许可证

该项目使用 MIT 许可证 - 详情请参阅 [LICENSE](https://github.com/coderlzw-cn/client-ws/blob/main/LICENSE) 文件。