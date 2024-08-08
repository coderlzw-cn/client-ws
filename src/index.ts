interface Options {
    url: string;            // ws 地址
    timeout?: number;       // 连接超时时间，默认 5s
    reconnect?: boolean;    // 是否重连，默认为 true
    reconnectInterval?: number;  // 重连间隔，6s
    reconnectMaxInterval?: number;  // 最大重连间隔，10s
    reconnectMaxTimes?: number;  // 最大重连次数，默认为 0 不限制
    uniqueKey?: string;        // 每条消息携带一个唯一的key,用于标识这条消息，默认值为 message_id
    cacheMessage?: boolean;   // 是否缓存发送失败的消息，待连接成功后在发送，默认为 false
    maxCacheMessage?: number    // 缓存消息的最大数量，默认值为 100
}

type MessageCallback<R = any> = (error: Error | null, data: R) => void;
type SocketEventListener<T = any> = (data: T) => void;

interface sendMessageQueueItem {
    message: string,
    callback?: MessageCallback
}

export default class ClientWs {
    private ws: null | WebSocket = null;
    private options: Required<Options>;
    private readonly eventListeners: Record<string, SocketEventListener[]> = {};  // 事件监听器  {open: [listener1, listener2]}
    private readonly messageCache: { data: any; callback?: MessageCallback }[] = [];  // 在没有连接的时候缓存消息
    private reconnectAttempts: number = 0;     // 重连次数
    private reconnectTimeout: number | null = null;  // 重连定时器
    private readonly sendMessageQueue: Record<string, sendMessageQueueItem> = {};  // 等待发送的消息队列
    private isHandleClose: boolean = false;  // 是否手动关闭的连接

    constructor(options: Options) {
        if (!options.url) {
            throw new Error("URL is required");
        }

        this.options = {
            timeout: 5000,
            reconnect: true,
            reconnectInterval: 5000,  // 重连间隔
            reconnectMaxInterval: 10000,  // 最大重连间隔
            reconnectMaxTimes: 0,    // 最大重连次数
            cacheMessage: false,  // 是否缓存消息
            maxCacheMessage: 100,  // 缓存消息的最大数量
            uniqueKey: "message_id",
            ...options
        } as Required<Options>;
    }

    connect() {
        if (this.ws) {
            console.warn("WebSocket is already connected or connecting.");
            return;
        }

        this.ws = new WebSocket(this.options.url);
        this.bindEvents();

        if (this.options.timeout) {
            setTimeout(() => {
                if (this.isHandleClose) return;
                if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
                    this.ws.close();
                    this.emit("error", new Event("timeout"));
                    if (this.options.reconnect) {
                        this.reconnectAttempts++;
                        this.reconnect();
                    }
                }
            }, this.options.timeout);
        }
    }

    setBinaryType(binaryType: "blob" | "arraybuffer") {
        if (this.ws) {
            this.ws.binaryType = binaryType;
        }
    }

    private reconnect() {
        if (!this.ws) return;
        if (this.options.reconnectMaxTimes && this.reconnectAttempts >= this.options.reconnectMaxTimes) {
            throw new Error("Max reconnect attempts reached");
        }

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        if (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN) {
            return;
        }
        const exponentialBackoff = Math.min(this.options.reconnectInterval * Math.pow(2, this.reconnectAttempts), this.options.reconnectMaxInterval);
        this.reconnectTimeout = setTimeout(() => {
            this.ws = new WebSocket(this.options.url);
            this.bindEvents();
            this.reconnectAttempts++;
        }, exponentialBackoff);
    }

    private bindEvents() {
        this.ws?.addEventListener("open", this.openHandler.bind(this));
        this.ws?.addEventListener("close", this.closeHandler.bind(this));
        this.ws?.addEventListener("message", this.messageHandler.bind(this));
        this.ws?.addEventListener("error", this.errorHandler.bind(this));
    }

    private openHandler(event: Event) {
        if (this.isHandleClose) this.isHandleClose = false;
        this.reconnectAttempts = 0;
        this.emit("open", event);
        this.sendCachedMessages();
    }

    private closeHandler(event: CloseEvent) {
        this.emit("close", event);
        // 如果设置了重连,并且不是手动关闭的连接,则重连
        if (this.options.reconnect && !this.isHandleClose) this.reconnect();
    }

    private errorHandler(event: Event) {
        this.emit("error", event);
    }

    private messageHandler(event: MessageEvent) {
        this.emit("message", event);
        try {
            const data = JSON.parse(event.data);
            // 每条消息都应该携带一个唯一的key,用于标识这条消息
            const uniqueKey = data[this.options.uniqueKey];
            if (uniqueKey) {
                // 从消息队列中取出这条消息对应的回调函数
                const callback = this.sendMessageQueue[uniqueKey].callback;
                if (callback != null) {
                    if (this.ws?.readyState === WebSocket.OPEN) {
                        callback(null, data);
                    } else {
                        callback(new Error("websocket connection is not open"), null);
                    }
                    // 回调函数执行完毕后,从消息队列中删除这条消息
                    delete this.sendMessageQueue[uniqueKey];
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    private emit(event: string, data: any) {
        const listeners = this.eventListeners[event];
        if (listeners && listeners.length > 0) {
            listeners.forEach((listener) => listener(data));
        }
    }

    on(event: "open", listener: SocketEventListener<Event>): void;
    on(event: "close", listener: SocketEventListener<CloseEvent>): void;
    on(event: "message", listener: SocketEventListener<MessageEvent>): void;
    on(event: "error", listener: SocketEventListener<Event>): void;
    on(event: string, listener: SocketEventListener): void;
    on(event: string, listener: SocketEventListener) {
        if (["open", "close", "message", "error"].indexOf(event) === -1) {
            throw new Error(`Event "${event}" is not supported`);
        }
        // 如果没有这个事件的监听器数组,则创建一个空数组
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        // 如果这个监听器不在这个事件的监听器数组中,则添加进去
        if (!this.eventListeners[event].includes(listener)) {
            this.eventListeners[event].push(listener);
        }
    }

    once(event: "open", listener: SocketEventListener<Event>): void;
    once(event: "close", listener: SocketEventListener<CloseEvent>): void;
    once(event: "message", listener: SocketEventListener): void;
    once(event: "error", listener: SocketEventListener<Event>): void;
    once(event: string, listener: SocketEventListener): void;
    once(event: string, listener: SocketEventListener) {
        if (["open", "close", "message", "error"].indexOf(event) === -1) {
            throw new Error(`Event "${event}" is not supported`);
        }

        const onceListener: SocketEventListener = (data) => {
            listener(data);
            this.off(event, onceListener);
        };

        this.on(event, onceListener);
    }

    private off(event: string, listener: SocketEventListener) {
        const listeners = this.eventListeners[event];
        if (listeners) {
            this.eventListeners[event] = listeners.filter((l) => l !== listener);
        }
    }

    private sendCachedMessages() {
        let index = 0;
        const sendNextMessage = () => {
            if (index < this.messageCache.length) {
                const message = this.messageCache[index];
                if (message) {
                    this.sendMessage(message.data, message.callback);
                    index++;
                    setTimeout(sendNextMessage, 100);
                }
            }
        };
        sendNextMessage();
    }

    sendMessage<R = any, S = any>(data: S, callback?: MessageCallback<R>) {
        if (this.options.cacheMessage && !this.ws) {
            if (this.messageCache.length < this.options.maxCacheMessage) {
                this.messageCache.push({data, callback});
            } else {
                this.messageCache.shift();
                this.messageCache.push({data, callback});
                // console.warn(`消息缓存已满,保留最新的${this.options.maxCacheMessage}条消息`);
            }
            // console.warn('websocket 未连接,消息已缓存,等待连接后发送,目前缓存消息数：' + this.messageCache.length + '条');
        }

        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            callback?.(new Error("websocket 未连接"), null as R);
            return;
        }

        // data 只能是字符串或者json 对象
        if (typeof data !== "string" && typeof data !== "object") {
            throw new Error("data must be a string or an object");
        }
        // data 如果是纯文本,则直接发送
        if (typeof data === "string") {
            this.ws.send(data);
            return;
        }
        // data 如果是对象,则需要添加一个唯一的key,用于标识这条消息
        const key = this.generateUniqueKey();
        const objMsg = Object.assign({}, {[this.options.uniqueKey]: key}, data);
        const message = JSON.stringify(objMsg);
        this.sendMessageQueue[key] = {message, callback};
        this.ws.send(message);
    }

    sendMessageAsync<R = any, S = any>(data: S): Promise<R> {
        if (typeof data !== "object") {
            throw new Error("data must be an object");
        }
        return new Promise((resolve, reject) => this.sendMessage(data, (error, data) => error ? reject(error) : resolve(data as R)));
    }

    close() {
        this.isHandleClose = true;
        this.ws?.close();
        this.ws = null;
    }

    removeListener(event: string) {
        delete this.eventListeners[event];
    }

    removeAllListeners() {
        Object.keys(this.eventListeners).forEach((key) => {
            delete this.eventListeners[key];
        });
    }

    destroy() {
        this.removeAllListeners();
        this.close();
        this.ws = null;
    }

    private generateUniqueKey(): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).slice(2);
        return timestamp + random;
    }
}