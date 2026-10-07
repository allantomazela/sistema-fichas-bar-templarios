import React, { useState } from 'react'
import { usePos } from '@/context/PosContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Lock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface AdminPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  title?: string
  description?: string
}

export const AdminPasswordModal: React.FC<AdminPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'Autorização de Gerência',
  description = 'Digite a senha de administrador para prosseguir com esta operação.',
}) => {
  const { config } = usePos()
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(false)

  const handleConfirm = () => {
    if (senha === config.senha_admin) {
      setSenha('')
      setErro(false)
      onSuccess()
      onClose()
    } else {
      setErro(true)
      toast.error('Senha de administrador incorreta!')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleConfirm()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-md bg-background text-foreground border border-border shadow-2xl"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2">
            <Lock className="w-6 h-6" />
          </div>
          <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
          <p className="text-xs text-muted-foreground">{description}</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Senha Master / Admin</Label>
            <Input
              type="password"
              placeholder="Digite a senha (padrão: 1234)"
              value={senha}
              onChange={(e) => {
                setSenha(e.target.value)
                setErro(false)
              }}
              autoFocus
              className={`h-11 font-mono text-center tracking-widest text-lg ${
                erro ? 'border-destructive focus-visible:ring-destructive' : ''
              }`}
            />
            {erro && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Senha incorreta. Tente novamente ou use o padrão (1234).
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} className="bg-primary hover:bg-primary/90 font-bold">
            Autorizar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
