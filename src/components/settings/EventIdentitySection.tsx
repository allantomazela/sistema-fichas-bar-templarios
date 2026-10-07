import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfigSectionProps, FieldLabel, SettingsCard } from './SettingsPrimitives'
import { LogoPicker } from './LogoPicker'

export function EventIdentitySection({ formData, onChange }: ConfigSectionProps) {
  return (
    <SettingsCard
      title="Identificação do Evento & Cabeçalho"
      icon={<span className="w-2.5 h-2.5 rounded-full bg-primary" />}
    >
      <div>
        <FieldLabel>Nome Principal do Evento</FieldLabel>
        <Input
          type="text"
          placeholder="Ex: Grande Festa Junina 2025"
          value={formData.nome_evento}
          onChange={(e) => onChange({ nome_evento: e.target.value })}
          required
          className="h-11 font-bold"
        />
      </div>

      <div>
        <FieldLabel>Subtítulo / Organização</FieldLabel>
        <Input
          type="text"
          placeholder="Ex: Unidade Centro / Evento Especial"
          value={formData.subtitulo_evento}
          onChange={(e) => onChange({ subtitulo_evento: e.target.value })}
          className="h-10 text-sm"
        />
      </div>

      <div>
        <FieldLabel>Texto de Cabeçalho dos Cupons (CNPJ / Entidade)</FieldLabel>
        <Input
          type="text"
          placeholder="Ex: BAR TEMPLÁRIOS"
          value={formData.cabecalho_cupom}
          onChange={(e) => onChange({ cabecalho_cupom: e.target.value })}
          className="h-10 text-xs font-mono"
        />
      </div>

      <div>
        <FieldLabel>Mensagem de Rodapé das Fichas</FieldLabel>
        <Input
          type="text"
          placeholder="Ex: Obrigado pela preferência. Não reembolsável."
          value={formData.rodape_cupom}
          onChange={(e) => onChange({ rodape_cupom: e.target.value })}
          className="h-10 text-xs"
        />
      </div>

      <div className="pt-2 border-t border-border">
        <Label className="text-xs font-bold uppercase text-muted-foreground block mb-2">
          Logomarca do Evento (Offline / Base64)
        </Label>
        <LogoPicker
          value={formData.logomarca_base64}
          onChange={(logomarca_base64) => onChange({ logomarca_base64 })}
        />
      </div>
    </SettingsCard>
  )
}
