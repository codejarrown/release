import type { IPushChannelRepository } from '../../db/repositories/push-channel.repository.js';
import type { PushPlatform } from '../../db/kysely/database.js';
import type { PushSender, PushMessage } from './gateway.js';
export type { PushMessage } from './gateway.js';
export interface PushSendResult {
    requestedChannelIds: number[];
    enabledChannelIds: number[];
    deliveredChannelIds: number[];
    failedChannelIds: number[];
}
export interface PushChannelDto {
    id: number;
    name: string;
    platform: PushPlatform;
    isEnabled: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface CreatePushChannelInput {
    name: string;
    platform: PushPlatform;
    config: Record<string, unknown>;
}
export interface UpdatePushChannelInput {
    name?: string;
    config?: Record<string, unknown>;
    isEnabled?: boolean;
}
export declare class PushService {
    private readonly repo;
    private readonly encryptionKey;
    private readonly senders;
    private readonly mutedChannelUntil;
    private readonly muteNoticeSentAt;
    constructor(repo: IPushChannelRepository, encryptionKey: string);
    registerSender(sender: PushSender): void;
    list(): Promise<PushChannelDto[]>;
    getById(id: number): Promise<PushChannelDto>;
    create(input: CreatePushChannelInput): Promise<PushChannelDto>;
    update(id: number, input: UpdatePushChannelInput): Promise<PushChannelDto>;
    delete(id: number): Promise<void>;
    /** Send a test message through a specific channel. */
    test(id: number): Promise<void>;
    /** Broadcast a message to all enabled channels. */
    broadcast(message: PushMessage): Promise<void>;
    sendToChannels(channelIds: number[], message: PushMessage): Promise<PushSendResult>;
    private sendToChannel;
    private assertChannelAvailable;
    private handleChannelSendError;
    private shouldSuppressChannelErrorLog;
    private markMuteNotice;
}
//# sourceMappingURL=index.d.ts.map