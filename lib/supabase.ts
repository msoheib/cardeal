import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export interface User {
  id: string
  email?: string
  phone?: string
  full_name: string
  user_type: 'buyer' | 'dealer' | 'admin'
  preferred_language: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Dealer {
  id: string
  user_id: string
  company_name: string
  commercial_registration: string
  verified: boolean
  city: string
  contact_info: any
  logo_url?: string
  description?: string
  rating: number
  total_sales: number
  created_at: string
  updated_at: string
}

export interface Car {
  id: string
  dealer_id: string
  make: string
  model: string
  year: number
  variant?: string
  wakala_price: number
  description?: string
  specifications: any
  images: string[]
  status: 'active' | 'sold_out' | 'inactive' | 'draft'
  available_quantity: number
  original_quantity: number
  created_at: string
  updated_at: string
  featured: boolean
  min_bid_price?: number
  trim?: string
  color?: string
  price_slots?: number[]
  dealer?: Dealer
}

export interface Bid {
  id: string
  car_id: string
  buyer_id: string
  bid_price: number
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled'
  commitment_fee_paid: boolean
  payment_reference?: string
  created_at: string
  expires_at: string
  updated_at: string
  car?: Car
  buyer?: User
}

export interface BidAggregate {
  id: string
  car_id: string
  bid_price: number
  bid_count: number
  last_updated: string
}

export interface CommitmentFee {
  id: string
  bid_id: string
  buyer_id: string
  amount: number
  status: 'pending' | 'paid' | 'refunded' | 'applied_to_purchase'
  payment_method?: string
  transaction_reference?: string
  gateway_response: any
  created_at: string
  processed_at?: string
}

export interface Deal {
  id: string
  car_id: string
  dealer_id: string
  buyer_id: string
  bid_id: string
  final_price: number
  quantity: number
  status: 'pending_payment' | 'completed' | 'cancelled' | 'refunded'
  payment_due_date: string
  completed_at?: string
  created_at: string
  car?: Car
  dealer?: Dealer
  buyer?: User
}

export interface CarConfiguration {
  id: string
  make: string
  model: string
  year: number
  variant?: string
  trim?: string
  color?: string
  msrp: number
  description?: string
  specifications: any
  images: string[]
  created_at: string
  updated_at: string
}

export interface DealerInventory {
  id: string
  dealer_id: string
  car_configuration_id: string
  quantity: number
  status: 'active' | 'out_of_stock' | 'hidden'
  price_slots?: number[]
  created_at: string
  updated_at: string
  configuration?: CarConfiguration
  dealer?: Dealer
}
