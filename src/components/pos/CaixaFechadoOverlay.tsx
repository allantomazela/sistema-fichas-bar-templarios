import { useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Bloqueia o PDV enquanto não houver caixa aberto. */
export function CaixaFechadoOverlay() {
  const navigate = useNavigate()

  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-30 flex items-center justify-center p-4">
      <div className="max-w-md w-full p-6 rounded-2xl bg-card border-2 border-amber-500/50 shadow-2xl text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-500 mx-auto flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-xl font-black text-foreground">O Caixa está Fechado</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Para iniciar as vendas e emitir fichas no balcão, é obrigatório abrir um turno de caixa
            com o saldo inicial.
          </p>
        </div>
        <Button
          onClick={() => navigate('/caixa')}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base"
        >
          Abrir Caixa Agora (F2)
        </Button>
      </div>
    </div>
  )
}
