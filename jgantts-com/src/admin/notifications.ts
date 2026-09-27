export type NotificationDashboard = {
  enabled: boolean
  sendEnabled: boolean
  audience: '*' | string[]
  capturedAt: number
  activeSubscriptions: number
  pendingEvents: number
  retryingDeliveries: number
  oldestPendingAgeSeconds: number
  deliveries: { state: string; count: number }[]
  events: {
    id: string; kind: string; state: string; createdAt: number; expiresAt: number
    title: string | null; slug: string | null
    total: number; accepted: number; waiting: number; failed: number; cancelled: number
  }[]
  recentDeliveries: {
    id: number; eventId: string; installationId: string; state: string; attempts: number
    lastStatus: number | null; availableAt: number; updatedAt: number; createdAt: number
    kind: string; title: string | null; slug: string | null; acceptedAfterMs: number | null
  }[]
  installations: { id: string; active: boolean; allowed: boolean; createdAt: number; lastSeenAt: number }[]
}
