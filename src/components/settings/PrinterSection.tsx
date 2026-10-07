import { isTauri } from '@tauri-apps/api/core'
import { Printer } from 'lucide-react'
import { useSystemPrinters } from '@/hooks/useSystemPrinters'
import type { LarguraBobina } from '@/types/pos'
import {
  ConfigSectionProps,
  FieldLabel,
  SELECT_CLASS,
  SettingsCard,
  ToggleRow,
} from './SettingsPrimitives'

type ModoImpressao = 'escpos' | 'navegador'

export function PrinterSection({ formData, onChange }: ConfigSectionProps) {
  const { printers, loading } = useSystemPrinters()

  return (
    <SettingsCard
      title="Configuração de Impressora Térmica"
      icon={<Printer className="w-5 h-5 text-primary" />}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <FieldLabel htmlFor="largura-bobina">Largura da Bobina Térmica</FieldLabel>
          <select
            id="largura-bobina"
            value={formData.largura_bobina}
            onChange={(e) => onChange({ largura_bobina: e.target.value as LarguraBobina })}
            className={SELECT_CLASS}
          >
            <option value="80mm">Bobina 80mm (Padrão Elgin i9)</option>
            <option value="58mm">Bobina 58mm (Estreita)</option>
          </select>
        </div>

        <div>
          <FieldLabel htmlFor="modo-impressao">Modo de impressão</FieldLabel>
          <select
            id="modo-impressao"
            value={formData.modo_impressao || 'escpos'}
            onChange={(e) => onChange({ modo_impressao: e.target.value as ModoImpressao })}
            className={SELECT_CLASS}
          >
            <option value="escpos">ESC/POS Elgin i9 (recomendado)</option>
            <option value="navegador">Diálogo do Windows (fallback)</option>
          </select>
        </div>
      </div>

      <div>
        <FieldLabel htmlFor="impressora-nome">Impressora Elgin i9</FieldLabel>
        <select
          id="impressora-nome"
          value={formData.impressora_nome || ''}
          onChange={(e) => onChange({ impressora_nome: e.target.value })}
          disabled={!isTauri() || loading}
          className={SELECT_CLASS}
        >
          <option value="">
            {loading ? 'Detectando impressoras…' : 'Detectar automaticamente (preferir Elgin i9)'}
          </option>
          {printers.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
              {p.is_default ? ' (padrão do Windows)' : ''}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
          Envia comandos RAW ESC/POS direto para a Elgin i9 (sem caixa de diálogo) e aciona a
          guilhotina entre cada ficha. A impressora precisa aparecer no Windows com o driver Elgin
          instalado.
        </p>
      </div>

      <div className="p-3 rounded-xl border border-border bg-primary/5">
        <div className="font-bold text-xs text-primary">Modo de Emissão: Sempre Individual</div>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
          Cada unidade de cada item gera 1 ficha própria (ex.: 10 unidades = 10 fichas).
        </p>
      </div>

      <div className="space-y-3 pt-2">
        <ToggleRow
          title="Imprimir automaticamente ao finalizar"
          description="Envia as fichas direto para a impressora após a venda (sem painel na tela)."
          checked={formData.auto_imprimir_ao_finalizar !== false}
          onCheckedChange={(val) => onChange({ auto_imprimir_ao_finalizar: val })}
        />
        <ToggleRow
          title="Mostrar painel antes de reimprimir"
          description="Ao reimprimir pelo PDV/Relatórios, abre pré-visualização. Desligado = imprime direto."
          checked={formData.simular_impressao_tela}
          onCheckedChange={(val) => onChange({ simular_impressao_tela: val })}
        />
        <ToggleRow
          title="Corte automático (guilhotina Elgin i9)"
          description="No modo ESC/POS, aciona a guilhotina após cada ficha (comando GS V). Evita a “tripa” contínua de papel."
          checked={formData.corte_automatico}
          onCheckedChange={(val) => onChange({ corte_automatico: val })}
        />
      </div>
    </SettingsCard>
  )
}
