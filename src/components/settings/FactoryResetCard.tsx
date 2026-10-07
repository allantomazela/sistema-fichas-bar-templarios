import { useState } from 'react'
import { usePos } from '@/context/PosContext'
import { AdminPasswordModal } from '@/components/modals/AdminPasswordModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Download, Trash2 } from 'lucide-react'

type Etapa = 'fechado' | 'confirmar' | 'senha'

/** Zera o banco inteiro (menos configurações): confirmação digitada + backup opcional + senha. */
export function FactoryResetCard() {
  const { zerarBancoCompleto, exportarBackup } = usePos()
  const [etapa, setEtapa] = useState<Etapa>('fechado')
  const [confirmacao, setConfirmacao] = useState('')

  const fechar = () => {
    setEtapa('fechado')
    setConfirmacao('')
  }

  return (
    <div className="p-4 rounded-xl border-2 border-destructive/40 bg-destructive/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <div className="font-bold text-sm text-destructive flex items-center gap-1.5">
          <Trash2 className="w-4 h-4" />
          Zerar banco de dados (começar do zero)
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
          Apaga vendas, fichas, caixas, lotes, estoque, <strong>produtos e categorias</strong>. Só as
          configurações (evento, impressora e senha) são mantidas. Não pode ser desfeito.
        </p>
      </div>
      <Button
        type="button"
        variant="destructive"
        className="font-bold gap-2 shrink-0"
        onClick={() => setEtapa('confirmar')}
      >
        <Trash2 className="w-4 h-4" />
        Zerar tudo
      </Button>

      <Dialog open={etapa === 'confirmar'} onOpenChange={(o) => !o && fechar()}>
        <DialogContent className="max-w-md bg-background text-foreground border border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-destructive">Apagar todos os dados?</DialogTitle>
            <DialogDescription className="text-xs">
              Serão apagados: vendas, fichas, caixas e movimentações, lotes de fichas antecipadas,
              histórico de estoque, produtos e categorias. O sistema fica vazio para um novo cadastro.
            </DialogDescription>
            <p className="text-xs text-muted-foreground">
              No aplicativo instalado, um <strong>backup automático</strong> é salvo antes na pasta
              de dados do sistema (subpasta <code>backups</code>). Se ele falhar, nada é apagado.
            </p>
          </DialogHeader>

          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 font-bold"
              onClick={() => void exportarBackup()}
            >
              <Download className="w-4 h-4" />
              Salvar uma cópia extra (ex.: pen drive)
            </Button>
            <div>
              <Label htmlFor="confirma-zerar" className="text-xs font-bold uppercase text-muted-foreground">
                Para confirmar, digite ZERAR
              </Label>
              <Input
                id="confirma-zerar"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                autoComplete="off"
                className="mt-1 font-mono tracking-widest"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={fechar}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="font-bold"
              disabled={confirmacao.trim().toUpperCase() !== PALAVRA_CONFIRMACAO}
              onClick={() => setEtapa('senha')}
            >
              Apagar tudo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminPasswordModal
        isOpen={etapa === 'senha'}
        onClose={fechar}
        onSuccess={() => void zerarBancoCompleto()}
        title="Zerar banco de dados"
        description="Última confirmação: todos os dados (menos as configurações) serão apagados."
      />
    </div>
  )
}

const PALAVRA_CONFIRMACAO = 'ZERAR'
