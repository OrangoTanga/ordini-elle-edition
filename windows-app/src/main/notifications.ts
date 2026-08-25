import { Notification } from 'electron'

let lastNotificationTime = 0

export function sendNotification(title: string, body: string): void {
  const now = Date.now()
  if (now - lastNotificationTime < 2000) return
  lastNotificationTime = now

  const notification = new Notification({
    title,
    body,
    silent: false,
    urgency: 'normal',
  })

  notification.show()
}

export function sendNewOrderNotification(repName: string, businessName: string, total: number): void {
  sendNotification(
    'Nuovo Ordine',
    `${repName} - ${businessName} - €${total.toFixed(2)}`
  )
}

export function sendTunnelDownNotification(): void {
  sendNotification(
    'Tunnel Non Raggiungibile',
    'Riavvio automatico in corso...'
  )
}

export function sendTunnelRestartedNotification(): void {
  sendNotification(
    'Tunnel Riavviato',
    'URL aggiornato su Google Drive'
  )
}
