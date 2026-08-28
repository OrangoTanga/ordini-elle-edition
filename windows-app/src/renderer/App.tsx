import React, { useState, useEffect } from 'react'
import { tokens } from './theme/tokens'
import { Sidebar, Page } from './components/Sidebar'
import { Header } from './components/Header'
import { ToastContainer } from './components/Toast'
import { LoginScreen } from './screens/LoginScreen'
import { DashboardScreen } from './screens/DashboardScreen'
import { OrdersScreen } from './screens/OrdersScreen'
import { CatalogScreen } from './screens/CatalogScreen'
import { CustomersScreen } from './screens/CustomersScreen'
import { UsersScreen } from './screens/UsersScreen'
import { ListiniScreen } from './screens/ListiniScreen'
import { ProvvigioniScreen } from './screens/ProvvigioniScreen'
import { PaymentsScreen } from './screens/PaymentsScreen'
import { CalendarScreen } from './screens/CalendarScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { api } from './api'
import { useUpdateChecker } from './services/useUpdateChecker'
import { UpdateBanner } from './components/UpdateBanner'
import { UpdateBlocker } from './components/UpdateBlocker'

import { CartProvider, CartButton, CartDrawer } from './context/CartContext'
import {
  ChartBar, ClipboardText, Package, Storefront, User, CurrencyEur,
  Coins, CreditCard, Calendar, Gear,
} from '@phosphor-icons/react'

const pageIcons: Record<Page, React.ReactNode> = {
  dashboard: <ChartBar size={20} weight="fill" />,
  orders: <ClipboardText size={20} weight="fill" />,
  catalog: <Package size={20} weight="fill" />,
  customers: <Storefront size={20} weight="fill" />,
  users: <User size={20} weight="fill" />,
  listini: <CurrencyEur size={20} weight="fill" />,
  provvigioni: <Coins size={20} weight="fill" />,
  payments: <CreditCard size={20} weight="fill" />,
  calendar: <Calendar size={20} weight="fill" />,
  settings: <Gear size={20} weight="fill" />,
}

const pageTitles: Record<Page, string> = {
  dashboard: 'Dashboard',
  orders: 'Ordini',
  catalog: 'Catalogo Prodotti',
  customers: 'Clienti',
  users: 'Utenti',
  listini: 'Listini e Commissioni',
  provvigioni: 'Provvigioni per Prodotto',
  payments: 'Pagamenti',
  calendar: 'Calendario',
  settings: 'Impostazioni',
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [pendingCount, setPendingCount] = useState(0)
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const update = useUpdateChecker('windows')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.auth.verify(token).then(result => {
        if (result.success && result.data?.valid && result.data?.isAdmin) {
          setAuthenticated(true)
        } else {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        }
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [])

  const handleLogin = (_token: string) => setAuthenticated(true)

  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: tokens.colors.bg, color: tokens.colors.textMuted, fontSize: 14,
      }}>
        Caricamento...
      </div>
    )
  }

  if (!authenticated) {
    return <LoginScreen onLogin={handleLogin} />
  }

  if (update.info && update.info.mandatory) {
    return (
      <UpdateBlocker
        info={update.info}
        currentVersion={update.currentVersion}
        onOpenRelease={update.openReleasePage}
        onDownload={update.downloadUpdate}
      />
    )
  }

  const renderScreen = () => {
    const props = { onPendingCountChange: setPendingCount }
    switch (currentPage) {
      case 'dashboard': return <DashboardScreen {...props} />
      case 'orders': return <OrdersScreen {...props} />
      case 'catalog': return <CatalogScreen />
      case 'customers': return <CustomersScreen />
      case 'users': return <UsersScreen />
      case 'listini': return <ListiniScreen />
      case 'provvigioni': return <ProvvigioniScreen />
      case 'payments': return <PaymentsScreen />
      case 'calendar': return <CalendarScreen />
      case 'settings': return <SettingsScreen onLogout={() => { localStorage.clear(); setAuthenticated(false) }} />
    }
  }

  return (
    <CartProvider>
      <div style={{ display: 'flex', height: '100vh', background: tokens.colors.bg }}>
        <div style={{
          height: 4, width: '100%', WebkitAppRegion: 'drag', cursor: 'default',
          background: 'transparent', position: 'fixed', top: 0, left: 0, zIndex: 9999,
        }} />
        {update.info && !update.dismissed && (
          <UpdateBanner
            info={update.info}
            currentVersion={update.currentVersion}
            onOpenRelease={update.openReleasePage}
            onDownload={update.downloadUpdate}
            onDismiss={update.dismiss}
          />
        )}
        <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} orderCount={pendingCount} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Header title={pageTitles[currentPage]} icon={pageIcons[currentPage]} />
          <div style={{ flex: 1, overflow: 'auto', padding: tokens.spacing.xxl }}>
            {renderScreen()}
          </div>
        </div>
        <CartButton />
        <CartDrawer />
        <ToastContainer />
      </div>
    </CartProvider>
  )
}
