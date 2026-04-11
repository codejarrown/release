import { encrypt, decrypt } from '../../lib/crypto.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
import { TelegramSender } from './telegram.js';
import { DingTalkSender } from './dingtalk.js';
import { WebhookSender } from './webhook.js';
// ---- Service ----
export class PushService {
    repo;
    encryptionKey;
    senders = new Map();
    constructor(repo, encryptionKey) {
        this.repo = repo;
        this.encryptionKey = encryptionKey;
        this.registerSender(new TelegramSender());
        this.registerSender(new DingTalkSender());
        this.registerSender(new WebhookSender());
    }
    registerSender(sender) {
        this.senders.set(sender.platform, sender);
    }
    async list() {
        const rows = await this.repo.findAll();
        return rows.map(toDto);
    }
    async getById(id) {
        const row = await this.repo.findById(id);
        if (!row)
            throw new NotFoundError('PushChannel', id);
        return toDto(row);
    }
    async create(input) {
        if (!this.senders.has(input.platform)) {
            throw new ValidationError(`Unsupported platform: ${input.platform}`);
        }
        validatePlatformConfig(input.platform, input.config);
        const configEncrypted = encrypt(JSON.stringify(input.config), this.encryptionKey);
        const row = await this.repo.create({
            name: input.name,
            platform: input.platform,
            config_encrypted: configEncrypted,
        });
        return toDto(row);
    }
    async update(id, input) {
        const existing = await this.repo.findById(id);
        if (!existing)
            throw new NotFoundError('PushChannel', id);
        const data = {};
        if (input.name !== undefined)
            data.name = input.name;
        if (input.isEnabled !== undefined)
            data.is_enabled = input.isEnabled ? 1 : 0;
        if (input.config !== undefined) {
            validatePlatformConfig(existing.platform, input.config);
            data.config_encrypted = encrypt(JSON.stringify(input.config), this.encryptionKey);
        }
        if (Object.keys(data).length === 0)
            return toDto(existing);
        const row = await this.repo.update(id, data);
        return toDto(row);
    }
    async delete(id) {
        const existing = await this.repo.findById(id);
        if (!existing)
            throw new NotFoundError('PushChannel', id);
        await this.repo.deleteById(id);
    }
    /** Send a test message through a specific channel. */
    async test(id) {
        const row = await this.repo.findById(id);
        if (!row)
            throw new NotFoundError('PushChannel', id);
        await this.sendToChannel(row, {
            title: 'MT5 通知测试 / MT5 Notification Test',
            body: '### MT5 通知测试\n\n这是一条来自 MT5 Server 的测试通知消息（Test notification message from MT5 Server）。',
            level: 'info',
        });
    }
    /** Broadcast a message to all enabled channels. */
    async broadcast(message) {
        const channels = await this.repo.findEnabled();
        const results = await Promise.allSettled(channels.map((ch) => this.sendToChannel(ch, message)));
        for (const [i, result] of results.entries()) {
            if (result.status === 'rejected') {
                console.error(`Push to channel #${channels[i].id} (${channels[i].platform}) failed:`, result.reason);
            }
        }
    }
    async sendToChannels(channelIds, message) {
        const uniqueIds = [...new Set(channelIds.filter((id) => Number.isInteger(id) && id > 0))];
        if (uniqueIds.length === 0) {
            return {
                requestedChannelIds: [],
                enabledChannelIds: [],
                deliveredChannelIds: [],
                failedChannelIds: [],
            };
        }
        const channels = await Promise.all(uniqueIds.map((id) => this.repo.findById(id)));
        const enabledChannels = channels.filter((channel) => Boolean(channel?.is_enabled));
        const results = await Promise.allSettled(enabledChannels.map((channel) => this.sendToChannel(channel, message)));
        const deliveredChannelIds = [];
        const failedChannelIds = [];
        for (const [i, result] of results.entries()) {
            if (result.status === 'rejected') {
                failedChannelIds.push(enabledChannels[i].id);
                console.error(`Push to channel #${enabledChannels[i].id} (${enabledChannels[i].platform}) failed:`, result.reason);
            }
            else {
                deliveredChannelIds.push(enabledChannels[i].id);
            }
        }
        return {
            requestedChannelIds: uniqueIds,
            enabledChannelIds: enabledChannels.map((channel) => channel.id),
            deliveredChannelIds,
            failedChannelIds,
        };
    }
    async sendToChannel(channel, message) {
        const sender = this.senders.get(channel.platform);
        if (!sender) {
            throw new Error(`No sender registered for platform: ${channel.platform}`);
        }
        const configJson = decrypt(channel.config_encrypted, this.encryptionKey);
        const config = JSON.parse(configJson);
        await sender.send(message, config);
    }
}
function toDto(row) {
    return {
        id: row.id,
        name: row.name,
        platform: row.platform,
        isEnabled: row.is_enabled === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
function validatePlatformConfig(platform, config) {
    switch (platform) {
        case 'dingtalk':
            if (!isNonEmptyString(config.webhookUrl)) {
                throw new ValidationError('DingTalk config requires webhookUrl');
            }
            return;
        case 'telegram':
            if (!isNonEmptyString(config.botToken) || !isNonEmptyString(config.chatId)) {
                throw new ValidationError('Telegram config requires botToken and chatId');
            }
            return;
        case 'webhook':
            if (!isNonEmptyString(config.url)) {
                throw new ValidationError('Webhook config requires url');
            }
            return;
        case 'feishu':
            return;
        default:
            return;
    }
}
function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}
//# sourceMappingURL=index.js.map