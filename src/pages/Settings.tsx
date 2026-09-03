import React, { useState, useRef } from 'react'
import { usePos } from '@/context/PosContext'
import { Configuracoes, LarguraBobina } from '@/types/pos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Settings as SettingsIcon,
  Printer,
  Shield,
  Download,
  Upload,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  HardDrive,
} from 'lucide-react'
import { AdminPasswordModal } from '@/components/modals/AdminPasswordModal'
import { toast } from 'sonner'

export default function Settings() {
  const { config, updateConfig, exportarBackup, importarBackup, zerarVendas, caixaAtivo } = usePos()

  const [formData, setFormData] = useState<Configuracoes>({ ...config })
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false)
  const [adminActionType, setAdminActionType] = useState<'reset' | 'import' | null>(null)
  const [pendingFileContent, setPendingFileContent] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault()
    updateConfig(formData)
  }

  // Importar arquivo JSON
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setPendingFileContent(content)
      setAdminActionType('import')
      setIsAdminModalOpen(true)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handlePromptReset = () => {
    setAdminActionType('reset')
    setIsAdminModalOpen(true)
  }

  const handleAdminSuccess = () => {
    if (adminActionType === 'reset') {
      zerarVendas(150.0, caixaAtivo ? caixaAtivo.operador : 'Operador Principal')
    } else if (adminActionType === 'import' && pendingFileContent) {
      importarBackup(pendingFileContent)
      setPendingFileContent(null)
    }
    setAdminActionType(null)
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto p-4 md:p-6 space-y-6 bg-background text-foreground">
      {/* CABEÇALHO */}
      <div className="border-b border-border pb-4">
        <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
          <SettingsIcon className="w-7 h-7 text-primary" />
          Configurações & Gestão do Sistema
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Personalize as informações do evento, parâmetros de impressão térmica, senhas e
          gerenciamento de backup local.
        </p>
      </div>

      <form onSubmit={handleSaveConfig} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SEÇÃO 1: DADOS DO EVENTO */}
          <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2 border-b border-border pb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              Identificação do Evento & Cabeçalho
            </h3>

            <div>
              <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                Nome Principal do Evento
              </Label>
              <Input
                type="text"
                placeholder="Ex: Grande Festa Junina 2025"
                value={formData.nome_evento}
                onChange={(e) => setFormData({ ...formData, nome_evento: e.target.value })}
                required
                className="h-11 font-bold"
              />
            </div>

            <div>
              <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                Subtítulo / Organização
              </Label>
              <Input
                type="text"
                placeholder="Ex: Quermesse Beneficente da Paróquia"
                value={formData.subtitulo_evento}
                onChange={(e) => setFormData({ ...formData, subtitulo_evento: e.target.value })}
                className="h-10 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                Texto de Cabeçalho dos Cupons (CNPJ / Entidade)
              </Label>
              <Input
                type="text"
                placeholder="Ex: ASSOCIAÇÃO BENEFICENTE - CNPJ 00.000.000/0001-00"
                value={formData.cabecalho_cupom}
                onChange={(e) => setFormData({ ...formData, cabecalho_cupom: e.target.value })}
                className="h-10 text-xs font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                Mensagem de Rodapé das Fichas
              </Label>
              <Input
                type="text"
                placeholder="Ex: Válido apenas para o dia do evento. Não reembolsável."
                value={formData.rodape_cupom}
                onChange={(e) => setFormData({ ...formData, rodape_cupom: e.target.value })}
                className="h-10 text-xs"
              />
            </div>
          </div>

          {/* SEÇÃO 2: MOTOR DE IMPRESSÃO & BOBINA */}
          <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2 border-b border-border pb-2">
              <Printer className="w-5 h-5 text-primary" />
              Configuração de Impressora Térmica
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                  Largura da Bobina
                </Label>
                <select
                  value={formData.largura_bobina}
                  onChange={(e) =>
                    setFormData({ ...formData, largura_bobina: e.target.value as LarguraBobina })
                  }
                  className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm font-bold"
                >
                  <option value="80mm">Bobina 80mm (Padrão)</option>
                  <option value="58mm">Bobina 58mm (Estreita)</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                  Modo de Emissão Padrão
                </Label>
                <select
                  value={formData.modo_impressao_padrao}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      modo_impressao_padrao: e.target.value as 'individual' | 'agrupado',
                    })
                  }
                  className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm font-bold"
                >
                  <option value="individual">Individual (1 Ficha p/ Item)</option>
                  <option value="agrupado">Agrupado (Cupom único)</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                <div>
                  <div className="font-bold text-xs">Exibir Simulação de Impressão em Tela</div>
                  <div className="text-[11px] text-muted-foreground">
                    Abre a pré-visualização das fichas geradas após cada venda.
                  </div>
                </div>
                <Switch
                  checked={formData.simular_impressao_tela}
                  onCheckedChange={(val) =>
                    setFormData({ ...formData, simular_impressao_tela: val })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                <div>
                  <div className="font-bold text-xs">Indicação de Corte de Papel</div>
                  <div className="text-[11px] text-muted-foreground">
                    Exibe linha tracejada com tesoura entre as fichas para guilhotina ou rasgo.
                  </div>
                </div>
                <Switch
                  checked={formData.corte_automatico}
                  onCheckedChange={(val) => setFormData({ ...formData, corte_automatico: val })}
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: CHAVE PIX & SEGURANÇA */}
          <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2 border-b border-border pb-2">
              <QrCode className="w-5 h-5 text-teal-600" />
              Chave PIX Estática para Recebimento
            </h3>

            <div>
              <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                Chave PIX (E-mail, Telefone, CNPJ ou Aleatória)
              </Label>
              <Input
                type="text"
                placeholder="Ex: tesouraria@comunidade.org.br"
                value={formData.chave_pix_estatica || ''}
                onChange={(e) => setFormData({ ...formData, chave_pix_estatica: e.target.value })}
                className="h-11 font-mono text-sm"
              />
            </div>

            <div>
              <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                Nome do Beneficiário / Razão Social
              </Label>
              <Input
                type="text"
                placeholder="Ex: Associação Beneficente dos Moradores"
                value={formData.nome_beneficiario_pix || ''}
                onChange={(e) =>
                  setFormData({ ...formData, nome_beneficiario_pix: e.target.value })
                }
                className="h-10 text-sm"
              />
            </div>
          </div>

          {/* SEÇÃO 4: SENHA DE GERÊNCIA & ADMINISTRAÇÃO */}
          <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2 border-b border-border pb-2">
              <Shield className="w-5 h-5 text-amber-500" />
              Controle de Acesso da Gerência
            </h3>

            <div>
              <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                Senha Master de Administrador
              </Label>
              <Input
                type="password"
                placeholder="Padrão: 1234"
                value={formData.senha_admin}
                onChange={(e) => setFormData({ ...formData, senha_admin: e.target.value })}
                className="h-11 font-mono tracking-widest text-base"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Necessária para cancelamento de fichas, sangrias de caixa e limpeza de base de
                dados.
              </p>
            </div>
          </div>
        </div>

        {/* BOTÃO SALVAR CONFIGURAÇÕES */}
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

      {/* SEÇÃO 5: GESTÃO DE DADOS, BACKUP & NOVO EVENTO */}
      <div className="p-6 rounded-2xl border-2 border-border bg-card shadow-xs space-y-4 mt-8">
        <h3 className="font-bold text-base text-foreground flex items-center gap-2 border-b border-border pb-3">
          <HardDrive className="w-5 h-5 text-primary" />
          Gestão de Banco de Dados Local (Offline-First)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* EXPORTAR BACKUP */}
          <div className="p-4 rounded-xl border border-border bg-muted/10 flex flex-col justify-between space-y-3">
            <div>
              <div className="font-bold text-sm">Exportar Backup Completo</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gera um arquivo JSON contendo todos os cadastros, vendas e turnos salvos.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={exportarBackup}
              className="w-full font-bold gap-2 border-primary/30 text-primary hover:bg-primary/10"
            >
              <Download className="w-4 h-4" />
              Baixar Backup JSON
            </Button>
          </div>

          {/* RESTAURAR BACKUP */}
          <div className="p-4 rounded-xl border border-border bg-muted/10 flex flex-col justify-between space-y-3">
            <div>
              <div className="font-bold text-sm">Restaurar Banco de Dados</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Carrega um arquivo de backup previamente exportado neste ou em outro PDV.
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full font-bold gap-2"
              >
                <Upload className="w-4 h-4" />
                Carregar Arquivo JSON
              </Button>
            </div>
          </div>

          {/* ZERAR VENDAS PARA NOVO EVENTO */}
          <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 flex flex-col justify-between space-y-3">
            <div>
              <div className="font-bold text-sm text-destructive flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Zerar Vendas para Novo Evento
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Mantém as categorias e produtos cadastrados, mas zera todas as vendas e fichas.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={handlePromptReset}
              className="w-full font-bold gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Zerar Base de Vendas
            </Button>
          </div>
        </div>
      </div>

      {/* MODAL SENHA DE ADMIN */}
      <AdminPasswordModal
        isOpen={isAdminModalOpen}
        onClose={() => {
          setIsAdminModalOpen(false)
          setAdminActionType(null)
          setPendingFileContent(null)
        }}
        onSuccess={handleAdminSuccess}
        title={
          adminActionType === 'reset'
            ? 'Confirmar Reinicialização de Vendas'
            : 'Confirmar Restauração de Banco'
        }
        description="Esta ação requer permissão de administrador para ser executada."
      />
    </div>
  )
}
