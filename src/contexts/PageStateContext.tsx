import { createContext, useContext, useMemo, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import type {
  ConfigTab,
  ContactTab,
  FinanceTab,
  Page,
  ProductTab,
  SalesTab,
} from '../types/erp'

type PageStateContextValue = {
  activePage: Page
  setActivePage: (value: Page) => void
  financeTab: FinanceTab
  setFinanceTab: (value: FinanceTab) => void
  salesTab: SalesTab
  setSalesTab: (value: SalesTab) => void
  contactTab: ContactTab
  setContactTab: (value: ContactTab) => void
  productTab: ProductTab
  setProductTab: (value: ProductTab) => void
  configTab: ConfigTab
  setConfigTab: (value: ConfigTab) => void
  shortcutNewSale: number
  setShortcutNewSale: Dispatch<SetStateAction<number>>
  shortcutNewPurchase: number
  setShortcutNewPurchase: Dispatch<SetStateAction<number>>
  shortcutNewContact: number
  setShortcutNewContact: Dispatch<SetStateAction<number>>
  shortcutNewProduct: number
  setShortcutNewProduct: Dispatch<SetStateAction<number>>
}

const PageStateContext = createContext<PageStateContextValue | null>(null)

export function PageStateProvider({ children }: { children: ReactNode }) {
  const [activePage, setActivePage] = useState<Page>('Dashboard')
  const [financeTab, setFinanceTab] = useState<FinanceTab>('recebimentos')
  const [salesTab, setSalesTab] = useState<SalesTab>('vendas')
  const [contactTab, setContactTab] = useState<ContactTab>('clientes')
  const [productTab, setProductTab] = useState<ProductTab>('produtos')
  const [configTab, setConfigTab] = useState<ConfigTab>('geral')
  const [shortcutNewSale, setShortcutNewSale] = useState(0)
  const [shortcutNewPurchase, setShortcutNewPurchase] = useState(0)
  const [shortcutNewContact, setShortcutNewContact] = useState(0)
  const [shortcutNewProduct, setShortcutNewProduct] = useState(0)

  const value = useMemo(
    () => ({
      activePage,
      setActivePage,
      financeTab,
      setFinanceTab,
      salesTab,
      setSalesTab,
      contactTab,
      setContactTab,
      productTab,
      setProductTab,
      configTab,
      setConfigTab,
      shortcutNewSale,
      setShortcutNewSale,
      shortcutNewPurchase,
      setShortcutNewPurchase,
      shortcutNewContact,
      setShortcutNewContact,
      shortcutNewProduct,
      setShortcutNewProduct,
    }),
    [
      activePage,
      financeTab,
      salesTab,
      contactTab,
      productTab,
      configTab,
      shortcutNewSale,
      shortcutNewPurchase,
      shortcutNewContact,
      shortcutNewProduct,
    ],
  )

  return <PageStateContext.Provider value={value}>{children}</PageStateContext.Provider>
}

export function usePageState() {
  const context = useContext(PageStateContext)
  if (!context) throw new Error('usePageState must be used within PageStateProvider')
  return context
}
