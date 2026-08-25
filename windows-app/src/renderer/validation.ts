import { toast } from './components/Toast'

export function validateCustomer(data: Record<string, any>): string | null {
  if (!data.business_name?.trim()) return 'Inserisci la ragione sociale'
  if (data.business_name.trim().length < 2 || data.business_name.trim().length > 100)
    return 'Ragione sociale: 2-100 caratteri'
  if (data.vat && data.vat.length > 20) return 'Partita IVA troppo lunga'
  if (data.iban && data.iban.length > 34) return 'IBAN non valido'
  if (data.phone && data.phone.length > 20) return 'Telefono non valido'
  return null
}

export function validateUser(data: Record<string, any>, updating: boolean): string | null {
  if (!data.username?.trim()) return 'Inserisci username'
  if (data.username.trim().length < 2 || data.username.trim().length > 50)
    return 'Username: 2-50 caratteri'
  if (!data.name?.trim()) return 'Inserisci nome'
  if (data.name.trim().length < 2 || data.name.trim().length > 100)
    return 'Nome: 2-100 caratteri'
  if (!updating && (!data.password || data.password.length < 6))
    return 'Password: almeno 6 caratteri'
  return null
}

export function validateListino(data: Record<string, any>): string | null {
  if (!data.name?.trim()) return 'Inserisci nome listino'
  if (data.name.trim().length < 2 || data.name.trim().length > 100)
    return 'Nome: 2-100 caratteri'
  if (data.commission_percent == null || isNaN(Number(data.commission_percent)))
    return 'Inserisci percentuale commissione valida'
  if (Number(data.commission_percent) < 0 || Number(data.commission_percent) > 100)
    return 'Commissione: 0-100%'
  return null
}

export function validateProduct(data: Record<string, any>): string | null {
  if (!data.name?.trim()) return 'Inserisci nome prodotto'
  if (data.name.trim().length < 1 || data.name.trim().length > 200)
    return 'Nome: 1-200 caratteri'
  if (data.price == null || isNaN(Number(data.price))) return 'Inserisci prezzo valido'
  if (Number(data.price) < 0) return 'Il prezzo non può essere negativo'
  return null
}

export function validatePayment(data: Record<string, any>): string | null {
  if (!data.amount || isNaN(Number(data.amount))) return 'Inserisci importo valido'
  if (Number(data.amount) <= 0) return 'Importo deve essere maggiore di 0'
  if (!data.payment_method?.trim()) return 'Seleziona metodo di pagamento'
  if (data.notes && data.notes.length > 500) return 'Note troppo lunghe (max 500)'
  return null
}

export function showValidationError(err: string | null): boolean {
  if (err) { toast.error(err); return true }
  return false
}
