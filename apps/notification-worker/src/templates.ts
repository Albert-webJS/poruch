type TemplateVars = Record<string, string>

const templates: Record<string, string> = {
  // Provider receives
  booking_created_provider:
    'Poruch: новий запис від {clientName} на "{serviceName}" {dateTime}. Перевірте у кабінеті.',

  booking_cancelled_provider:
    'Poruch: клієнт {clientName} скасував запис на {dateTime}.',

  // Client receives
  booking_confirmed_client:
    'Poruch: {masterName} підтвердив ваш запис "{serviceName}" на {dateTime}.',

  booking_declined_client:
    'Poruch: {masterName} не зміг прийняти ваш запис. Спробуйте інший час.',

  booking_proposed_client:
    'Poruch: {masterName} пропонує інший час: {dateTime}. Перейдіть за посиланням для підтвердження.',

  booking_expired_provider:
    'Poruch: запис від {clientName} на {dateTime} протермінований. Клієнт повідомлений.',

  booking_expired_client:
    'Poruch: майстер не відповів на ваш запис на {dateTime}. Спробуйте іншого майстра.',
}

export function getTemplate(key: string, vars: TemplateVars): string {
  const template = templates[key]
  if (!template) {
    throw new Error(`Unknown template: ${key}`)
  }

  return template.replace(/\{(\w+)\}/g, (_, varName: string) => {
    return vars[varName] ?? `{${varName}}`
  })
}
