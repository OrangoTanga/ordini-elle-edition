export type PaymentTerms = 'immediato' | '30' | '60' | '90'
export type OrderStatus = 'pending' | 'approved' | 'rejected'
export type ProductCategory = 'vino bianco' | 'vino rosso' | 'prosecco' | 'birre' | 'distillati' | 'extra' | ''

export const CATEGORIES: ProductCategory[] = ['vino bianco', 'vino rosso', 'prosecco', 'birre', 'distillati', 'extra']

export interface User {
  id: number
  username: string
  password: string
  name: string
  phone: string
  active: boolean
  created_at: string
}

export interface Product {
  id: number
  name: string
  description: string
  price: number
  category: ProductCategory
  image_path: string
  active: boolean
}

export interface Customer {
  id: number
  business_name: string
  vat: string
  iban: string
  address: string
  phone: string
  email: string
}

export interface OrderItem {
  id?: number
  order_id?: number
  product_id: number
  product_name: string
  price: number
  quantity: number
  subtotal: number
}

export interface Order {
  id?: number
  user_id: number
  user_name?: string
  customer_id?: number
  business_name: string
  vat: string
  iban: string
  invoice_date: string
  payment_terms: PaymentTerms
  total: number
  status: OrderStatus
  notes: string
  created_at: string
  updated_at?: string
  items: OrderItem[]
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user: Omit<User, 'password'>
  crypto_salt?: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface PendingOrder {
  id: string
  order: Omit<Order, 'id' | 'created_at' | 'updated_at'>
  retry_count: number
  last_attempt: string | null
  created_at: string
}
