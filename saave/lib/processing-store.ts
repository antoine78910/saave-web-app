import { getJsonFromR2, putJsonToR2 } from '@/lib/r2'

type ProcessingItem = Record<string, any>

const memoryStore = new Map<string, ProcessingItem[]>()

function isR2Configured(): boolean {
  return Boolean(
    process.env.CLOUDFLARE_R2_ENDPOINT &&
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
    process.env.CLOUDFLARE_R2_BUCKET_NAME
  )
}

export async function getProcessingList(userId: string): Promise<ProcessingItem[]> {
  if (!userId) return []
  if (isR2Configured()) {
    const key = `processing/${userId}.json`
    const list = await getJsonFromR2<ProcessingItem[]>(key)
    return Array.isArray(list) ? list : []
  }
  return memoryStore.get(userId) || []
}

export async function upsertProcessingItem(userId: string, item: ProcessingItem): Promise<void> {
  if (!userId || !item) return
  // Ensure status and step exist for UI
  if (!item.status) item.status = 'loading'
  if (!item.processingStep) item.processingStep = 'scraping'
  if (isR2Configured()) {
    const key = `processing/${userId}.json`
    const list = (await getJsonFromR2<ProcessingItem[]>(key)) || []
    const existing = list.find(b => b.id === item.id)
    // If an item was cancelled, cancellation must be sticky (can't be overwritten by subsequent upserts)
    if (existing?.cancelled) {
      item = { ...item, cancelled: true, status: 'cancelled', cancelled_at: existing.cancelled_at || item.cancelled_at }
    }
    const next = [item, ...list.filter(b => b.id !== item.id)]
    await putJsonToR2(key, next)
    return
  }
  const current = memoryStore.get(userId) || []
  const existing = current.find(b => b.id === item.id)
  if (existing?.cancelled) {
    item = { ...item, cancelled: true, status: 'cancelled', cancelled_at: existing.cancelled_at || item.cancelled_at }
  }
  const next = [item, ...current.filter(b => b.id !== item.id)]
  memoryStore.set(userId, next)
}

export async function updateProcessingItem(userId: string, id: string, patch: Partial<ProcessingItem>): Promise<void> {
  if (!userId || !id) return
  if (isR2Configured()) {
    const key = `processing/${userId}.json`
    const list = (await getJsonFromR2<ProcessingItem[]>(key)) || []
    const next = list.map(b => b.id === id ? { ...b, ...patch } : b)
    await putJsonToR2(key, next)
    return
  }
  const current = memoryStore.get(userId) || []
  const next = current.map(b => b.id === id ? { ...b, ...patch } : b)
  memoryStore.set(userId, next)
}

export async function isProcessingCancelled(userId: string, id: string): Promise<boolean> {
  if (!userId || !id) return false
  const list = await getProcessingList(userId)
  const found = list.find(b => b.id === id)
  // Si l'item n'existe plus, c'est qu'il a été annulé et supprimé
  if (!found) return true
  return Boolean(found?.cancelled)
}

export async function removeProcessingItem(userId: string, id: string): Promise<void> {
  if (!userId || !id) return
  if (isR2Configured()) {
    const key = `processing/${userId}.json`
    const list = (await getJsonFromR2<ProcessingItem[]>(key)) || []
    const next = list.filter((b: any) => b.id !== id)
    await putJsonToR2(key, next)
    return
  }
  const current = memoryStore.get(userId) || []
  const next = current.filter((b: any) => b.id !== id)
  memoryStore.set(userId, next)
}


