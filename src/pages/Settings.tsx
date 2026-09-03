import React, { useState, useRef } from 'react'
import { usePos } from '@/context/PosContext'
import { Configuracoes, LarguraBobina, Ficha } from '@/types/pos'
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
  Sliders,
  Image as ImageIcon,
  X,
  Eye,
} from 'lucide-react'
import { AdminPasswordModal } from '@/components/modals/AdminPasswordModal'
import { ThermalFichaTicket } from '@/components/common/ThermalTickets'
import { toast } from 'sonner'

export default function Settings() {
  const { config, updateConfig, exportarBackup, importarBackup, zerarVendas, caixaAtivo } = usePos()

  const [formData, setFormData] = useState<Configuracoes>({ ...config })
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false)
  const [adminActionType, setAdminActionType] = useState<'reset' | 'import' | null>(null)
  const [pendingFileContent, setPendingFileContent] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem válido (PNG, JPG, SVG).')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setFormData((prev) => ({ ...prev, logomarca_base64: base64 }))
      toast.success('Logomarca carregada com sucesso!')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, logomarca_base64: undefined }))
    toast.success('Logomarca removida.')
  }

  // Ficha de demonstração para pré-visualização ao vivo
  const sampleFicha: Ficha = {
    id: 'fch-demo-preview',
    venda_id: 'vnd-demo',
    sequencial_venda: 142,
    produto_id: 'prod-demo',
    produto_nome: 'Pastel Especial de Carne',
    categoria_nome: 'Comidas Típicas',
    preco: 12.0,
    codigo_validacao: '9A7B-3C2F',
    hash_seguranca: 'AUTH:9A7B-3C2F:SEQ:00142:PID:prod-dem',
    sequencial: 345,
    data_emissao: new Date().toISOString(),
    operador: caixaAtivo ? caixaAtivo.operador : 'Operador 01',
    caixa_id: caixaAtivo ? caixaAtivo.id : 'cx-01',
    status: 'emitida',
    imprimir_imagem_ficha: true,
  }

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
          {/* SEÇÃO 1: DADOS DO EVENTO & LOGOMARCA */}
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

            {/* UPLOAD LOCAL DA LOGOMARCA (OFFLINE / BASE64) */}
            <div className="pt-2 border-t border-border">
              <Label className="text-xs font-bold uppercase text-muted-foreground block mb-2">
                Logomarca do Evento (Offline / Base64)
              </Label>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              {formData.logomarca_base64 ? (
                <div className="flex items-center gap-4 p-3 rounded-xl border border-border bg-muted/20">
                  <img
                    src={formData.logomarca_base64}
                    alt="Logo do Evento"
                    className="w-16 h-16 object-contain rounded bg-white p-1 border border-border"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                      Logomarca Carregada
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Armazenada localmente e pronta para impressão.
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => logoInputRef.current?.click()}
                        className="text-xs h-7 font-semibold"
                      >
                        Trocar Logo
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveLogo}
                        className="text-xs h-7 text-destructive hover:bg-destructive/10"
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Remover
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer bg-muted/10 hover:bg-muted/30 transition-all text-center"
                >
                  <ImageIcon className="w-8 h-8 text-muted-foreground mb-1" />
                  <span className="text-xs font-bold text-foreground">
                    Carregar Logomarca do Evento
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-0.5">
                    PNG, JPG ou SVG (salvo em base64 offline)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* SEÇÃO 2: MOTOR DE IMPRESSÃO & BOBINA */}
          <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2 border-b border-border pb-2">
              <Printer className="w-5 h-5 text-primary" />
              Configuração de Impressora Térmica
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                  Largura da Bobina Térmica
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

              <div className="p-3 rounded-xl border border-border bg-primary/5 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 font-bold text-xs text-primary">
                  <span>Modo de Emissão: Sempre Individual</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                  Cada unidade de cada item gera 1 ficha própria com QR code e código anti-fraude
                  únicos.
                </p>
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
        </div>

        {/* SEÇÃO 3: PERSONALIZAÇÃO COMPLETA DAS FICHAS COM PREVIEW AO VIVO */}
        <div className="p-6 rounded-2xl border-2 border-primary/20 bg-card shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Sliders className="w-5 h-5 text-primary" />
                Personalização Visual das Fichas Térmicas
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Escolha o que deve aparecer na ficha impressa e na pré-visualização. As alterações
                refletem em tempo real no modelo ao lado.
              </p>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs px-2.5 py-1 rounded bg-muted">
              <span>Bobina:</span>
              <strong className="text-foreground">{formData.largura_bobina}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* TOGGLES DE ELEMENTOS DA FICHA */}
            <div className="lg:col-span-7 space-y-3">
              {/* CABEÇALHO */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/10">
                <div>
                  <div className="font-bold text-xs">Cabeçalho (Nome e Subtítulo)</div>
                  <div className="text-[11px] text-muted-foreground">
                    Mostra o nome do evento e textos institucionais no topo.
                  </div>
                </div>
                <Switch
                  checked={formData.ficha_mostrar_cabecalho !== false}
                  onCheckedChange={(val) =>
                    setFormData({ ...formData, ficha_mostrar_cabecalho: val })
                  }
                />
              </div>

              {/* LOGOMARCA */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/10">
                <div>
                  <div className="font-bold text-xs">Exibir Logomarca no Cabeçalho</div>
                  <div className="text-[11px] text-muted-foreground">
                    {formData.logomarca_base64
                      ? 'Logomarca carregada e ativa.'
                      : 'Carregue uma logo na seção acima para ativar este campo.'}
                  </div>
                </div>
                <Switch
                  checked={formData.ficha_mostrar_logo !== false}
                  disabled={!formData.logomarca_base64}
                  onCheckedChange={(val) => setFormData({ ...formData, ficha_mostrar_logo: val })}
                />
              </div>

              {/* QR CODE */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/10">
                <div>
                  <div className="font-bold text-xs">Exibir QR Code</div>
                  <div className="text-[11px] text-muted-foreground">
                    QR Code 2D contendo o hash criptográfico para leitura rápida no balcão.
                  </div>
                </div>
                <Switch
                  checked={formData.ficha_mostrar_qrcode !== false}
                  onCheckedChange={(val) => setFormData({ ...formData, ficha_mostrar_qrcode: val })}
                />
              </div>

              {/* HASH ANTI-FRAUDE */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/10">
                <div>
                  <div className="font-bold text-xs">Exibir Hash Anti-Fraude Curto</div>
                  <div className="text-[11px] text-muted-foreground">
                    Código alfanumérico seguro (ex: 9A7B-3C2F) para digitação manual no balcão.
                  </div>
                </div>
                <Switch
                  checked={formData.ficha_mostrar_hash !== false}
                  onCheckedChange={(val) => setFormData({ ...formData, ficha_mostrar_hash: val })}
                />
              </div>

              {/* PREÇO */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/10">
                <div>
                  <div className="font-bold text-xs">Exibir Preço do Produto</div>
                  <div className="text-[11px] text-muted-foreground">
                    Mostra o valor pago na ficha emitida ao cliente.
                  </div>
                </div>
                <Switch
                  checked={formData.ficha_mostrar_preco !== false}
                  onCheckedChange={(val) => setFormData({ ...formData, ficha_mostrar_preco: val })}
                />
              </div>

              {/* DATA / HORA */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/10">
                <div>
                  <div className="font-bold text-xs">Exibir Data e Hora</div>
                  <div className="text-[11px] text-muted-foreground">
                    Timestamp exato do momento da compra.
                  </div>
                </div>
                <Switch
                  checked={formData.ficha_mostrar_data_hora !== false}
                  onCheckedChange={(val) =>
                    setFormData({ ...formData, ficha_mostrar_data_hora: val })
                  }
                />
              </div>

              {/* OPERADOR */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/10">
                <div>
                  <div className="font-bold text-xs">Exibir Operador e ID de Caixa</div>
                  <div className="text-[11px] text-muted-foreground">
                    Identificação de quem operou a venda e caixa emissor.
                  </div>
                </div>
                <Switch
                  checked={formData.ficha_mostrar_operador !== false}
                  onCheckedChange={(val) =>
                    setFormData({ ...formData, ficha_mostrar_operador: val })
                  }
                />
              </div>

              {/* RODAPÉ */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/10">
                <div>
                  <div className="font-bold text-xs">Exibir Mensagem de Rodapé</div>
                  <div className="text-[11px] text-muted-foreground">
                    Texto personalizado de aviso / validade no final do cupom.
                  </div>
                </div>
                <Switch
                  checked={formData.ficha_mostrar_rodape !== false}
                  onCheckedChange={(val) => setFormData({ ...formData, ficha_mostrar_rodape: val })}
                />
              </div>
            </div>

            {/* PREVIEW TÉRMICO AO VIVO */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-primary" />
                Pré-visualização Térmica em Tempo Real
              </div>
              <div className="p-4 rounded-2xl bg-slate-200 dark:bg-slate-900 border border-border flex justify-center w-full overflow-hidden shadow-inner">
                <ThermalFichaTicket ficha={sampleFicha} config={formData} showCutLine={false} />
              </div>
              <p className="text-[11px] text-muted-foreground text-center mt-2">
                Simulação fiel para bobina {formData.largura_bobina}.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
