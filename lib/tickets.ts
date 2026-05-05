import { supabase } from './supabase'
import { toArabicError } from './arabic-errors'

export type SupportTicketReason =
  | 'supplier_no_response'
  | 'car_not_received'
  | 'car_damaged'
  | 'other'

export type SupportTicketStatus =
  | 'open'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'resolved'
  | 'closed'

export const SUPPORT_TICKET_REASONS: Record<SupportTicketReason, string> = {
  supplier_no_response: 'المورد لا يرد',
  car_not_received: 'لم أستلم السيارة',
  car_damaged: 'السيارة تالفة أو غير مطابقة',
  other: 'شكوى أخرى'
}

export const SUPPORT_TICKET_STATUSES: Record<SupportTicketStatus, string> = {
  open: 'مفتوحة',
  under_review: 'قيد المراجعة',
  approved: 'تمت الموافقة',
  rejected: 'مرفوضة',
  resolved: 'تم الحل',
  closed: 'مغلقة'
}

export const getTicketsByBuyer = async (buyerId: string) => {
  const { data, error } = await supabase
    .from('support_tickets')
    .select(`
      *,
      deal:deals(
        id,
        final_price,
        status,
        created_at,
        configuration:car_configurations(make, model, year, trim, color, origin_locale)
      ),
      dealer:dealers(company_name, city)
    `)
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false })

  return { data, error }
}

export const getAllSupportTickets = async () => {
  const { data, error } = await supabase
    .from('support_tickets')
    .select(`
      *,
      deal:deals(
        id,
        final_price,
        status,
        created_at,
        configuration:car_configurations(make, model, year, trim, color, origin_locale)
      ),
      dealer:dealers(company_name),
      buyer:users(full_name, email, phone)
    `)
    .order('created_at', { ascending: false })

  return { data, error }
}

export const createSupportTicket = async (params: {
  dealId: string
  reason: SupportTicketReason
  description: string
  evidenceUrls?: string[]
}) => {
  const { data, error } = await supabase.rpc('create_support_ticket', {
    p_deal_id: params.dealId,
    p_reason: params.reason,
    p_description: params.description,
    p_evidence_urls: params.evidenceUrls || []
  })

  if (error) return { data: null, error: toArabicError(error, 'تعذر إرسال التذكرة') }
  if (data?.error) return { data: null, error: toArabicError(data.error, 'تعذر إرسال التذكرة') }

  return { data, error: null }
}

export const reviewSupportTicket = async (params: {
  ticketId: string
  status: Exclude<SupportTicketStatus, 'open'>
  adminNotes?: string
}) => {
  const { data, error } = await supabase.rpc('review_support_ticket', {
    p_ticket_id: params.ticketId,
    p_status: params.status,
    p_admin_notes: params.adminNotes || null
  })

  if (error) return { data: null, error: toArabicError(error, 'تعذر تحديث التذكرة') }
  if (data?.error) return { data: null, error: toArabicError(data.error, 'تعذر تحديث التذكرة') }

  return { data, error: null }
}
