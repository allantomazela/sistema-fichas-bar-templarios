import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Image as ImageIcon, X } from 'lucide-react'
import { toast } from 'sonner'

interface LogoPickerProps {
  value?: string
  onChange: (base64: string | undefined) => void
}

/** Logomarca do evento guardada em base64 (funciona offline). */
export function LogoPicker({ value, onChange }: LogoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const abrirSeletor = () => inputRef.current?.click()

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem válido (PNG, JPG, SVG).')
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      onChange(event.target?.result as string)
      toast.success('Logomarca carregada com sucesso!')
    }
    reader.readAsDataURL(file)
  }

  const remover = () => {
    onChange(undefined)
    toast.success('Logomarca removida.')
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
      {value ? (
        <div className="flex items-center gap-4 p-3 rounded-xl border border-border bg-muted/20">
          <img
            src={value}
            alt="Logo do Evento"
            className="w-16 h-16 object-contain rounded bg-white p-1 border border-border"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground truncate">Logomarca Carregada</p>
            <p className="text-[11px] text-muted-foreground">
              Armazenada localmente e pronta para impressão.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Button type="button" variant="outline" size="sm" onClick={abrirSeletor} className="text-xs h-7 font-semibold">
                Trocar Logo
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={remover}
                className="text-xs h-7 text-destructive hover:bg-destructive/10"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Remover
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={abrirSeletor}
          className="w-full flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer bg-muted/10 hover:bg-muted/30 transition-all text-center"
        >
          <ImageIcon className="w-8 h-8 text-muted-foreground mb-1" />
          <span className="text-xs font-bold text-foreground">Carregar Logomarca do Evento</span>
          <span className="text-[11px] text-muted-foreground mt-0.5">
            PNG, JPG ou SVG (salvo em base64 offline)
          </span>
        </button>
      )}
    </>
  )
}
