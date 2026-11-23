export const money = (n: number) =>
  '₹' + (Number.isFinite(n) ? n.toFixed(2) : '0.00')

export const today = () => new Date().toISOString().slice(0, 10)

export const uid = () => Math.random().toString(36).slice(2, 10)

export const isExpired = (date: string) => {
  if (!date) return false
  return date < today()
}

export const isNearExpiry = (date: string) => {
  if (!date || isExpired(date)) return false
  const now = new Date()
  const exp = new Date(date)
  const diffDays = (exp.getTime() - now.getTime()) / (1000 * 3600 * 24)
  return diffDays <= 90
}

export const safeRead = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch {
    return fallback
  }
}

// Convert numbers to Indian Rupees in words for A4 Invoice
export function numberToWords(amount: number): string {
  if (amount <= 0) return 'Zero Rupees Only'

  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ]
  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ]

  const convertLessThanOneThousand = (n: number): string => {
    let word = ''
    if (n >= 100) {
      word += ones[Math.floor(n / 100)] + ' Hundred '
      n %= 100
    }
    if (n >= 20) {
      word += tens[Math.floor(n / 10)] + ' '
      n %= 10
    }
    if (n > 0) {
      word += ones[n] + ' '
    }
    return word.trim()
  }

  const integerPart = Math.floor(amount)
  const decimalPart = Math.round((amount - integerPart) * 100)

  let result = ''
  let num = integerPart

  if (num >= 10000000) {
    const crore = Math.floor(num / 10000000)
    result += convertLessThanOneThousand(crore) + ' Crore '
    num %= 10000000
  }
  if (num >= 100000) {
    const lakh = Math.floor(num / 100000)
    result += convertLessThanOneThousand(lakh) + ' Lakh '
    num %= 100000
  }
  if (num >= 1000) {
    const thousand = Math.floor(num / 1000)
    result += convertLessThanOneThousand(thousand) + ' Thousand '
    num %= 1000
  }
  if (num > 0) {
    result += convertLessThanOneThousand(num) + ' '
  }

  result = result.trim() + ' Rupees'

  if (decimalPart > 0) {
    result += ' and ' + convertLessThanOneThousand(decimalPart) + ' Paise'
  }

  return result + ' Only'
}
