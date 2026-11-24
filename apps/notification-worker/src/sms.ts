interface SendSMSParams {
  phone: string
  message: string
  token: string
  sender: string
}

interface TurboSMSResponse {
  response_code: number
  response_status: string
  response_result: { message_id: string; phone: string; response_code: number }[]
}

export async function sendSMS(params: SendSMSParams): Promise<string> {
  const response = await fetch('https://api.turbosms.ua/message/send.json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({
      recipients: [params.phone],
      sms: {
        sender: params.sender,
        text: params.message,
      },
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
    throw new Error(`TurboSMS delivery error for ${params.phone}`)
  }

  return messageResult.message_id
}
