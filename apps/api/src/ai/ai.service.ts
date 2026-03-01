import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService {
  private anthropic: Anthropic;
  private readonly logger = new Logger(AiService.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'ANTHROPIC_API_KEY is not defined. AI features will not work.',
      );
    }
    this.anthropic = new Anthropic({
      apiKey: apiKey || 'dummy-key', // Prevent crash on startup if missing
    });
  }

  async chat(message: string, history: any[] = []) {
    if (!this.anthropic.apiKey || this.anthropic.apiKey === 'dummy-key') {
      throw new Error(
        'Anthropic API Key is missing. Please check your .env configuration.',
      );
    }

    try {
      // Filter history to ensure it matches Anthropic's message format
      // basic validation: role must be 'user' or 'assistant'
      const validHistory = history.filter((msg) =>
        ['user', 'assistant'].includes(msg.role),
      );

      const messages = [...validHistory, { role: 'user', content: message }];

      const response = await this.anthropic.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 1024,
        messages: messages as any, // Type assertion for now, better to define strict types
      });

      return {
        role: 'assistant',
        content:
          response.content[0].type === 'text'
            ? response.content[0].text
            : 'Content not text',
      };
    } catch (error) {
      this.logger.error('Error in chat', error);
      throw error;
    }
  }
}
