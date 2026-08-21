export type UserRole = 'admin' | 'staff'

export type MembershipStatus = 'ACTIVO' | 'VENCIDO' | 'PRÓXIMO A VENCER'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  created_at: string
}

export interface Member {
  id: string
  membership_number: string
  full_name: string
  dni: string
  phone: string
  created_at: string
  updated_at: string
}

export interface MembershipPlan {
  id: string
  name: string
  price: number
  duration_days: number
  active: boolean
  created_at: string
}

export interface Subscription {
  id: string
  member_id: string
  plan_id: string
  start_date: string
  end_date: string
  price_paid: number
  created_at: string
}

export interface MemberListItem extends Member {
  current_plan_name: string | null
  current_start_date: string | null
  current_end_date: string | null
  current_price_paid: number | null
}

export interface Invoice {
  id: string
  subscription_id: string | null
  member_id: string | null
  voucher_type: 'boleta' | 'factura'
  invoice_number: string
  client_code: string
  client_name: string
  client_document: string
  plan_name: string
  subtotal: number
  igv: number
  total: number
  pdf_url: string | null
  sunat_status: string
  qr_code_data: string | null
  created_at: string
}
