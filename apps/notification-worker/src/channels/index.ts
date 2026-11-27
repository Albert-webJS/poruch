export interface ChannelAdapter {
  readonly name: string
  send(to: string, message: string): Promise<{ messageId?: string }>
}
