import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Building,
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  LayoutDashboard,
  Lock,
  LogOut,
  MapPin,
  Menu,
  Package,
  PackageCheck,
  PackageX,
  Phone,
  Pill,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShoppingCart,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import {
  initialMedicines,
  initialPatients,
  initialSales,
  initialStockMovements,
  initialUsers,
} from './data'
import { printSaleInvoice } from './invoicePrint'
import type {
  BillItem,
  Medicine,
  Patient,
  Sale,
  StockMovement,
  User as UserType,
  UserRole,
} from './types'
import {
  isExpired,
  isNearExpiry,
  money,
  safeRead,
  today,
  uid,
} from './utils'

type Page =
  | 'Billing'
  | 'Overview'
  | 'Medicines'
  | 'Stock'
  | 'Audit'
  | 'Patients'
  | 'Sales'
  | 'Reports'

export default function App() {
  // Authentication & Role state - Opens Login Page first if not logged in
  const [currentUser, setCurrentUser] = useState<UserType | null>(() =>
    safeRead('cs_active_user', null)
  )
  const [loginInput, setLoginInput] = useState('')
  const [loginError, setLoginError] = useState('')

  // Active page
  const [page, setPage] = useState<Page>('Billing')

  // Master Data
  const [medicines, setMedicines] = useState<Medicine[]>(() =>
    safeRead('cs_medicines_v2', initialMedicines)
  )
  const [patients, setPatients] = useState<Patient[]>(() =>
    safeRead('cs_patients_v2', initialPatients)
  )
  const [sales, setSales] = useState<Sale[]>(() =>
    safeRead('cs_sales_v2', initialSales)
  )
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() =>
    safeRead('cs_stock_movements_v2', initialStockMovements)
  )

  // UI state
  const [toast, setToast] = useState('')
  const [showMobile, setShowMobile] = useState(false)
  const [modal, setModal] = useState<
    | 'medicine'
    | 'patient'
    | 'patientHistory'
    | 'saleDetail'
    | 'stockAdjustment'
    | null
  >(null)

  // Modals payload state
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null)
  const [adjustingMedicine, setAdjustingMedicine] = useState<Medicine | null>(null)
  const [adjustmentForm, setAdjustmentForm] = useState({
    type: 'add' as 'add' | 'reduce',
    qty: 10,
    reason: '',
  })
  const [selectedPatientForHistory, setSelectedPatientForHistory] =
    useState<Patient | null>(null)
  const [selectedSaleForView, setSelectedSaleForView] = useState<Sale | null>(null)

  // Billing Desk state
  const [counterSearch, setCounterSearch] = useState('')
  const [cart, setCart] = useState<BillItem[]>([])
  const [patientSearchQuery, setPatientSearchQuery] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [paymentMode, setPaymentMode] = useState('Cash')
  const [discountAmount, setDiscountAmount] = useState(0)
  const [invoiceFormat, setInvoiceFormat] = useState<'80mm' | 'A4'>('A4') // Default to A4 as requested

  // Patient Directory filter
  const [patientUnifiedQuery, setPatientUnifiedQuery] = useState('')

  // Sales filter
  const [salesSearchQuery, setSalesSearchQuery] = useState('')
  const [salesDateFilter, setSalesDateFilter] = useState('')

  // Medicine catalogue filter
  const [medCatalogueQuery, setMedCatalogueQuery] = useState('')
  const [medCategoryFilter, setMedCategoryFilter] = useState('All')

  // Patient Form (Strictly Name, Phone, Address)
  const [patientForm, setPatientForm] = useState({
    name: '',
    phone: '',
    address: '',
  })
  const [patientFormErrors, setPatientFormErrors] = useState<{
    name?: string
    phone?: string
  }>({})

  // Medicine Form (Direct Stock, No Batch)
  const [medicineForm, setMedicineForm] = useState({
    name: '',
    brand: '',
    generic: '',
    strength: '',
    form: 'Tablet',
    manufacturer: '',
    category: 'Analgesic',
    hsn: '3004',
    gst: 12,
    unit: 'Strip',
    minStock: 15,
    stock: 50,
    expiry: '',
    purchasePrice: 0,
    mrp: 0,
    sellingPrice: 0,
  })

  const fileRef = useRef<HTMLInputElement>(null)

  // LocalStorage Persistence
  useEffect(() => {
    localStorage.setItem('cs_active_user', JSON.stringify(currentUser))
  }, [currentUser])
  useEffect(() => {
    localStorage.setItem('cs_medicines_v2', JSON.stringify(medicines))
  }, [medicines])
  useEffect(() => {
    localStorage.setItem('cs_patients_v2', JSON.stringify(patients))
  }, [patients])
  useEffect(() => {
    localStorage.setItem('cs_sales_v2', JSON.stringify(sales))
  }, [sales])
  useEffect(() => {
    localStorage.setItem('cs_stock_movements_v2', JSON.stringify(stockMovements))
  }, [stockMovements])

  const notify = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 3000)
  }

  // Handle Single-Input Login with Role-Based Access
  const handleSingleInputLogin = (val?: string) => {
    const raw = (val !== undefined ? val : loginInput).trim()
    const query = raw.toLowerCase()
    setLoginError('')

    if (!query) {
      setLoginError('Please enter role ID or click an account from the roster below.')
      return
    }

    if (query === 'admin' || query === 'super_admin' || query === 'admin123') {
      const adminUser = initialUsers.find((u) => u.role === 'super_admin')!
      setCurrentUser(adminUser)
      setPage('Overview')
      notify(`Logged in as ${adminUser.name} (Super Admin)`)
    } else if (
      query === 'counter' ||
      query === 'counter1' ||
      query === 'operator' ||
      query === 'billing' ||
      query === 'counter123'
    ) {
      const counterUser = initialUsers.find((u) => u.role === 'billing_operator')!
      setCurrentUser(counterUser)
      setPage('Billing')
      notify(`Logged in as ${counterUser.name} (Counter Operator)`)
    } else {
      setLoginError(
        'Unknown access ID. Type "admin" for Super Admin or "counter" for Billing Operator (or select from roster below).'
      )
    }
  }

  const handleLogout = () => {
    setCurrentUser(null)
    localStorage.removeItem('cs_active_user')
    setCart([])
    setLoginInput('')
    setLoginError('')
    notify('Logged out successfully.')
  }

  // Stock & Expiry Computations (Admin View)
  const expiredMedicines = useMemo(
    () => medicines.filter((m) => isExpired(m.expiry) && m.stock > 0),
    [medicines]
  )
  const nearExpiryMedicines = useMemo(
    () => medicines.filter((m) => isNearExpiry(m.expiry) && m.stock > 0),
    [medicines]
  )
  const lowStockMedicines = useMemo(
    () => medicines.filter((m) => m.stock <= m.minStock && !isExpired(m.expiry)),
    [medicines]
  )

  // COUNTER DISPLAY FILTER:
  // Only active, stock > 0, and NOT expired medicines are shown on counter!
  const availableCounterMedicines = useMemo(() => {
    return medicines.filter((m) => m.active && m.stock > 0 && !isExpired(m.expiry))
  }, [medicines])

  // Filtered medicines for billing counter
  const filteredCounterMedicines = useMemo(() => {
    if (!counterSearch.trim()) return availableCounterMedicines
    const q = counterSearch.toLowerCase().trim()
    return availableCounterMedicines.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.brand.toLowerCase().includes(q) ||
        m.generic.toLowerCase().includes(q) ||
        m.strength.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
    )
  }, [availableCounterMedicines, counterSearch])

  // Patients matching in billing desk (Search by Name OR Mobile)
  const billingPatientMatches = useMemo(() => {
    if (!patientSearchQuery.trim()) return []
    const q = patientSearchQuery.toLowerCase().trim()
    return patients.filter(
      (p) => p.name.toLowerCase().includes(q) || p.phone.includes(q)
    )
  }, [patients, patientSearchQuery])

  // Add medicine directly to cart (NO BATCH CONCEPT)
  const addToCart = (m: Medicine) => {
    if (isExpired(m.expiry)) {
      notify(`Cannot add ${m.name}: Expired medicine!`)
      return
    }
    if (m.stock <= 0) {
      notify(`Cannot add ${m.name}: Out of stock!`)
      return
    }

    const existingIndex = cart.findIndex((i) => i.medicineId === m.id)
    if (existingIndex > -1) {
      const existing = cart[existingIndex]
      if (existing.qty >= m.stock) {
        notify(`Stock limit reached! Only ${m.stock} ${m.unit} available.`)
        return
      }
      setCart(
        cart.map((it, idx) =>
          idx === existingIndex ? { ...it, qty: it.qty + 1 } : it
        )
      )
    } else {
      setCart([
        ...cart,
        {
          medicineId: m.id,
          medicineName: m.name,
          strength: m.strength,
          qty: 1,
          unit: m.unit,
          mrp: m.mrp,
          price: m.sellingPrice || m.mrp,
          gst: m.gst,
          discount: 0,
        },
      ])
    }
    notify(`Added ${m.name} to bill`)
  }

  const changeCartQty = (idx: number, qty: number) => {
    if (qty < 1) {
      setCart(cart.filter((_, i) => i !== idx))
      return
    }
    const item = cart[idx]
    const med = medicines.find((m) => m.id === item.medicineId)
    if (med && qty > med.stock) {
      notify(`Only ${med.stock} ${med.unit} available in stock!`)
      return
    }
    setCart(cart.map((it, i) => (i === idx ? { ...it, qty } : it)))
  }

  // Cart financial totals
  const subtotal = useMemo(
    () => cart.reduce((a, i) => a + i.qty * i.price, 0),
    [cart]
  )
  const itemDiscounts = useMemo(
    () => cart.reduce((a, i) => a + i.discount, 0),
    [cart]
  )
  const taxableAmount = Math.max(0, subtotal - discountAmount - itemDiscounts)
  const estimatedTax = useMemo(
    () =>
      cart.reduce((a, i) => a + (i.qty * i.price - i.discount) * (i.gst / 100), 0),
    [cart]
  )
  const grandTotal = Math.max(0, taxableAmount + estimatedTax)

  // Finish Bill and Deduct Stock immediately + Log Stock Movement
  const finishBill = () => {
    if (!cart.length) {
      notify('Please add at least one medicine to the bill.')
      return
    }
    if (!selectedPatient) {
      notify('Please select or add a patient first.')
      return
    }

    // Verify stock availability
    for (const item of cart) {
      const med = medicines.find((m) => m.id === item.medicineId)
      if (!med) {
        notify(`Medicine ${item.medicineName} not found in inventory!`)
        return
      }
      if (isExpired(med.expiry)) {
        notify(`Cannot complete bill: ${med.name} is expired!`)
        return
      }
      if (med.stock < item.qty) {
        notify(`Insufficient stock for ${med.name}. Available: ${med.stock}`)
        return
      }
    }

    const invoiceNo = `MED-${Date.now().toString().slice(-6)}`
    const sale: Sale = {
      id: uid(),
      invoiceNo,
      date: new Date().toISOString(),
      patient: selectedPatient,
      items: [...cart],
      subtotal,
      discount: discountAmount + itemDiscounts,
      tax: estimatedTax,
      total: grandTotal,
      payment: paymentMode,
      operatorName: currentUser?.name || 'Counter Operator',
    }

    // Deduct stock from medicines automatically & log audit movement
    const newMovements: StockMovement[] = []
    setMedicines((prev) =>
      prev.map((m) => {
        const cartItem = cart.find((i) => i.medicineId === m.id)
        if (cartItem) {
          const newQty = Math.max(0, m.stock - cartItem.qty)
          newMovements.push({
            id: uid(),
            medicineId: m.id,
            medicineName: m.name,
            prevQty: m.stock,
            changeQty: -cartItem.qty,
            newQty,
            type: 'sale',
            reason: `Sale ${invoiceNo}`,
            user: currentUser?.name || 'Billing Operator',
            date: new Date().toISOString(),
          })
          return { ...m, stock: newQty }
        }
        return m
      })
    )

    setStockMovements((prev) => [...newMovements, ...prev])
    setSales((prev) => [sale, ...prev])
    setCart([])
    setDiscountAmount(0)
    setSelectedPatient(null)
    setPatientSearchQuery('')
    notify(`Bill ${sale.invoiceNo} completed! Stock deducted automatically.`)

    // Print Invoice (A4 or 80mm)
    setTimeout(() => printSaleInvoice(sale, invoiceFormat), 200)
  }

  // Stock Adjustment by Super Admin
  const handleStockAdjustment = () => {
    if (!adjustingMedicine) return
    if (!adjustmentForm.reason.trim()) {
      notify('Authorized reason is mandatory for stock adjustments!')
      return
    }

    const change =
      adjustmentForm.type === 'add'
        ? Number(adjustmentForm.qty)
        : -Number(adjustmentForm.qty)
    const prevQty = adjustingMedicine.stock
    const newQty = Math.max(0, prevQty + change)

    setMedicines((prev) =>
      prev.map((m) => (m.id === adjustingMedicine.id ? { ...m, stock: newQty } : m))
    )

    const auditEntry: StockMovement = {
      id: uid(),
      medicineId: adjustingMedicine.id,
      medicineName: adjustingMedicine.name,
      prevQty,
      changeQty: change,
      newQty,
      type: 'adjustment',
      reason: adjustmentForm.reason.trim(),
      user: currentUser?.name || 'Super Admin',
      date: new Date().toISOString(),
    }
    setStockMovements((prev) => [auditEntry, ...prev])

    notify(`Stock for ${adjustingMedicine.name} adjusted from ${prevQty} to ${newQty}`)
    setModal(null)
    setAdjustingMedicine(null)
    setAdjustmentForm({ type: 'add', qty: 10, reason: '' })
  }

  // Save Patient (Strictly Name, Phone, Address with Name & Phone Mandatory)
  const savePatient = () => {
    const errors: { name?: string; phone?: string } = {}
    if (!patientForm.name.trim()) {
      errors.name = 'Patient Name is mandatory!'
    }
    const cleanPhone = patientForm.phone.trim().replace(/\D/g, '')
    if (!cleanPhone || cleanPhone.length < 10) {
      errors.phone = 'Valid 10-digit Mobile Number is mandatory!'
    }

    if (Object.keys(errors).length > 0) {
      setPatientFormErrors(errors)
      notify('Please enter mandatory Patient Name and Mobile Number.')
      return
    }

    const newPatient: Patient = {
      id: uid(),
      name: patientForm.name.trim(),
      phone: patientForm.phone.trim(),
      address: patientForm.address.trim(),
    }

    setPatients((prev) => [newPatient, ...prev])
    setSelectedPatient(newPatient)
    setPatientSearchQuery(newPatient.name)
    setModal(null)
    setPatientForm({ name: '', phone: '', address: '' })
    setPatientFormErrors({})
    notify(`Patient ${newPatient.name} added!`)
  }

  // Save / Update Medicine (Direct stock, no batches)
  const saveMedicine = () => {
    if (!medicineForm.name.trim()) {
      notify('Medicine name is mandatory.')
      return
    }
    if (!medicineForm.expiry) {
      notify('Expiry date is mandatory.')
      return
    }

    if (editingMedicine) {
      setMedicines((prev) =>
        prev.map((m) =>
          m.id === editingMedicine.id
            ? {
                ...m,
                ...medicineForm,
                stock: Number(medicineForm.stock),
                minStock: Number(medicineForm.minStock),
                purchasePrice: Number(medicineForm.purchasePrice),
                mrp: Number(medicineForm.mrp),
                sellingPrice: Number(medicineForm.sellingPrice),
                gst: Number(medicineForm.gst),
              }
            : m
        )
      )
      notify(`Medicine "${medicineForm.name}" updated!`)
    } else {
      const newMed: Medicine = {
        id: uid(),
        ...medicineForm,
        stock: Number(medicineForm.stock),
        minStock: Number(medicineForm.minStock),
        purchasePrice: Number(medicineForm.purchasePrice),
        mrp: Number(medicineForm.mrp),
        sellingPrice: Number(medicineForm.sellingPrice),
        gst: Number(medicineForm.gst),
        active: true,
      }
      setMedicines((prev) => [newMed, ...prev])
      notify(`Medicine "${newMed.name}" added to master catalogue!`)
    }

    setModal(null)
    setEditingMedicine(null)
  }

  const editMedicine = (m: Medicine) => {
    setEditingMedicine(m)
    setMedicineForm({
      name: m.name,
      brand: m.brand,
      generic: m.generic,
      strength: m.strength,
      form: m.form,
      manufacturer: m.manufacturer,
      category: m.category,
      hsn: m.hsn,
      gst: m.gst,
      unit: m.unit,
      minStock: m.minStock,
      stock: m.stock,
      expiry: m.expiry,
      purchasePrice: m.purchasePrice,
      mrp: m.mrp,
      sellingPrice: m.sellingPrice,
    })
    setModal('medicine')
  }

  // Excel template and import
  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        name: 'Dolo 650',
        brand: 'Dolo',
        generic: 'Paracetamol',
        strength: '650 mg',
        form: 'Tablet',
        manufacturer: 'Micro Labs',
        category: 'Analgesic',
        hsn: '3004',
        gst: 12,
        unit: 'Strip',
        minStock: 20,
        stock: 100,
        expiry: '2027-12-31',
        purchasePrice: 22.0,
        mrp: 34.0,
        sellingPrice: 32.0,
      },
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Medicines')
    XLSX.writeFile(wb, 'careplus-medicine-catalogue-template.xlsx')
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'array' })
        const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]])
        let added = 0
        const next = [...medicines]

        rows.forEach((r: any) => {
          const name = String(r.name || r.Name || r['Medicine Name'] || '').trim()
          if (!name) return
          const existing = next.find(
            (m) => m.name.toLowerCase() === name.toLowerCase()
          )
          const stock = Number(r.stock || r.Quantity || r.qty || 50)
          const expiry = String(r.expiry || r.Expiry || '2027-12-31').slice(0, 10)

          if (existing) {
            existing.stock += stock
            existing.expiry = expiry
          } else {
            next.push({
              id: uid(),
              name,
              brand: String(r.brand || r.Brand || ''),
              generic: String(r.generic || r.Generic || ''),
              strength: String(r.strength || r.Strength || ''),
              form: String(r.form || r.Form || 'Tablet'),
              manufacturer: String(r.manufacturer || r.Manufacturer || ''),
              category: String(r.category || r.Category || 'General'),
              hsn: String(r.hsn || r.HSN || '3004'),
              gst: Number(r.gst || r.GST || 12),
              unit: String(r.unit || r.Unit || 'Strip'),
              minStock: Number(r.minStock || r['Min Stock'] || 15),
              stock: Math.max(15, stock),
              expiry,
              purchasePrice: Number(r.purchasePrice || r['Purchase Price'] || 0),
              mrp: Number(r.mrp || r.MRP || 0),
              sellingPrice: Number(
                r.sellingPrice || r['Selling Price'] || r.mrp || 0
              ),
              active: true,
            })
          }
          added++
        })
        setMedicines(next)
        notify(`Imported ${added} medicines successfully!`)
      } catch {
        notify('Failed to parse Excel file. Please use the standard template.')
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  // Patient directory with single search box (Name OR Mobile)
  const filteredPatients = useMemo(() => {
    if (!patientUnifiedQuery.trim()) return patients
    const q = patientUnifiedQuery.toLowerCase().trim()
    return patients.filter(
      (p) => p.name.toLowerCase().includes(q) || p.phone.includes(q)
    )
  }, [patients, patientUnifiedQuery])

  // Get sales history for a specific patient
  const getPatientSales = (patientId: string) => {
    return sales.filter((s) => s.patient.id === patientId)
  }

  // Sales Screen filters
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      // Role filter: If billing operator, only show own sales or counter sales if specified
      if (currentUser?.role === 'billing_operator') {
        // Billing operator sees all counter sales or their own sales
      }
      if (salesDateFilter) {
        const saleDateStr = s.date.slice(0, 10)
        if (saleDateStr !== salesDateFilter) return false
      }
      if (salesSearchQuery.trim()) {
        const q = salesSearchQuery.toLowerCase().trim()
        const matchInvoice = s.invoiceNo.toLowerCase().includes(q)
        const matchName = s.patient.name.toLowerCase().includes(q)
        const matchPhone = s.patient.phone.includes(q)
        if (!matchInvoice && !matchName && !matchPhone) return false
      }
      return true
    })
  }, [sales, salesDateFilter, salesSearchQuery, currentUser])

  const filteredSalesTotal = useMemo(
    () => filteredSales.reduce((a, s) => a + s.total, 0),
    [filteredSales]
  )

  // Medicine catalogue filtered view
  const filteredCatalogue = useMemo(() => {
    return medicines.filter((m) => {
      if (medCategoryFilter !== 'All' && m.category !== medCategoryFilter)
        return false
      if (medCatalogueQuery.trim()) {
        const q = medCatalogueQuery.toLowerCase().trim()
        const matches =
          m.name.toLowerCase().includes(q) ||
          m.brand.toLowerCase().includes(q) ||
          m.generic.toLowerCase().includes(q) ||
          m.manufacturer.toLowerCase().includes(q)
        if (!matches) return false
      }
      return true
    })
  }, [medicines, medCategoryFilter, medCatalogueQuery])

  const categories = useMemo(() => {
    const set = new Set(medicines.map((m) => m.category))
    return ['All', ...Array.from(set)]
  }, [medicines])

  // Overview metrics
  const todaySales = sales.filter((s) => s.date.slice(0, 10) === today())
  const todayTotal = todaySales.reduce((a, s) => a + s.total, 0)
  const totalUnitsInStock = medicines.reduce((a, m) => a + m.stock, 0)

  // Payment Breakdown for Reports
  const paymentBreakdown = useMemo(() => {
    const res = { Cash: 0, UPI: 0, Card: 0 }
    sales.forEach((s) => {
      if (s.payment in res) {
        res[s.payment as keyof typeof res] += s.total
      }
    })
    return res
  }, [sales])

  // Navigation Items according to Role (PRD Section 2.1 Permission Matrix)
  const navItems = useMemo(() => {
    if (!currentUser) return []

    if (currentUser.role === 'billing_operator') {
      return [
        {
          name: 'Billing' as Page,
          label: 'Counter POS (New Bill)',
          icon: ShoppingCart,
          badge: 'Fast POS',
        },
        {
          name: 'Sales' as Page,
          label: 'Counter Invoices & Reprint',
          icon: ReceiptText,
        },
        {
          name: 'Overview' as Page,
          label: 'Today’s Shift Summary',
          icon: LayoutDashboard,
        },
      ]
    }

    // Super Admin navigation
    return [
      { name: 'Overview' as Page, label: 'Admin Dashboard', icon: LayoutDashboard },
      {
        name: 'Billing' as Page,
        label: 'Counter POS',
        icon: ShoppingCart,
        badge: 'POS',
      },
      { name: 'Medicines' as Page, label: 'Medicine Master', icon: Pill },
      {
        name: 'Stock' as Page,
        label: 'Stock & Expiry Register',
        icon: Package,
        alert: expiredMedicines.length > 0 ? `${expiredMedicines.length} Expired` : undefined,
      },
      {
        name: 'Audit' as Page,
        label: 'Stock Movements Audit',
        icon: History,
      },
      {
        name: 'Patients' as Page,
        label: 'Patient Directory & History',
        icon: Users,
      },
      {
        name: 'Sales' as Page,
        label: 'Sales Records & Reports',
        icon: ReceiptText,
      },
    ]
  }, [currentUser, expiredMedicines.length])

  // ==============================================================
  // RENDER: LOGIN SCREEN (SINGLE INPUT WITH AUTO-FILL ROSTER)
  // ==============================================================
  if (!currentUser) {
    return (
      <div className="login-screen-wrapper">
        <div className="login-card-container">
          <div className="login-brand-header">
            <div className="login-logo-circle">
              <Pill size={32} />
            </div>
            <h2>CarePlus Hospital Pharmacy</h2>
            <p>Medical Store Billing System • Role-Based Authentication</p>
          </div>

          {/* Single Input Login Form */}
          <form
            className="single-input-login-form"
            onSubmit={(e) => {
              e.preventDefault()
              handleSingleInputLogin()
            }}
          >
            {loginError && <div className="login-error-alert">{loginError}</div>}

            <div className="form-field">
              <label className="text-sm font-bold text-slate-800">
                Enter Role ID / Access Username
              </label>
              <div className="single-input-wrap">
                <Lock size={18} className="input-lock-icon" />
                <input
                  type="text"
                  autoFocus
                  value={loginInput}
                  onChange={(e) => {
                    setLoginInput(e.target.value)
                    if (loginError) setLoginError('')
                  }}
                  placeholder="Type 'admin' for Admin or 'counter' for Operator..."
                  className="single-login-input"
                  required
                />
                <button type="submit" className="btn-single-submit">
                  <span>Sign In</span>
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
          </form>

          {/* Auto-Fill Roster Section */}
          <div className="login-roster-section">
            <div className="roster-heading">
              <UserCheck size={16} className="text-blue-600" />
              <span>Auto-Fill Accounts Roster (Click to Auto-Fill &amp; Enter):</span>
            </div>

            <div className="roster-grid">
              {/* Roster Item 1: Super Admin */}
              <button
                type="button"
                className="roster-card admin-roster"
                onClick={() => {
                  setLoginInput('admin')
                  handleSingleInputLogin('admin')
                }}
              >
                <div className="roster-card-top">
                  <div className="roster-avatar admin">
                    <Shield size={20} />
                  </div>
                  <div>
                    <b className="roster-name">Super Admin</b>
                    <small className="roster-sub">Full Inventory, Master &amp; Audit</small>
                  </div>
                </div>
                <div className="roster-card-bottom">
                  <span className="roster-code-pill">ID: <code>admin</code></span>
                  <span className="roster-action-pill admin">Auto-Fill &amp; Login &rarr;</span>
                </div>
              </button>

              {/* Roster Item 2: Billing Operator */}
              <button
                type="button"
                className="roster-card counter-roster"
                onClick={() => {
                  setLoginInput('counter')
                  handleSingleInputLogin('counter')
                }}
              >
                <div className="roster-card-top">
                  <div className="roster-avatar counter">
                    <ShoppingCart size={20} />
                  </div>
                  <div>
                    <b className="roster-name">Billing Operator</b>
                    <small className="roster-sub">Counter POS, Billing &amp; Invoices</small>
                  </div>
                </div>
                <div className="roster-card-bottom">
                  <span className="roster-code-pill">ID: <code>counter</code></span>
                  <span className="roster-action-pill counter">Auto-Fill &amp; Login &rarr;</span>
                </div>
              </button>
            </div>
          </div>

          <div className="login-footer-hints">
            <span>Direct Role Access: Type username in the single input box or simply click either roster account above.</span>
          </div>
        </div>
      </div>
    )
  }

  // ==============================================================
  // RENDER: APPLICATION SHELL (LOGGED IN)
  // ==============================================================
  return (
    <div className="app-shell">
      {/* SIDEBAR NAVIGATION */}
      <aside className={`sidebar ${showMobile ? 'mobile-open' : ''}`}>
        <div className="brand-header">
          <div className="brand-logo">
            <Pill size={24} />
          </div>
          <div>
            <b className="brand-title">CarePlus POS</b>
            <span className="brand-subtitle">
              {currentUser.role === 'super_admin'
                ? 'Super Admin Panel'
                : 'Counter Billing Desk'}
            </span>
          </div>
          <button className="mobile-close" onClick={() => setShowMobile(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="nav-group-title">
          {currentUser.role === 'super_admin'
            ? 'ADMINISTRATION MENU'
            : 'COUNTER WORKSPACE'}
        </div>
        <nav className="nav-menu">
          {navItems.map((n) => {
            const Icon = n.icon
            const isActive = page === n.name
            return (
              <button
                key={n.name}
                className={`nav-button ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setPage(n.name)
                  setShowMobile(false)
                }}
              >
                <Icon size={19} className="nav-icon" />
                <span className="nav-text">{n.label}</span>
                {n.badge && <span className="nav-badge pos">{n.badge}</span>}
                {n.alert && <span className="nav-badge danger">{n.alert}</span>}
              </button>
            )
          })}
        </nav>

        {/* Sidebar Footer with Logout (No Role Switching Box) */}
        <div className="sidebar-footer">
          <button className="btn-sidebar-logout" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Logout ({currentUser.username})</span>
          </button>
          <div className="version-tag">CarePlus v2.0 • PRD Compliant</div>
        </div>
      </aside>

      {showMobile && <div className="scrim" onClick={() => setShowMobile(false)} />}

      {/* MAIN VIEWPORT */}
      <main className="main-area">
        {/* TOPBAR */}
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu-button" onClick={() => setShowMobile(true)}>
              <Menu size={22} />
            </button>
            <div className="page-breadcrumb">
              <span>CarePlus Medical</span>
              <ChevronRight size={14} />
              <b>{navItems.find((n) => n.name === page)?.label || page}</b>
            </div>
          </div>

          <div className="topbar-right">
            <div className="date-chip">
              <CalendarDays size={16} />
              <span>
                {new Date().toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>

            {/* Admin Expired Alert (Only for Admin) */}
            {currentUser.role === 'super_admin' && expiredMedicines.length > 0 && (
              <button
                className="admin-alert-pill"
                onClick={() => setPage('Stock')}
                title="Click to inspect expired stock"
              >
                <AlertTriangle size={15} />
                <span>{expiredMedicines.length} Expired in Inventory</span>
              </button>
            )}

            {/* Role indicator pill (kept on top-right) */}
            <div className="user-role-pill">
              <div className="user-role-avatar">
                {currentUser.role === 'super_admin' ? (
                  <Shield size={16} />
                ) : (
                  <UserCheck size={16} />
                )}
              </div>
              <div className="user-role-text">
                <b>{currentUser.name}</b>
                <small>
                  {currentUser.role === 'super_admin'
                    ? 'Super Admin'
                    : 'Billing Operator'}
                </small>
              </div>
            </div>
          </div>
        </header>

        {/* ============================================================== */}
        {/* PAGE 1: BILLING DESK (COUNTER POS - STREAMLINED & FAST) */}
        {/* ============================================================== */}
        {page === 'Billing' && (
          <section className="page-section">
            <div className="page-header">
              <div>
                <span className="eyebrow-tag">
                  {currentUser.role === 'billing_operator'
                    ? 'BILLING COUNTER #1'
                    : 'POINT OF SALE DESK'}
                </span>
                <h1 className="page-title">
                  {currentUser.role === 'billing_operator'
                    ? 'Quick Counter Billing'
                    : 'Counter Billing Desk'}
                </h1>
                <p className="page-desc">
                  Fast search, immediate 1-click cart addition, customer receipt print.
                  Expired medicines are automatically excluded from counter view.
                </p>
              </div>

              <div className="header-chips">
                <span className="badge-available">
                  ✓ {availableCounterMedicines.length} Medicines In-Stock Ready for Sale
                </span>
              </div>
            </div>

            <div className="billing-grid">
              {/* LEFT: Fast Medicine Selection Panel */}
              <div className="card medicine-picker-card">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">Search Medicines</h2>
                    <p className="card-subtitle">
                      Search by Medicine name, brand, salt/generic, or category
                    </p>
                  </div>
                  <span className="count-badge">
                    {filteredCounterMedicines.length} Available
                  </span>
                </div>

                <div className="search-bar-wrap">
                  <div className="prominent-search">
                    <Search size={20} className="search-icon" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Type medicine name or brand (e.g. Dolo, Azee, Pan 40)..."
                      value={counterSearch}
                      onChange={(e) => setCounterSearch(e.target.value)}
                    />
                    {counterSearch && (
                      <button
                        className="clear-search-btn"
                        onClick={() => setCounterSearch('')}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Counter Medicine List (High visibility, Stock shown, No Expiry) */}
                <div className="counter-medicine-list">
                  {filteredCounterMedicines.map((m) => {
                    const cartItem = cart.find((i) => i.medicineId === m.id)
                    const inCartQty = cartItem ? cartItem.qty : 0
                    const remaining = m.stock - inCartQty

                    return (
                      <div className="medicine-row-card" key={m.id}>
                        <div className="medicine-icon-box">
                          <Pill size={22} />
                        </div>

                        <div className="medicine-main-info">
                          <div className="medicine-primary-title">
                            <b>{m.name}</b>
                            <span className="medicine-strength">{m.strength}</span>
                            <span className="medicine-form-tag">{m.form}</span>
                          </div>
                          <div className="medicine-secondary-info">
                            <span>
                              <b>Brand:</b> {m.brand}
                            </span>
                            <span>&bull;</span>
                            <span>
                              <b>Salt:</b> {m.generic}
                            </span>
                          </div>
                          <div className="medicine-stock-status">
                            <span className="stock-pill in-stock">
                              Available Stock: <b>{m.stock} {m.unit}</b>
                            </span>
                            {inCartQty > 0 && (
                              <span className="cart-added-pill">
                                In Cart: <b>{inCartQty}</b> (Left: {remaining})
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="medicine-pricing-box">
                          <span className="selling-rate">
                            {money(m.sellingPrice || m.mrp)}
                          </span>
                          <span className="mrp-strikethrough">MRP {money(m.mrp)}</span>
                        </div>

                        <button
                          className="btn-add-to-cart"
                          onClick={() => addToCart(m)}
                          disabled={remaining <= 0}
                          title={
                            remaining <= 0
                              ? 'All available stock is already in cart'
                              : 'Add to Bill'
                          }
                        >
                          <Plus size={18} />
                          <span>Add</span>
                        </button>
                      </div>
                    )
                  })}

                  {filteredCounterMedicines.length === 0 && (
                    <div className="empty-state-box">
                      <Search size={36} className="empty-icon" />
                      <b>No available medicine matches "{counterSearch}"</b>
                      <p>
                        Only non-expired medicines with stock &gt; 0 appear on the counter.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: Current Bill & Patient Details */}
              <div className="card cart-card">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">Customer Bill</h2>
                    <p className="card-subtitle">
                      {cart.length} medicine line{cart.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  {cart.length > 0 && (
                    <button
                      className="btn-clear-bill"
                      onClick={() => {
                        setCart([])
                        setDiscountAmount(0)
                      }}
                    >
                      Clear Bill
                    </button>
                  )}
                </div>

                {/* PATIENT SELECTION (Mandatory Name & Mobile) */}
                <div className="patient-selection-section">
                  <div className="section-label">
                    <span>CUSTOMER DETAILS</span>
                    <span className="mandatory-star">* Name &amp; Phone Mandatory</span>
                  </div>

                  {!selectedPatient ? (
                    <div className="patient-lookup-wrapper">
                      <div className="patient-input-group">
                        <Search size={16} className="input-icon" />
                        <input
                          type="text"
                          placeholder="Search patient by Name or Mobile No..."
                          value={patientSearchQuery}
                          onChange={(e) => setPatientSearchQuery(e.target.value)}
                        />
                        <button
                          className="btn-quick-add-patient"
                          onClick={() => {
                            setPatientForm({ name: '', phone: '', address: '' })
                            setPatientFormErrors({})
                            setModal('patient')
                          }}
                          title="Add New Patient"
                        >
                          <Plus size={15} />
                          <span>+ New Patient</span>
                        </button>
                      </div>

                      {/* Dropdown Suggestions */}
                      {patientSearchQuery.trim() && (
                        <div className="patient-dropdown-menu">
                          {billingPatientMatches.slice(0, 5).map((p) => (
                            <button
                              key={p.id}
                              className="patient-option-btn"
                              onClick={() => {
                                setSelectedPatient(p)
                                setPatientSearchQuery('')
                              }}
                            >
                              <div className="patient-avatar-letter">
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="patient-info-text">
                                <b>{p.name}</b>
                                <small>
                                  <Phone size={11} /> {p.phone}
                                  {p.address && ` • ${p.address}`}
                                </small>
                              </div>
                              <Check size={16} className="select-check" />
                            </button>
                          ))}

                          {billingPatientMatches.length === 0 && (
                            <div className="no-patient-found">
                              <span>No patient found for "{patientSearchQuery}".</span>
                              <button
                                className="btn-create-now"
                                onClick={() => {
                                  setPatientForm({
                                    name: patientSearchQuery.trim(),
                                    phone: '',
                                    address: '',
                                  })
                                  setPatientFormErrors({})
                                  setModal('patient')
                                }}
                              >
                                + Add "{patientSearchQuery}" as New Patient
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="selected-patient-card">
                      <div className="selected-avatar">
                        <User size={18} />
                      </div>
                      <div className="selected-info">
                        <b>{selectedPatient.name}</b>
                        <small>
                          <Phone size={12} /> {selectedPatient.phone}
                          {selectedPatient.address && ` | ${selectedPatient.address}`}
                        </small>
                      </div>
                      <button
                        className="btn-change-patient"
                        onClick={() => setSelectedPatient(null)}
                        title="Change Patient"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {/* CART ITEMS LIST */}
                <div className="cart-items-container">
                  {cart.length === 0 ? (
                    <div className="empty-cart-box">
                      <ShoppingCart size={36} className="empty-cart-icon" />
                      <b>Bill is Empty</b>
                      <span>Click "+ Add" on any medicine to add it here.</span>
                    </div>
                  ) : (
                    cart.map((item, idx) => (
                      <div className="cart-item-row" key={item.medicineId}>
                        <div className="cart-item-header">
                          <div>
                            <b className="cart-item-name">{item.medicineName}</b>
                            <span className="cart-item-strength">{item.strength}</span>
                          </div>
                          <button
                            className="btn-remove-item"
                            onClick={() => changeCartQty(idx, 0)}
                            title="Remove item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="cart-item-controls">
                          <div className="qty-picker">
                            <button
                              onClick={() => changeCartQty(idx, item.qty - 1)}
                              title="Decrease"
                            >
                              -
                            </button>
                            <span className="qty-value">{item.qty}</span>
                            <button
                              onClick={() => changeCartQty(idx, item.qty + 1)}
                              title="Increase"
                            >
                              +
                            </button>
                          </div>
                          <span className="unit-name">{item.unit}</span>

                          <div className="cart-item-math">
                            <span className="rate-text">
                              {money(item.price)} × {item.qty}
                            </span>
                            <b className="line-total-text">
                              {money(item.price * item.qty)}
                            </b>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* BILL TOTALS & PRINT CONTROLS */}
                <div className="bill-summary-block">
                  <div className="summary-line-item">
                    <span>Subtotal:</span>
                    <b>{money(subtotal)}</b>
                  </div>

                  <div className="summary-line-item discount-item">
                    <span>Discount (₹):</span>
                    <input
                      type="number"
                      min="0"
                      max={subtotal}
                      value={discountAmount || ''}
                      placeholder="0.00"
                      onChange={(e) =>
                        setDiscountAmount(
                          Math.max(0, Math.min(subtotal, Number(e.target.value) || 0))
                        )
                      }
                    />
                  </div>

                  <div className="summary-line-item">
                    <span>GST (Calculated):</span>
                    <b>{money(estimatedTax)}</b>
                  </div>

                  <div className="summary-grand-total">
                    <span>Grand Total:</span>
                    <b>{money(grandTotal)}</b>
                  </div>

                  {/* Payment Mode Pills */}
                  <div className="payment-options-row">
                    <span className="payment-label">Payment Method:</span>
                    <div className="payment-pills">
                      {['Cash', 'UPI', 'Card'].map((mode) => (
                        <button
                          key={mode}
                          className={`payment-pill ${
                            paymentMode === mode ? 'active' : ''
                          }`}
                          onClick={() => setPaymentMode(mode)}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Invoice Format Toggle */}
                  <div className="format-selection-row">
                    <span>Print Format:</span>
                    <select
                      value={invoiceFormat}
                      onChange={(e) =>
                        setInvoiceFormat(e.target.value as '80mm' | 'A4')
                      }
                    >
                      <option value="A4">Standard A4 Tax Invoice (Full Page Fit)</option>
                      <option value="80mm">80mm Thermal Receipt (POS Roll)</option>
                    </select>
                  </div>

                  <button
                    className="btn-complete-checkout"
                    onClick={finishBill}
                    disabled={cart.length === 0 || !selectedPatient}
                  >
                    <Printer size={18} />
                    <span>Generate &amp; Print Bill</span>
                    <b className="checkout-total">{money(grandTotal)}</b>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* PAGE 2: DASHBOARD OVERVIEW */}
        {/* ============================================================== */}
        {page === 'Overview' && (
          <section className="page-section">
            <div className="page-header">
              <div>
                <span className="eyebrow-tag">
                  {currentUser.role === 'super_admin'
                    ? 'EXECUTIVE OVERVIEW'
                    : 'COUNTER SHIFT SUMMARY'}
                </span>
                <h1 className="page-title">
                  {currentUser.role === 'super_admin'
                    ? 'Hospital Pharmacy Dashboard'
                    : "Today's Counter Summary"}
                </h1>
                <p className="page-desc">
                  Real-time sales, billing count, active inventory and operational status.
                </p>
              </div>
              <button className="btn-primary" onClick={() => setPage('Billing')}>
                <Plus size={18} />
                <span>+ Create New Bill</span>
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="metrics-grid">
              <div className="metric-card blue-tone">
                <div className="metric-icon-wrap">
                  <CircleDollarSign size={24} />
                </div>
                <div className="metric-content">
                  <span className="metric-label">Today's Revenue</span>
                  <b className="metric-val">{money(todayTotal)}</b>
                  <small className="metric-note">{todaySales.length} bills completed today</small>
                </div>
              </div>

              <div className="metric-card emerald-tone">
                <div className="metric-icon-wrap">
                  <PackageCheck size={24} />
                </div>
                <div className="metric-content">
                  <span className="metric-label">Medicines on Counter</span>
                  <b className="metric-val">{availableCounterMedicines.length}</b>
                  <small className="metric-note">Available for immediate sale</small>
                </div>
              </div>

              {currentUser.role === 'super_admin' ? (
                <>
                  <div className="metric-card amber-tone">
                    <div className="metric-icon-wrap">
                      <AlertTriangle size={24} />
                    </div>
                    <div className="metric-content">
                      <span className="metric-label">Low Stock Attention</span>
                      <b className="metric-val">{lowStockMedicines.length}</b>
                      <small className="metric-note">Under min. threshold</small>
                    </div>
                  </div>

                  <div className="metric-card rose-tone">
                    <div className="metric-icon-wrap">
                      <PackageX size={24} />
                    </div>
                    <div className="metric-content">
                      <span className="metric-label">Expired Stock</span>
                      <b className="metric-val">{expiredMedicines.length}</b>
                      <small className="metric-note">Hidden from counter sale</small>
                    </div>
                  </div>
                </>
              ) : (
                <div className="metric-card violet-tone">
                  <div className="metric-icon-wrap">
                    <ReceiptText size={24} />
                  </div>
                  <div className="metric-content">
                    <span className="metric-label">Total Bills Recorded</span>
                    <b className="metric-val">{sales.length}</b>
                    <small className="metric-note">In system record</small>
                  </div>
                </div>
              )}
            </div>

            {/* Super Admin Alert Banner for Expired Stock */}
            {currentUser.role === 'super_admin' && expiredMedicines.length > 0 && (
              <div className="admin-alert-banner">
                <div className="banner-icon">
                  <ShieldAlert size={28} />
                </div>
                <div className="banner-body">
                  <b>ADMIN ALERT: {expiredMedicines.length} Expired Medicines In Inventory</b>
                  <p>
                    These expired items are automatically blocked and hidden from counter billing.
                    Review them in the Stock Register to write off or return to supplier.
                  </p>
                </div>
                <button
                  className="btn-banner-action"
                  onClick={() => setPage('Stock')}
                >
                  Manage Expired Stock <ArrowRight size={16} />
                </button>
              </div>
            )}

            {/* Dashboard Two-Column Layout */}
            <div className="dashboard-columns">
              <div className="card">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">Recent Transactions</h2>
                    <p className="card-subtitle">Last 5 completed customer invoices</p>
                  </div>
                  <button className="link-button" onClick={() => setPage('Sales')}>
                    View All Sales
                  </button>
                </div>

                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Invoice #</th>
                        <th>Patient</th>
                        <th>Date &amp; Time</th>
                        <th>Payment</th>
                        <th>Amount</th>
                        <th>Print</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.slice(0, 5).map((s) => (
                        <tr key={s.id}>
                          <td>
                            <b className="invoice-tag">{s.invoiceNo}</b>
                          </td>
                          <td>
                            <b>{s.patient.name}</b>
                            <small className="sub-phone">{s.patient.phone}</small>
                          </td>
                          <td>
                            {new Date(s.date).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </td>
                          <td>
                            <span className="badge-payment">{s.payment}</span>
                          </td>
                          <td>
                            <b className="amount-bold">{money(s.total)}</b>
                          </td>
                          <td>
                            <button
                              className="btn-table-action"
                              title="Print A4 Invoice"
                              onClick={() => printSaleInvoice(s, 'A4')}
                            >
                              <Printer size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quick Attention or Shift Status */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">
                      {currentUser.role === 'super_admin'
                        ? 'Inventory Attention'
                        : 'Current Shift Info'}
                    </h2>
                    <p className="card-subtitle">
                      {currentUser.role === 'super_admin'
                        ? 'Items requiring admin action'
                        : 'Active desk details'}
                    </p>
                  </div>
                </div>

                {currentUser.role === 'super_admin' ? (
                  <div className="attention-list">
                    {expiredMedicines.slice(0, 3).map((m) => (
                      <div className="attention-item danger" key={m.id}>
                        <div className="item-icon-box danger">
                          <PackageX size={18} />
                        </div>
                        <div className="item-text">
                          <b>{m.name}</b>
                          <small>
                            Expired on: <b>{m.expiry}</b> • Stock: {m.stock} {m.unit}
                          </small>
                        </div>
                        <span className="badge-status-danger">EXPIRED</span>
                      </div>
                    ))}

                    {lowStockMedicines.slice(0, 3).map((m) => (
                      <div className="attention-item warning" key={m.id}>
                        <div className="item-icon-box warning">
                          <AlertTriangle size={18} />
                        </div>
                        <div className="item-text">
                          <b>{m.name}</b>
                          <small>
                            In Stock: <b>{m.stock} {m.unit}</b> (Min: {m.minStock})
                          </small>
                        </div>
                        <span className="badge-status-warning">LOW STOCK</span>
                      </div>
                    ))}

                    {expiredMedicines.length === 0 && lowStockMedicines.length === 0 && (
                      <div className="empty-attention">
                        <Check size={24} className="text-emerald-500" />
                        <span>All inventory levels are healthy!</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-5 space-y-3 text-sm">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-slate-500">Billing Counter:</span>
                      <b className="text-slate-800">Pharmacy Counter #1</b>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-slate-500">Logged Operator:</span>
                      <b className="text-slate-800">{currentUser.name}</b>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-slate-500">Default Print Format:</span>
                      <b className="text-blue-600">A4 Tax Invoice (Full Fit)</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Today's Shift Sales:</span>
                      <b className="text-emerald-700 font-mono text-base">{money(todayTotal)}</b>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* PAGE 3: MEDICINE MASTER (SUPER ADMIN ONLY) */}
        {/* ============================================================== */}
        {page === 'Medicines' && currentUser.role === 'super_admin' && (
          <section className="page-section">
            <div className="page-header">
              <div>
                <span className="eyebrow-tag">ADMIN CATALOGUE</span>
                <h1 className="page-title">Medicine Master Management</h1>
                <p className="page-desc">
                  Maintain medicine records, pricing, GST rates, and bulk Excel upload.
                </p>
              </div>
              <div className="header-actions-group">
                <button className="btn-secondary" onClick={downloadTemplate}>
                  <Download size={16} />
                  <span>Download Excel Template</span>
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => fileRef.current?.click()}
                >
                  <FileSpreadsheet size={16} />
                  <span>Upload Excel</span>
                </button>
                <input
                  ref={fileRef}
                  hidden
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleImport}
                />
                <button
                  className="btn-primary"
                  onClick={() => {
                    setEditingMedicine(null)
                    setMedicineForm({
                      name: '',
                      brand: '',
                      generic: '',
                      strength: '',
                      form: 'Tablet',
                      manufacturer: '',
                      category: 'General',
                      hsn: '3004',
                      gst: 12,
                      unit: 'Strip',
                      minStock: 15,
                      stock: 50,
                      expiry: '',
                      purchasePrice: 0,
                      mrp: 0,
                      sellingPrice: 0,
                    })
                    setModal('medicine')
                  }}
                >
                  <Plus size={18} />
                  <span>Add Medicine</span>
                </button>
              </div>
            </div>

            <div className="card">
              <div className="catalogue-filters-bar">
                <div className="search-bar-wrap compact">
                  <Search size={18} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search medicine master by name, brand, generic, salt..."
                    value={medCatalogueQuery}
                    onChange={(e) => setMedCatalogueQuery(e.target.value)}
                  />
                  {medCatalogueQuery && (
                    <button
                      className="clear-search-btn"
                      onClick={() => setMedCatalogueQuery('')}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="category-filter-wrap">
                  <Filter size={16} className="text-slate-500" />
                  <select
                    value={medCategoryFilter}
                    onChange={(e) => setMedCategoryFilter(e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        Category: {c}
                      </option>
                    ))}
                  </select>
                </div>

                <span className="count-badge">
                  {filteredCatalogue.length} Medicines Listed
                </span>
              </div>

              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Medicine Name</th>
                      <th>Brand / Generic</th>
                      <th>Category &amp; Form</th>
                      <th>HSN</th>
                      <th>GST</th>
                      <th>Selling Rate</th>
                      <th>Stock Qty</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCatalogue.map((m) => {
                      const expired = isExpired(m.expiry)
                      const low = m.stock <= m.minStock
                      return (
                        <tr key={m.id}>
                          <td>
                            <b>{m.name}</b>
                            <small className="sub-phone">{m.strength}</small>
                          </td>
                          <td>
                            <b>{m.brand}</b>
                            <small className="sub-phone">{m.generic}</small>
                          </td>
                          <td>
                            <span>{m.category}</span>
                            <small className="sub-phone">{m.form}</small>
                          </td>
                          <td>
                            <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                              {m.hsn}
                            </code>
                          </td>
                          <td>{m.gst}%</td>
                          <td>
                            <b>{money(m.sellingPrice || m.mrp)}</b>
                          </td>
                          <td>
                            <span
                              className={`stock-pill ${
                                expired
                                  ? 'badge-status-danger'
                                  : low
                                  ? 'badge-status-warning'
                                  : 'badge-status-good'
                              }`}
                            >
                              {m.stock} {m.unit}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn-edit-stock"
                              onClick={() => editMedicine(m)}
                              title="Edit Master Details"
                            >
                              <Edit3 size={15} />
                              <span>Edit</span>
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* PAGE 4: STOCK & EXPIRY REGISTER (SUPER ADMIN ONLY) */}
        {/* ============================================================== */}
        {page === 'Stock' && currentUser.role === 'super_admin' && (
          <section className="page-section">
            <div className="page-header">
              <div>
                <span className="eyebrow-tag">INVENTORY &amp; EXPIRY</span>
                <h1 className="page-title">Stock &amp; Expiry Register</h1>
                <p className="page-desc">
                  Expiry tracking is visible only to Admin here. Perform authorized stock
                  adjustments with recorded audit reason.
                </p>
              </div>
            </div>

            {/* DEDICATED ADMIN EXPIRED MEDICINES PANEL */}
            <div className="card admin-expiry-card">
              <div className="card-header border-b">
                <div className="flex-title-with-badge">
                  <div className="header-icon-danger">
                    <ShieldAlert size={22} />
                  </div>
                  <div>
                    <h2 className="card-title text-red-700">
                      Expired Stock Alert ({expiredMedicines.length} Items Detected)
                    </h2>
                    <p className="card-subtitle">
                      Automatically blocked from counter billing • Cannot be sold
                    </p>
                  </div>
                </div>
                <span className="badge-danger-bold">Admin Notice</span>
              </div>

              {expiredMedicines.length > 0 ? (
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr className="bg-red-50">
                        <th>Medicine</th>
                        <th>Category</th>
                        <th>Expiry Date</th>
                        <th>Expired Quantity</th>
                        <th>Purchase Value</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiredMedicines.map((m) => (
                        <tr key={m.id} className="row-expired-highlight">
                          <td>
                            <b className="text-red-900">{m.name}</b>
                            <small className="sub-phone">{m.generic} &bull; {m.strength}</small>
                          </td>
                          <td>{m.category}</td>
                          <td>
                            <span className="badge-status-danger font-mono font-bold">
                              {m.expiry}
                            </span>
                          </td>
                          <td>
                            <b className="font-bold text-red-700">
                              {m.stock} {m.unit}
                            </b>
                          </td>
                          <td>{money(m.purchasePrice * m.stock)}</td>
                          <td>
                            <button
                              className="btn-edit-stock"
                              onClick={() => {
                                setAdjustingMedicine(m)
                                setAdjustmentForm({
                                  type: 'reduce',
                                  qty: m.stock,
                                  reason: 'Expired stock write-off & disposal',
                                })
                                setModal('stockAdjustment')
                              }}
                            >
                              <PackageX size={15} />
                              <span>Write-off Expired</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-emerald-700 font-semibold flex items-center justify-center gap-2">
                  <Check size={20} />
                  <span>No expired medicines currently in stock!</span>
                </div>
              )}
            </div>

            {/* FULL STOCK OVERVIEW WITH ADJUST STOCK ACTION */}
            <div className="card mt-6">
              <div className="card-header">
                <div>
                  <h2 className="card-title">All Medicine Stock Levels</h2>
                  <p className="card-subtitle">
                    Live available quantities, expiry dates &amp; adjustment actions
                  </p>
                </div>
                <span className="count-badge">{medicines.length} Total Registered</span>
              </div>

              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Medicine</th>
                      <th>Dosage Form</th>
                      <th>Current Stock</th>
                      <th>Expiry Date (Admin)</th>
                      <th>MRP</th>
                      <th>Selling Price</th>
                      <th>Status</th>
                      <th>Stock Adjustment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medicines.map((m) => {
                      const expired = isExpired(m.expiry)
                      const low = m.stock <= m.minStock

                      return (
                        <tr key={m.id} className={expired ? 'bg-red-50/50' : ''}>
                          <td>
                            <b>{m.name}</b>
                            <small className="sub-phone">
                              {m.brand} • {m.strength}
                            </small>
                          </td>
                          <td>{m.form}</td>
                          <td>
                            <b
                              className={`stock-number-bold ${
                                m.stock === 0
                                  ? 'text-gray-400'
                                  : low
                                  ? 'text-amber-600'
                                  : 'text-emerald-700'
                              }`}
                            >
                              {m.stock} {m.unit}
                            </b>
                          </td>
                          <td>
                            <span
                              className={`font-mono ${
                                expired
                                  ? 'badge-status-danger'
                                  : isNearExpiry(m.expiry)
                                  ? 'badge-status-warning'
                                  : 'text-slate-700'
                              }`}
                            >
                              {m.expiry}
                            </span>
                          </td>
                          <td>{money(m.mrp)}</td>
                          <td>
                            <b className="text-slate-900">{money(m.sellingPrice)}</b>
                          </td>
                          <td>
                            {expired ? (
                              <span className="badge-status-danger">EXPIRED</span>
                            ) : low ? (
                              <span className="badge-status-warning">LOW STOCK</span>
                            ) : (
                              <span className="badge-status-good">HEALTHY</span>
                            )}
                          </td>
                          <td>
                            <button
                              className="btn-edit-stock"
                              onClick={() => {
                                setAdjustingMedicine(m)
                                setAdjustmentForm({
                                  type: 'add',
                                  qty: 10,
                                  reason: '',
                                })
                                setModal('stockAdjustment')
                              }}
                            >
                              <SlidersHorizontal size={14} />
                              <span>Adjust Stock</span>
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* PAGE 5: STOCK MOVEMENTS AUDIT TRAIL (SUPER ADMIN ONLY) */}
        {/* ============================================================== */}
        {page === 'Audit' && currentUser.role === 'super_admin' && (
          <section className="page-section">
            <div className="page-header">
              <div>
                <span className="eyebrow-tag">AUDIT TRAIL (PRD 3.5)</span>
                <h1 className="page-title">Stock Movements &amp; History</h1>
                <p className="page-desc">
                  Traceable audit records for every unit received, sold, or adjusted with timestamp,
                  user, and reason.
                </p>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Recorded Stock Movements</h2>
                  <p className="card-subtitle">
                    Previous quantity, adjustment, resulting quantity, user, and reason
                  </p>
                </div>
                <span className="count-badge">
                  {stockMovements.length} Audit Records
                </span>
              </div>

              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Date &amp; Time</th>
                      <th>Medicine Name</th>
                      <th>Type</th>
                      <th>Previous Qty</th>
                      <th>Change</th>
                      <th>New Qty</th>
                      <th>Reason / Note</th>
                      <th>User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockMovements.map((sm) => (
                      <tr key={sm.id}>
                        <td>
                          <div className="font-medium text-slate-800">
                            {new Date(sm.date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                          <small className="text-slate-500 font-mono">
                            {new Date(sm.date).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </small>
                        </td>
                        <td>
                          <b>{sm.medicineName}</b>
                        </td>
                        <td>
                          <span
                            className={`badge-payment ${
                              sm.type === 'sale'
                                ? 'bg-blue-50 text-blue-700'
                                : sm.type === 'restock'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {sm.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="font-mono text-center">{sm.prevQty}</td>
                        <td className="font-mono font-bold text-center">
                          <span
                            className={
                              sm.changeQty > 0
                                ? 'text-emerald-600'
                                : 'text-red-600'
                            }
                          >
                            {sm.changeQty > 0 ? `+${sm.changeQty}` : sm.changeQty}
                          </span>
                        </td>
                        <td className="font-mono font-bold text-center text-slate-900">
                          {sm.newQty}
                        </td>
                        <td>
                          <span className="text-slate-700 text-xs font-medium">
                            {sm.reason}
                          </span>
                        </td>
                        <td>
                          <span className="text-xs text-slate-600">{sm.user}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* PAGE 6: PATIENT DIRECTORY & PURCHASE HISTORY (SUPER ADMIN) */}
        {/* ============================================================== */}
        {page === 'Patients' && currentUser.role === 'super_admin' && (
          <section className="page-section">
            <div className="page-header">
              <div>
                <span className="eyebrow-tag">CUSTOMER DIRECTORY</span>
                <h1 className="page-title">Patient Records &amp; History</h1>
                <p className="page-desc">
                  Unified search by Name OR Mobile Number. Click any patient to view their full
                  medicines purchase history.
                </p>
              </div>
              <button
                className="btn-primary"
                onClick={() => {
                  setPatientForm({ name: '', phone: '', address: '' })
                  setPatientFormErrors({})
                  setModal('patient')
                }}
              >
                <Plus size={18} />
                <span>+ Add Patient</span>
              </button>
            </div>

            <div className="card">
              <div className="catalogue-filters-bar">
                <div className="search-bar-wrap unified-search-patient">
                  <Search size={18} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search by Patient Name OR Mobile Number (e.g. Rahul or 9876543210)..."
                    value={patientUnifiedQuery}
                    onChange={(e) => setPatientUnifiedQuery(e.target.value)}
                  />
                  {patientUnifiedQuery && (
                    <button
                      className="clear-search-btn"
                      onClick={() => setPatientUnifiedQuery('')}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <span className="count-badge">
                  {filteredPatients.length} Patients Registered
                </span>
              </div>

              <div className="table-responsive">
                <table className="custom-table interactive-table">
                  <thead>
                    <tr>
                      <th>Patient Name</th>
                      <th>Mobile Number</th>
                      <th>Address</th>
                      <th>Total Invoices</th>
                      <th>Total Spent</th>
                      <th>Last Purchase</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.map((p) => {
                      const pSales = getPatientSales(p.id)
                      const totalSpent = pSales.reduce((a, s) => a + s.total, 0)
                      const lastSale = pSales[0]

                      return (
                        <tr
                          key={p.id}
                          onClick={() => {
                            setSelectedPatientForHistory(p)
                            setModal('patientHistory')
                          }}
                          className="clickable-patient-row"
                        >
                          <td>
                            <div className="patient-table-cell">
                              <div className="patient-avatar-letter">
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <b className="patient-name-link">{p.name}</b>
                                <small className="text-slate-500">ID: #{p.id}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-1.5 font-mono text-slate-800 font-bold">
                              <Phone size={14} className="text-blue-600" />
                              <span>{p.phone}</span>
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-1.5 text-slate-600 max-w-xs truncate">
                              <MapPin size={14} className="text-slate-400 flex-shrink-0" />
                              <span>{p.address || 'Local Walk-in'}</span>
                            </div>
                          </td>
                          <td>
                            <span className="badge-visit-count">
                              {pSales.length} Bill{pSales.length === 1 ? '' : 's'}
                            </span>
                          </td>
                          <td>
                            <b className="text-slate-900 font-bold">{money(totalSpent)}</b>
                          </td>
                          <td>
                            {lastSale ? (
                              <span className="text-slate-700 text-xs">
                                {new Date(lastSale.date).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td>
                            <button
                              className="btn-view-history"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedPatientForHistory(p)
                                setModal('patientHistory')
                              }}
                            >
                              <History size={15} />
                              <span>View History</span>
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* PAGE 7: SALES RECORDS & BASIC REPORTS */}
        {/* ============================================================== */}
        {page === 'Sales' && (
          <section className="page-section">
            <div className="page-header">
              <div>
                <span className="eyebrow-tag">
                  {currentUser.role === 'super_admin'
                    ? 'AUDIT & REPORTS'
                    : 'COUNTER SALES INVOICES'}
                </span>
                <h1 className="page-title">
                  {currentUser.role === 'super_admin'
                    ? 'Sales Records & Basic Reports'
                    : 'Sales Invoices & Reprint'}
                </h1>
                <p className="page-desc">
                  Filter by specific date, search by patient name/mobile or invoice number.
                  Reprint A4 or 80mm invoices anytime.
                </p>
              </div>
              <button className="btn-primary" onClick={() => setPage('Billing')}>
                <Plus size={18} />
                <span>+ Create New Bill</span>
              </button>
            </div>

            {/* Basic Reports Card for Super Admin (PRD Section 3.7) */}
            {currentUser.role === 'super_admin' && (
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="card p-4">
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    Payment Method Totals
                  </span>
                  <div className="mt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        Cash:
                      </span>
                      <b className="font-mono">{money(paymentBreakdown.Cash)}</b>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        UPI:
                      </span>
                      <b className="font-mono">{money(paymentBreakdown.UPI)}</b>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                        Card:
                      </span>
                      <b className="font-mono">{money(paymentBreakdown.Card)}</b>
                    </div>
                  </div>
                </div>

                <div className="card p-4">
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    Sales Velocity
                  </span>
                  <div className="mt-3 space-y-1">
                    <div className="text-2xl font-bold font-mono text-slate-900">
                      {money(todayTotal)}
                    </div>
                    <small className="text-slate-500 block">
                      Today's generated sales across {todaySales.length} invoices
                    </small>
                    <div className="text-xs text-emerald-600 font-bold mt-2">
                      Avg. Bill Value: {todaySales.length ? money(todayTotal / todaySales.length) : '₹0.00'}
                    </div>
                  </div>
                </div>

                <div className="card p-4">
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    Print Compatibility
                  </span>
                  <div className="mt-3 space-y-1 text-sm text-slate-700">
                    <div>✓ A4 Tax Invoice (Full Page Fit)</div>
                    <div>✓ 80mm POS Thermal Receipt</div>
                    <small className="text-slate-500 block mt-1">
                      Both formats comply with GST memo regulations.
                    </small>
                  </div>
                </div>
              </div>
            )}

            <div className="card">
              {/* Sales Filters Toolbar: Date picker + Search */}
              <div className="sales-filter-toolbar">
                <div className="date-filter-control">
                  <Calendar size={17} className="text-blue-600" />
                  <span className="filter-label">Date Filter:</span>
                  <input
                    type="date"
                    value={salesDateFilter}
                    onChange={(e) => setSalesDateFilter(e.target.value)}
                  />
                  {salesDateFilter && (
                    <button
                      className="btn-clear-date"
                      onClick={() => setSalesDateFilter('')}
                      title="Clear Date Filter"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    className={`btn-quick-date ${
                      salesDateFilter === today() ? 'active' : ''
                    }`}
                    onClick={() => setSalesDateFilter(today())}
                  >
                    Today
                  </button>
                </div>

                <div className="sales-search-box">
                  <Search size={18} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search by Patient Name, Mobile or Invoice #..."
                    value={salesSearchQuery}
                    onChange={(e) => setSalesSearchQuery(e.target.value)}
                  />
                  {salesSearchQuery && (
                    <button
                      className="clear-search-btn"
                      onClick={() => setSalesSearchQuery('')}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="filtered-sales-summary">
                  <span>Filtered Total:</span>
                  <b>{money(filteredSalesTotal)}</b>
                  <small>({filteredSales.length} bills)</small>
                </div>
              </div>

              {/* Invoices Table */}
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Date &amp; Time</th>
                      <th>Patient Name &amp; Contact</th>
                      <th>Items Sold</th>
                      <th>Payment</th>
                      <th>Grand Total</th>
                      <th>Print Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <b className="invoice-tag">{s.invoiceNo}</b>
                        </td>
                        <td>
                          <div className="text-slate-800 font-medium">
                            {new Date(s.date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                          <small className="text-slate-500 font-mono">
                            {new Date(s.date).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </small>
                        </td>
                        <td>
                          <b>{s.patient.name}</b>
                          <small className="sub-phone">
                            <Phone size={11} className="inline mr-1" />
                            {s.patient.phone}
                          </small>
                        </td>
                        <td>
                          <div className="items-summary-cell">
                            {s.items.map((it) => (
                              <span className="item-pill-small" key={it.medicineId}>
                                {it.medicineName} (x{it.qty})
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span className="badge-payment">{s.payment}</span>
                        </td>
                        <td>
                          <b className="amount-bold text-slate-900">{money(s.total)}</b>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <button
                              className="btn-table-action"
                              title="Print A4 Invoice (Full Page Fit)"
                              onClick={() => printSaleInvoice(s, 'A4')}
                            >
                              <FileText size={15} />
                            </button>
                            <button
                              className="btn-table-action"
                              title="Print 80mm Slip"
                              onClick={() => printSaleInvoice(s, '80mm')}
                            >
                              <Printer size={15} />
                            </button>
                            <button
                              className="btn-table-action"
                              title="View Invoice Breakdown"
                              onClick={() => {
                                setSelectedSaleForView(s)
                                setModal('saleDetail')
                              }}
                            >
                              <Eye size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredSales.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-slate-500">
                          No sales records found matching the selected filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL 1: ADD PATIENT (STRICTLY NAME, PHONE, ADDRESS) */}
      {/* ============================================================== */}
      {modal === 'patient' && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null)
          }}
        >
          <div className="modal-dialog max-w-lg">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Add Patient</h2>
                <p className="modal-subtitle">
                  Name and Mobile Number are strictly mandatory.
                </p>
              </div>
              <button className="btn-modal-close" onClick={() => setModal(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-form-body">
              <div className="form-field">
                <label>
                  Patient Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="Enter full name of patient"
                  value={patientForm.name}
                  onChange={(e) => {
                    setPatientForm({ ...patientForm, name: e.target.value })
                    if (patientFormErrors.name) setPatientFormErrors({})
                  }}
                  className={patientFormErrors.name ? 'input-error' : ''}
                />
                {patientFormErrors.name && (
                  <span className="field-error-msg">{patientFormErrors.name}</span>
                )}
              </div>

              <div className="form-field">
                <label>
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="10-digit mobile number (e.g. 9876543210)"
                  value={patientForm.phone}
                  onChange={(e) => {
                    setPatientForm({
                      ...patientForm,
                      phone: e.target.value.replace(/\D/g, ''),
                    })
                    if (patientFormErrors.phone) setPatientFormErrors({})
                  }}
                  className={patientFormErrors.phone ? 'input-error' : ''}
                />
                {patientFormErrors.phone && (
                  <span className="field-error-msg">{patientFormErrors.phone}</span>
                )}
              </div>

              <div className="form-field">
                <label>Address (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="House/Street/Area, City"
                  value={patientForm.address}
                  onChange={(e) =>
                    setPatientForm({ ...patientForm, address: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={savePatient}>
                <Check size={16} />
                <span>Save Patient</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: PATIENT FULL PURCHASE HISTORY */}
      {/* ============================================================== */}
      {modal === 'patientHistory' && selectedPatientForHistory && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null)
          }}
        >
          <div className="modal-dialog max-w-3xl">
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="patient-avatar-large">
                  {selectedPatientForHistory.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="modal-title">{selectedPatientForHistory.name}</h2>
                  <p className="modal-subtitle">
                    <Phone size={13} className="inline mr-1" />
                    {selectedPatientForHistory.phone}
                    {selectedPatientForHistory.address &&
                      ` • ${selectedPatientForHistory.address}`}
                  </p>
                </div>
              </div>
              <button className="btn-modal-close" onClick={() => setModal(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-scroll-body">
              {(() => {
                const pSales = getPatientSales(selectedPatientForHistory.id)
                const totalSpent = pSales.reduce((a, s) => a + s.total, 0)
                const totalMedsCount = pSales.reduce(
                  (a, s) => a + s.items.reduce((b, it) => b + it.qty, 0),
                  0
                )

                return (
                  <div>
                    <div className="patient-stats-strip">
                      <div className="stat-item">
                        <span>Total Invoices</span>
                        <b>{pSales.length}</b>
                      </div>
                      <div className="stat-item">
                        <span>Total Spent</span>
                        <b className="text-blue-600">{money(totalSpent)}</b>
                      </div>
                      <div className="stat-item">
                        <span>Medicines Purchased</span>
                        <b>{totalMedsCount} units</b>
                      </div>
                    </div>

                    <h3 className="section-divider-title">
                      Patient Purchase History (Visits &amp; Medicines Taken)
                    </h3>

                    {pSales.length === 0 ? (
                      <div className="p-8 text-center text-slate-500">
                        No purchase records found yet for this patient.
                      </div>
                    ) : (
                      <div className="history-timeline">
                        {pSales.map((sale) => (
                          <div className="history-bill-card" key={sale.id}>
                            <div className="history-bill-head">
                              <div>
                                <b className="invoice-tag">{sale.invoiceNo}</b>
                                <span className="history-date">
                                  <Clock size={13} className="inline mr-1" />
                                  {new Date(sale.date).toLocaleString('en-IN', {
                                    dateStyle: 'full',
                                    timeStyle: 'short',
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="badge-payment">{sale.payment}</span>
                                <b className="history-bill-total">{money(sale.total)}</b>
                                <button
                                  className="btn-table-action"
                                  onClick={() => printSaleInvoice(sale, 'A4')}
                                  title="Reprint A4 Bill"
                                >
                                  <Printer size={15} />
                                </button>
                              </div>
                            </div>

                            <div className="history-items-table">
                              <table>
                                <thead>
                                  <tr>
                                    <th>Medicine Name</th>
                                    <th>Strength</th>
                                    <th>Quantity</th>
                                    <th>Rate</th>
                                    <th className="text-right">Line Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sale.items.map((it, idx) => (
                                    <tr key={idx}>
                                      <td>
                                        <b>{it.medicineName}</b>
                                      </td>
                                      <td>{it.strength}</td>
                                      <td>
                                        <b className="text-blue-700">
                                          {it.qty} {it.unit}
                                        </b>
                                      </td>
                                      <td>{money(it.price)}</td>
                                      <td className="text-right">
                                        <b>{money(it.qty * it.price)}</b>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: STOCK ADJUSTMENT WITH MANDATORY REASON (PRD 3.5 & 6.3) */}
      {/* ============================================================== */}
      {modal === 'stockAdjustment' && adjustingMedicine && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null)
          }}
        >
          <div className="modal-dialog max-w-lg">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Authorized Stock Adjustment</h2>
                <p className="modal-subtitle">
                  {adjustingMedicine.name} ({adjustingMedicine.strength})
                </p>
              </div>
              <button className="btn-modal-close" onClick={() => setModal(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-form-body space-y-4">
              <div className="p-3 bg-slate-50 border rounded-lg flex justify-between items-center text-sm">
                <span>Current Recorded Stock:</span>
                <b className="text-lg font-mono text-slate-900">
                  {adjustingMedicine.stock} {adjustingMedicine.unit}
                </b>
              </div>

              <div className="form-field">
                <label>Adjustment Direction</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className={`h-10 rounded-lg border font-bold text-sm ${
                      adjustmentForm.type === 'add'
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                    onClick={() =>
                      setAdjustmentForm({ ...adjustmentForm, type: 'add' })
                    }
                  >
                    + Add Units (Restock)
                  </button>
                  <button
                    type="button"
                    className={`h-10 rounded-lg border font-bold text-sm ${
                      adjustmentForm.type === 'reduce'
                        ? 'bg-red-600 text-white border-red-700'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                    onClick={() =>
                      setAdjustmentForm({ ...adjustmentForm, type: 'reduce' })
                    }
                  >
                    - Deduct Units (Damaged/Return)
                  </button>
                </div>
              </div>

              <div className="form-field">
                <label>Quantity to Adjust ({adjustingMedicine.unit})</label>
                <input
                  type="number"
                  min="1"
                  value={adjustmentForm.qty}
                  onChange={(e) =>
                    setAdjustmentForm({
                      ...adjustmentForm,
                      qty: Math.max(1, Number(e.target.value)),
                    })
                  }
                />
              </div>

              <div className="form-field">
                <label>
                  Mandatory Audit Reason <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Physical inventory verification, damaged seal write-off"
                  value={adjustmentForm.reason}
                  onChange={(e) =>
                    setAdjustmentForm({
                      ...adjustmentForm,
                      reason: e.target.value,
                    })
                  }
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                New resulting stock will be:{' '}
                <b>
                  {Math.max(
                    0,
                    adjustingMedicine.stock +
                      (adjustmentForm.type === 'add'
                        ? adjustmentForm.qty
                        : -adjustmentForm.qty)
                  )}{' '}
                  {adjustingMedicine.unit}
                </b>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleStockAdjustment}>
                <Check size={16} />
                <span>Save Stock Adjustment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: ADD / EDIT MEDICINE (SUPER ADMIN) */}
      {/* ============================================================== */}
      {modal === 'medicine' && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null)
          }}
        >
          <div className="modal-dialog max-w-2xl">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">
                  {editingMedicine ? 'Edit Medicine' : 'Add Medicine Master'}
                </h2>
                <p className="modal-subtitle">
                  Direct stock management. Expiry is visible to admin only.
                </p>
              </div>
              <button className="btn-modal-close" onClick={() => setModal(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-form-body grid grid-cols-2 gap-4">
              <div className="form-field col-span-2">
                <label>
                  Medicine Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dolo 650, Pan 40"
                  value={medicineForm.name}
                  onChange={(e) =>
                    setMedicineForm({ ...medicineForm, name: e.target.value })
                  }
                />
              </div>

              <div className="form-field">
                <label>Brand Name</label>
                <input
                  type="text"
                  placeholder="e.g. Micro Labs, Alkem"
                  value={medicineForm.brand}
                  onChange={(e) =>
                    setMedicineForm({ ...medicineForm, brand: e.target.value })
                  }
                />
              </div>

              <div className="form-field">
                <label>Generic / Salt Composition</label>
                <input
                  type="text"
                  placeholder="e.g. Paracetamol"
                  value={medicineForm.generic}
                  onChange={(e) =>
                    setMedicineForm({ ...medicineForm, generic: e.target.value })
                  }
                />
              </div>

              <div className="form-field">
                <label>Strength</label>
                <input
                  type="text"
                  placeholder="e.g. 650 mg, 500 mg, 100 ml"
                  value={medicineForm.strength}
                  onChange={(e) =>
                    setMedicineForm({ ...medicineForm, strength: e.target.value })
                  }
                />
              </div>

              <div className="form-field">
                <label>Dosage Form</label>
                <select
                  value={medicineForm.form}
                  onChange={(e) =>
                    setMedicineForm({ ...medicineForm, form: e.target.value })
                  }
                >
                  <option>Tablet</option>
                  <option>Capsule</option>
                  <option>Syrup</option>
                  <option>Injection</option>
                  <option>Ointment</option>
                  <option>Drops</option>
                  <option>Sachet</option>
                  <option>Inhaler</option>
                </select>
              </div>

              <div className="form-field">
                <label>Category</label>
                <input
                  type="text"
                  placeholder="e.g. Analgesic, Antibiotic"
                  value={medicineForm.category}
                  onChange={(e) =>
                    setMedicineForm({ ...medicineForm, category: e.target.value })
                  }
                />
              </div>

              <div className="form-field">
                <label>Manufacturer</label>
                <input
                  type="text"
                  placeholder="Manufacturer name"
                  value={medicineForm.manufacturer}
                  onChange={(e) =>
                    setMedicineForm({
                      ...medicineForm,
                      manufacturer: e.target.value,
                    })
                  }
                />
              </div>

              <div className="form-field">
                <label>HSN Code</label>
                <input
                  type="text"
                  value={medicineForm.hsn}
                  onChange={(e) =>
                    setMedicineForm({ ...medicineForm, hsn: e.target.value })
                  }
                />
              </div>

              <div className="form-field">
                <label>GST Rate (%)</label>
                <input
                  type="number"
                  value={medicineForm.gst}
                  onChange={(e) =>
                    setMedicineForm({ ...medicineForm, gst: Number(e.target.value) })
                  }
                />
              </div>

              <div className="form-field">
                <label>Unit of Sale</label>
                <input
                  type="text"
                  placeholder="Strip, Bottle, Tube, etc."
                  value={medicineForm.unit}
                  onChange={(e) =>
                    setMedicineForm({ ...medicineForm, unit: e.target.value })
                  }
                />
              </div>

              <div className="col-span-2 section-subhead">
                STOCK QUANTITY &amp; EXPIRY (ADMIN VIEW)
              </div>

              <div className="form-field">
                <label>
                  Current Stock Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={medicineForm.stock}
                  onChange={(e) =>
                    setMedicineForm({
                      ...medicineForm,
                      stock: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="form-field">
                <label>
                  Expiry Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={medicineForm.expiry}
                  onChange={(e) =>
                    setMedicineForm({ ...medicineForm, expiry: e.target.value })
                  }
                />
              </div>

              <div className="form-field">
                <label>Purchase Price (₹)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={medicineForm.purchasePrice}
                  onChange={(e) =>
                    setMedicineForm({
                      ...medicineForm,
                      purchasePrice: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="form-field">
                <label>MRP (₹)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={medicineForm.mrp}
                  onChange={(e) =>
                    setMedicineForm({ ...medicineForm, mrp: Number(e.target.value) })
                  }
                />
              </div>

              <div className="form-field">
                <label>Selling Price (₹)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={medicineForm.sellingPrice}
                  onChange={(e) =>
                    setMedicineForm({
                      ...medicineForm,
                      sellingPrice: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="form-field">
                <label>Minimum Stock Alert Level</label>
                <input
                  type="number"
                  min="0"
                  value={medicineForm.minStock}
                  onChange={(e) =>
                    setMedicineForm({
                      ...medicineForm,
                      minStock: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={saveMedicine}>
                <Check size={16} />
                <span>Save Medicine</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: SALE DETAIL BREAKDOWN VIEW */}
      {/* ============================================================== */}
      {modal === 'saleDetail' && selectedSaleForView && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null)
          }}
        >
          <div className="modal-dialog max-w-xl">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Invoice {selectedSaleForView.invoiceNo}</h2>
                <p className="modal-subtitle">
                  {new Date(selectedSaleForView.date).toLocaleString('en-IN')}
                </p>
              </div>
              <button className="btn-modal-close" onClick={() => setModal(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-scroll-body">
              <div className="p-3 bg-slate-50 border rounded-lg mb-4 text-sm space-y-1">
                <div>
                  <b>Patient:</b> {selectedSaleForView.patient.name}
                </div>
                <div>
                  <b>Contact:</b> {selectedSaleForView.patient.phone}
                </div>
                {selectedSaleForView.patient.address && (
                  <div>
                    <b>Address:</b> {selectedSaleForView.patient.address}
                  </div>
                )}
                <div>
                  <b>Payment Mode:</b> {selectedSaleForView.payment}
                </div>
                {selectedSaleForView.operatorName && (
                  <div>
                    <b>Billed By:</b> {selectedSaleForView.operatorName}
                  </div>
                )}
              </div>

              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSaleForView.items.map((i, idx) => (
                    <tr key={idx}>
                      <td>
                        <b>{i.medicineName}</b>
                        <small className="sub-phone">{i.strength}</small>
                      </td>
                      <td>
                        {i.qty} {i.unit}
                      </td>
                      <td>{money(i.price)}</td>
                      <td className="text-right">
                        <b>{money(i.qty * i.price)}</b>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 text-right text-sm space-y-1">
                <div>Subtotal: {money(selectedSaleForView.subtotal)}</div>
                {selectedSaleForView.discount > 0 && (
                  <div>Discount: -{money(selectedSaleForView.discount)}</div>
                )}
                <div>Tax: {money(selectedSaleForView.tax)}</div>
                <div className="text-lg font-bold text-slate-900 border-t pt-2">
                  Grand Total: {money(selectedSaleForView.total)}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => printSaleInvoice(selectedSaleForView, 'A4')}
              >
                <FileText size={16} />
                <span>Print A4 Invoice</span>
              </button>
              <button
                className="btn-secondary"
                onClick={() => printSaleInvoice(selectedSaleForView, '80mm')}
              >
                <Printer size={16} />
                <span>Print 80mm Slip</span>
              </button>
              <button className="btn-primary" onClick={() => setModal(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className="toast-notification">
          <Check size={18} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  )
}
