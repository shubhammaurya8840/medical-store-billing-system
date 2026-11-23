export type UserRole = 'super_admin' | 'billing_operator'

export type User = {
  id: string
  name: string
  username: string
  role: UserRole
  counterName?: string
}

export type Medicine = {
  id: string
  name: string
  brand: string
  generic: string
  strength: string
  form: string
  manufacturer: string
  category: string
  hsn: string
  gst: number
  unit: string
  minStock: number
  stock: number
  expiry: string // YYYY-MM-DD
  purchasePrice: number
  mrp: number
  sellingPrice: number
  active: boolean
}

export type Patient = {
  id: string
  name: string
  phone: string
  address: string
}

export type BillItem = {
  medicineId: string
  medicineName: string
  strength: string
  qty: number
  unit: string
  mrp: number
  price: number
  gst: number
  discount: number
}

export type Sale = {
  id: string
  invoiceNo: string
  date: string
  patient: Patient
  items: BillItem[]
  subtotal: number
  discount: number
  tax: number
  total: number
  payment: string
  operatorName?: string
}

export type StockMovement = {
  id: string
  medicineId: string
  medicineName: string
  prevQty: number
  changeQty: number
  newQty: number
  type: 'sale' | 'adjustment' | 'restock'
  reason: string
  user: string
  date: string
}
