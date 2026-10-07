import { useState } from 'react'
import { HardDrive, Save, Settings as SettingsIcon } from 'lucide-react'
import { usePos } from '@/context/PosContext'
import type { Configuracoes } from '@/types/pos'
import { Button } from '@/components/ui/button'
import { getStorageBackend } from '@/services/storage'
import { EventIdentitySection } from '@/components/settings/EventIdentitySection'
import { PrinterSection } from '@/components/settings/PrinterSection'
import { FichaTemplateSection } from '@/components/settings/FichaTemplateSection'
import { AccessAndPaymentSection } from '@/components/settings/AccessAndPaymentSection'
import { DataManagementSection } from '@/components/settings/DataManagementSection'

export default function Settings() {
  const { config, updateConfig, caixaAtivo } = usePos()
  const [formData, setFormData] = useState<Configuracoes>({ ...config })

  const handleChange = (patch: Partial<Configuracoes>) =>
    setFormData((prev) => ({ ...prev, ...patch }))

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault()
    updateConfig(formData)
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto p-4 md:p-6 space-y-6 bg-background text-foreground">
      <SettingsHeader />

      <form onSubmit={handleSaveConfig} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EventIdentitySection formData={formData} onChange={handleChange} />
          <PrinterSection formData={formData} onChange={handleChange} />
        </div>

        <FichaTemplateSection
          config={formData}
          operador={caixaAtivo?.operador}
          caixaId={caixaAtivo?.id}
        />

        <AccessAndPaymentSection formData={formData} onChange={handleChange} />

        <div className="flex justify-end">
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm px-8 h-12 gap-2 shadow-lg"
          >
            <Save className="w-5 h-5" />
            Salvar Configurações
          </Button>
        </div>
      </form>

      <DataManagementSection />
    </div>
  )
}

function SettingsHeader() {
  const storageBackend = getStorageBackend()
  return (
    <div className="border-b border-border pb-4">
      <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
        <SettingsIcon className="w-7 h-7 text-primary" />
        Configurações & Gestão do Sistema
      </h2>
      <p className="text-xs text-muted-foreground mt-0.5">
        Personalize as informações do evento, parâmetros de impressão térmica, senhas e
        gerenciamento de backup local.
      </p>
      <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
        <HardDrive className="h-3.5 w-3.5" />
        Persistência:{' '}
        <span className="text-foreground">
          {storageBackend === 'sqlite'
            ? 'SQLite local (app nativo Windows/Linux)'
            : 'localStorage (navegador)'}
        </span>
      </p>
    </div>
  )
}
