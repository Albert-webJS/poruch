import type { ChannelAdapter } from './index.js'

export class ConsoleAdapter implements ChannelAdapter {
  readonly name = 'console'

  async send(to: string, message: string): Promise<{ messageId?: string }> {
    console.log(`[SMS → ${to}] ${message}`)
    return { messageId: `dev-${Date.now()}` }
  }
}
