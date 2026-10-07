import { usePos } from '@/context/PosContext'
import type { Produto } from '@/types/pos'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DeleteProductDialogProps {
  produto: Produto | null
  onClose: () => void
}

/** Confirmação de exclusão de produto (usada em Produtos e em Estoque). */
export function DeleteProductDialog({ produto, onClose }: DeleteProductDialogProps) {
  const { deleteProduto } = usePos()

  const handleConfirm = () => {
    if (produto) deleteProduto(produto.id)
    onClose()
  }

  return (
    <AlertDialog open={!!produto} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
          <AlertDialogDescription>
            O produto <strong>{produto?.nome}</strong> será removido do catálogo. Esta ação não pode
            ser desfeita. Vendas e o histórico de estoque já registrados continuam nos relatórios.
            Preferindo apenas ocultar no balcão, edite e desative o produto.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
