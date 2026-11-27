import type { ChannelAdapter } from './index.js'

interface TurboSMSResponse {
  response_code: number
  response_status: string
  response_result: { message_id: string; phone: string; response_code: number }[]
}

export class TurboSMSAdapter implements ChannelAdapter {
  readonly name = 'sms'

  constructor(
    private token: string,
    private sender: string,
  ) {}

  async send(to: string, message: string): Promise<{ messageId?: string }> {
    const response = await fetch('https://api.turbosms.ua/message/send.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        recipients: [to],
        sms: { sender: this.sender, text: message },
      }),
    })

    if (!response.ok) {
      throw new Error(`TurboSMS API error: ${response.status} ${response.statusText}`)
    }

    const result = (await response.json()) as TurboSMSResponse

    if (result.response_code !== 0) {
      throw new Error(`TurboSMS error: ${result.response_status}`)
    }

    const messageResult = result.response_result[0]
    if (!messageResult || messageResult.response_code !== 0) {
      throw new Error(`TurboSMS delivery error for ${to}`)
    }

    return { messageId: messageResult.message_id }
  }
}
