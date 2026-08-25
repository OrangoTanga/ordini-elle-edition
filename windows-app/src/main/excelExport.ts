import ExcelJS from 'exceljs'
import path from 'path'
import { app } from 'electron'

function getExportDir(): string {
  const docs = app.getPath('documents')
  const dir = path.join(docs, 'Ordini Elly Edition', 'Resoconti')
  return dir
}

function formatDate(d: string | undefined): string {
  if (!d) return ''
  return d.replace('T', ' ').substring(0, 19)
}

function formatCurrency(n: number | undefined | null): number {
  return Math.round((n ?? 0) * 100) / 100
}

export interface ExportOrder {
  id: number
  business_name: string
  vat: string
  iban: string
  invoice_date: string
  total: number
  status: string
  payment_status: string
  payment_type: string
  notes: string
  created_at: string
  updated_at: string
  user_name?: string
  items: ExportOrderItem[]
  payments: ExportPayment[]
}

export interface ExportOrderItem {
  product_name: string
  price: number
  quantity: number
  subtotal: number
}

export interface ExportPayment {
  amount: number
  due_date: string
  paid_date: string | null
  paid_amount: number
  type: string
  status: string
}

export async function exportOrdersToExcel(orders: ExportOrder[]): Promise<string> {
  const dir = getExportDir()
  const { mkdirSync, existsSync } = await import('fs')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
  const filePath = path.join(dir, `resoconto-ordini-${timestamp}.xlsx`)

  const workbook = new ExcelJS.Workbook()

  // Sheet 1: Riepilogo Ordini
  const sheet1 = workbook.addWorksheet('Ordini Eliminati')
  sheet1.columns = [
    { header: 'ID Ordine', key: 'id', width: 12 },
    { header: 'Rappresentante', key: 'user_name', width: 22 },
    { header: 'Cliente', key: 'business_name', width: 30 },
    { header: 'Partita IVA', key: 'vat', width: 18 },
    { header: 'IBAN', key: 'iban', width: 28 },
    { header: 'Data Fattura', key: 'invoice_date', width: 14 },
    { header: 'Totale', key: 'total', width: 14 },
    { header: 'Stato', key: 'status', width: 12 },
    { header: 'Tipo Pagamento', key: 'payment_type', width: 18 },
    { header: 'Stato Pagamento', key: 'payment_status', width: 16 },
    { header: 'Note', key: 'notes', width: 30 },
    { header: 'Data Creazione', key: 'created_at', width: 20 },
    { header: 'Data Aggiornamento', key: 'updated_at', width: 20 },
  ]

  const hFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  const hFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D2D5E' } }
  const hAlign: Partial<ExcelJS.Alignment> = { vertical: 'middle', horizontal: 'center' }
  const hBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  }
  const cAlign: Partial<ExcelJS.Alignment> = { vertical: 'middle' }
  const cBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  }

  const headerRow = sheet1.getRow(1)
  headerRow.height = 24
  headerRow.eachCell((cell) => {
    cell.font = hFont
    cell.fill = hFill
    cell.alignment = hAlign
    cell.border = hBorder
  })

  for (const order of orders) {
    sheet1.addRow({
      id: order.id,
      user_name: order.user_name || '',
      business_name: order.business_name,
      vat: order.vat,
      iban: order.iban,
      invoice_date: order.invoice_date,
      total: formatCurrency(order.total),
      status: order.status,
      payment_type: order.payment_type,
      payment_status: order.payment_status,
      notes: order.notes,
      created_at: formatDate(order.created_at),
      updated_at: formatDate(order.updated_at),
    })
  }

  const statusMap: Record<string, string> = {
    pending: 'In attesa',
    approved: 'Approvato',
    rejected: 'Rifiutato',
  }

  const paymentStatusMap: Record<string, string> = {
    pending: 'In attesa',
    paid: 'Pagato',
    partial: 'Parziale',
  }

  const paymentTypeMap: Record<string, string> = {
    dilazionato: 'Dilazionato',
    saldo: 'Saldo',
    anticipato: 'Anticipato',
  }

  for (let i = 2; i <= sheet1.rowCount; i++) {
    const row = sheet1.getRow(i)
    row.eachCell((cell) => {
      cell.border = cBorder
      cell.alignment = cAlign
    })
    const statusCell = row.getCell(8)
    statusCell.value = statusMap[statusCell.value as string] || statusCell.value
    const payTypeCell = row.getCell(9)
    payTypeCell.value = paymentTypeMap[payTypeCell.value as string] || payTypeCell.value
    const payStatusCell = row.getCell(10)
    payStatusCell.value = paymentStatusMap[payStatusCell.value as string] || payStatusCell.value
    const totalCell = row.getCell(7)
    totalCell.numFmt = '#,##0.00 €'
  }

  sheet1.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: sheet1.rowCount, column: sheet1.columnCount },
  }

  // Sheet 2: Dettaglio Articoli
  const sheet2 = workbook.addWorksheet('Dettaglio Articoli')
  sheet2.columns = [
    { header: 'ID Ordine', key: 'order_id', width: 12 },
    { header: 'Prodotto', key: 'product_name', width: 35 },
    { header: 'Prezzo Unitario', key: 'price', width: 16 },
    { header: 'Quantità', key: 'quantity', width: 10 },
    { header: 'Subtotale', key: 'subtotal', width: 14 },
  ]

  const sheet2HeaderRow = sheet2.getRow(1)
  sheet2HeaderRow.height = 24
  sheet2HeaderRow.eachCell((cell) => {
    cell.font = hFont
    cell.fill = hFill
    cell.alignment = hAlign
    cell.border = hBorder
  })

  for (const order of orders) {
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        sheet2.addRow({
          order_id: order.id,
          product_name: item.product_name,
          price: formatCurrency(item.price),
          quantity: item.quantity,
          subtotal: formatCurrency(item.subtotal),
        })
      }
    }
  }

  for (let i = 2; i <= sheet2.rowCount; i++) {
    const row = sheet2.getRow(i)
    row.eachCell((cell, colNumber) => {
      cell.border = cBorder
      cell.alignment = cAlign
      if (colNumber === 3 || colNumber === 5) {
        cell.numFmt = '#,##0.00 €'
      }
    })
  }

  sheet2.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: sheet2.rowCount, column: sheet2.columnCount },
  }

  // Sheet 3: Pagamenti
  const sheet3 = workbook.addWorksheet('Pagamenti')
  sheet3.columns = [
    { header: 'ID Ordine', key: 'order_id', width: 12 },
    { header: 'Importo', key: 'amount', width: 14 },
    { header: 'Scadenza', key: 'due_date', width: 14 },
    { header: 'Data Pagamento', key: 'paid_date', width: 16 },
    { header: 'Importo Pagato', key: 'paid_amount', width: 16 },
    { header: 'Tipo', key: 'type', width: 14 },
    { header: 'Stato', key: 'status_pay', width: 12 },
  ]

  const sheet3HeaderRow = sheet3.getRow(1)
  sheet3HeaderRow.height = 24
  sheet3HeaderRow.eachCell((cell) => {
    cell.font = hFont
    cell.fill = hFill
    cell.alignment = hAlign
    cell.border = hBorder
  })

  const payTypeMap: Record<string, string> = {
    pagamento: 'Pagamento',
    acconto: 'Acconto',
    saldo: 'Saldo',
  }

  const payStatusMap2: Record<string, string> = {
    pending: 'In attesa',
    paid: 'Pagato',
    overdue: 'Scaduto',
  }

  for (const order of orders) {
    if (order.payments && order.payments.length > 0) {
      for (const p of order.payments) {
        sheet3.addRow({
          order_id: order.id,
          amount: formatCurrency(p.amount),
          due_date: p.due_date || '',
          paid_date: p.paid_date ? formatDate(p.paid_date) : '',
          paid_amount: formatCurrency(p.paid_amount),
          type: payTypeMap[p.type] || p.type,
          status_pay: payStatusMap2[p.status] || p.status,
        })
      }
    }
  }

  for (let i = 2; i <= sheet3.rowCount; i++) {
    const row = sheet3.getRow(i)
    row.eachCell((cell, colNumber) => {
      cell.border = cBorder
      cell.alignment = cAlign
      if (colNumber === 2 || colNumber === 5) {
        cell.numFmt = '#,##0.00 €'
      }
    })
  }

  sheet3.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: sheet3.rowCount, column: sheet3.columnCount },
  }

  await workbook.xlsx.writeFile(filePath)
  return filePath
}
