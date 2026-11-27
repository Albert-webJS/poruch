type TemplateVars = Record<string, string>

const templates: Record<string, string> = {
  booking_created_provider:
    'Poruch: новий запис від {clientName} на "{serviceName}" {dateTime}. Перевірте у кабінеті.',

  booking_cancelled_provider:
    'Poruch: клієнт {clientName} скасував запис на {dateTime}.',

  booking_expired_provider:
    'Poruch: запис від {clientName} на {dateTime} протермінований. Клієнт повідомлений.',

  booking_created_client:
    'Poruch: вашу заявку на "{serviceName}" до {masterName} прийнято. Статус: {statusUrl}',

  booking_confirmed_client:
    'Poruch: {masterName} підтвердив ваш запис "{serviceName}" на {dateTime}. Деталі: {statusUrl}',

  booking_declined_client:
    'Poruch: {masterName} не зміг прийняти ваш запис. Спробуйте інший час або іншого майстра.',

  booking_proposed_client:
    'Poruch: {masterName} пропонує інший час: {dateTime}. Підтвердіть: {statusUrl}',

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

export function getTemplateKeys(): string[] {
  return Object.keys(templates)
}
