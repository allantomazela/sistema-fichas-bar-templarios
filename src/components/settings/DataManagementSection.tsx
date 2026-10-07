import { useRef, useState, type ReactNode } from 'react'
import { isTauri } from '@tauri-apps/api/core'
import { AlertTriangle, Download, HardDrive, RotateCcw, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { usePos } from '@/context/PosContext'
import { Button } from '@/components/ui/button'
import { AdminPasswordModal } from '@/components/modals/AdminPasswordModal'
import { pickBackupFileContent } from '@/services/backupFiles'
import { FactoryResetCard } from './FactoryResetCard'

type AcaoProtegida = { tipo: 'reset' } | { tipo: 'import'; conteudo: string }

const FUNDO_TROCO_NOVO_EVENTO = 150.0

/** Backup, restauração, novo evento e "zerar tudo" — tudo que mexe no banco inteiro. */
export function DataManagementSection() {
  const { exportarBackup, importarBackup, zerarVendas, caixaAtivo } = usePos()
  const [acaoPendente, setAcaoPendente] = useState<AcaoProtegida | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const pedirImportacao = (conteudo: string) => setAcaoPendente({ tipo: 'import', conteudo })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => pedirImportacao(event.target?.result as string)
    reader.readAsText(file)
  }

  const handleImportClick = async () => {
    if (!isTauri()) {
      fileInputRef.current?.click()
      return
    }
    try {
      const content = await pickBackupFileContent()
      if (content) pedirImportacao(content)
    } catch (err) {
      console.error(err)
      toast.error('Falha ao abrir o arquivo de backup.')
    }
  }

  const executarAcao = () => {
    if (acaoPendente?.tipo === 'reset') {
      zerarVendas(FUNDO_TROCO_NOVO_EVENTO, caixaAtivo ? caixaAtivo.operador : 'Operador Principal')
    } else if (acaoPendente?.tipo === 'import') {
      importarBackup(acaoPendente.conteudo)
    }
  }

  return (
    <div className="p-6 rounded-2xl border-2 border-border bg-card shadow-xs space-y-4 mt-8">
      <h3 className="font-bold text-base text-foreground flex items-center gap-2 border-b border-border pb-3">
        <HardDrive className="w-5 h-5 text-primary" />
        Gestão de Banco de Dados Local (Offline-First)
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ActionTile
          title="Exportar Backup Completo"
          description="Gera um arquivo JSON contendo todos os cadastros, vendas e turnos salvos."
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => void exportarBackup()}
            className="w-full font-bold gap-2 border-primary/30 text-primary hover:bg-primary/10"
          >
            <Download className="w-4 h-4" />
            Baixar Backup JSON
          </Button>
        </ActionTile>

        <ActionTile
          title="Restaurar Banco de Dados"
          description="Carrega um arquivo de backup previamente exportado neste ou em outro PDV."
        >
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />
          <Button type="button" variant="outline" onClick={() => void handleImportClick()} className="w-full font-bold gap-2">
            <Upload className="w-4 h-4" />
            Carregar Arquivo JSON
          </Button>
        </ActionTile>

        <ActionTile
          danger
          title={
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Zerar Vendas para Novo Evento
            </span>
          }
          description="Mantém as categorias e produtos cadastrados, mas zera todas as vendas e fichas."
        >
          <Button
            type="button"
            variant="destructive"
            onClick={() => setAcaoPendente({ tipo: 'reset' })}
            className="w-full font-bold gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Zerar Base de Vendas
          </Button>
        </ActionTile>
      </div>

      <FactoryResetCard />

      <AdminPasswordModal
        isOpen={acaoPendente !== null}
        onClose={() => setAcaoPendente(null)}
        onSuccess={executarAcao}
        title={
          acaoPendente?.tipo === 'reset'
            ? 'Confirmar Reinicialização de Vendas'
            : 'Confirmar Restauração de Banco'
        }
        description="Esta ação requer permissão de administrador para ser executada."
      />
    </div>
  )
}

interface ActionTileProps {
  title: ReactNode
  description: string
  children: ReactNode
  danger?: boolean
}

function ActionTile({ title, description, children, danger }: ActionTileProps) {
  return (
    <div
      className={
        danger
          ? 'p-4 rounded-xl border border-destructive/20 bg-destructive/5 flex flex-col justify-between space-y-3'
          : 'p-4 rounded-xl border border-border bg-muted/10 flex flex-col justify-between space-y-3'
      }
    >
      <div>
        <div className={danger ? 'font-bold text-sm text-destructive' : 'font-bold text-sm'}>{title}</div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div>{children}</div>
    </div>
  )
}
