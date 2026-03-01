import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken } from 'livekit-server-sdk';

@Injectable()
export class LivekitService {
    private readonly apiKey: string;
    private readonly apiSecret: string;

    constructor(private config: ConfigService) {
        this.apiKey = this.config.get<string>('LIVEKIT_API_KEY', '');
        this.apiSecret = this.config.get<string>('LIVEKIT_API_SECRET', '');
    }

    async generateToken(room: string, username: string): Promise<string> {
        if (!this.apiKey || !this.apiSecret) {
            throw new Error('LiveKit credentials not configured');
        }

        const token = new AccessToken(this.apiKey, this.apiSecret, {
            identity: username,
            name: username,
        });

        token.addGrant({
            roomJoin: true,
            room,
            canPublish: true,
            canSubscribe: true,
        });

        return await token.toJwt();
    }
}
