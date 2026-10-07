import { CreditCard, Shield } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ConfigSectionProps, FieldLabel, SettingsCard } from './SettingsPrimitives'

/** Informativo das formas de pagamento + senha master de administrador. */
export function AccessAndPaymentSection({ formData, onChange }: ConfigSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SettingsCard
        title="Formas de pagamento"
        icon={<CreditCard className="w-5 h-5 text-teal-600" />}
        className="space-y-3"
      >
        <p className="text-sm text-muted-foreground leading-relaxed">
          Na finalização da venda você apenas <strong className="text-foreground">marca</strong>{' '}
          como o cliente pagou (dinheiro, PIX, débito, crédito ou cortesia). O cobro em si é feito
          na maquininha ou em espécie — este sistema{' '}
          <strong className="text-foreground">não gera QR Code PIX</strong>.
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          As formas marcadas alimentam o fechamento de caixa e os relatórios do evento.
        </p>
      </SettingsCard>

      <SettingsCard
        title="Controle de Acesso da Gerência"
        icon={<Shield className="w-5 h-5 text-amber-500" />}
      >
        <div>
          <FieldLabel htmlFor="senha-admin">Senha Master de Administrador</FieldLabel>
          <Input
            id="senha-admin"
            type="password"
            placeholder="Padrão: 1234"
            value={formData.senha_admin}
            onChange={(e) => onChange({ senha_admin: e.target.value })}
            autoComplete="new-password"
            className="h-11 font-mono tracking-widest text-base"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Necessária para cancelamento de fichas, sangrias de caixa e limpeza de base de dados.
          </p>
        </div>
      </SettingsCard>
    </div>
  )
}
