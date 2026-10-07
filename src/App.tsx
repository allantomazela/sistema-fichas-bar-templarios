/* Main App Component - Handles routing (using react-router-dom), query client and other providers - use this file to add all routes */
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { PosProvider } from '@/context/PosContext'
import Index from './pages/Index'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import {
  CashControl,
  Dashboard,
  FichaLotes,
  ProductsManager,
  Reports,
  Settings,
  StockControl,
  agendarPreCarregamento,
} from './pages/lazyPages'

export default function App() {
  useEffect(() => agendarPreCarregamento(), [])

  return (
    <BrowserRouter>
      <PosProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-right" richColors closeButton />
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/caixa" element={<CashControl />} />
              <Route path="/produtos" element={<ProductsManager />} />
              <Route path="/estoque" element={<StockControl />} />
              <Route path="/fichas-antecipadas" element={<FichaLotes />} />
              <Route path="/relatorios" element={<Reports />} />
              <Route path="/configuracoes" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </PosProvider>
    </BrowserRouter>
  )
}
