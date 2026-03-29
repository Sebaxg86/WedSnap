export type AdminEvent = {
  event_date: string | null
  id: string
  is_active: boolean
  slug: string
  title: string
}

export type TableQrRecord = {
  created_at?: string
  event_id: string
  guest_group_name: string | null
  id: string
  is_active: boolean
  last_scanned_at: string | null
  notes?: string | null
  scan_count: number
  table_label: string
  table_number: number
  token: string
}
