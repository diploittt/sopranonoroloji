import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { LivekitService } from './livekit.service';

@Controller('livekit')
export class LivekitController {
    constructor(private readonly livekitService: LivekitService) { }

    @Get('token')
    async getToken(
        @Query('room') room: string,
        @Query('username') username: string,
    ) {
        if (!room || !username) {
            throw new BadRequestException('Missing room or username');
        }

        try {
            const token = await this.livekitService.generateToken(room, username);
            return { token };
        } catch (error) {
            throw new BadRequestException(error.message || 'Token generation failed');
        }
    }
}
