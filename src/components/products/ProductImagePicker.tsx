import React, { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Image as ImageIcon, Upload, X, Loader2 } from 'lucide-react'
import { compressProductImage } from '@/lib/productImage'
import { toast } from 'sonner'

type ProductImagePickerProps = {
  value?: string
  onChange: (base64?: string) => void
}

export function ProductImagePicker({ value, onChange }: ProductImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)

  async function processFile(file: File) {
    setLoading(true)
    try {
      const base64 = await compressProductImage(file)
      onChange(base64)
      toast.success('Foto do produto carregada.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao processar a imagem.'
      toast.error(message)
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void processFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void processFile(file)
  }

  return (
    <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
      <Label className="text-xs font-bold uppercase text-muted-foreground block">
        Foto do produto (somente na tela)
      </Label>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/jpg"
        onChange={handleInputChange}
        className="hidden"
      />

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex items-center gap-4 rounded-xl border-2 border-dashed p-3 transition-colors ${
          dragging ? 'border-primary bg-primary/5' : 'border-border bg-background'
        }`}
      >
        {value ? (
          <div className="relative group shrink-0">
            <img
              src={value}
              alt="Previa do produto"
              className="w-24 h-24 object-cover rounded-xl border-2 border-primary/40 shadow-sm"
            />
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform"
              title="Remover foto"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={() => inputRef.current?.click()}
            className="w-24 h-24 rounded-xl border border-border hover:border-primary/60 cursor-pointer flex flex-col items-center justify-center text-muted-foreground hover:text-foreground bg-muted/30 transition-all shrink-0 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <ImageIcon className="w-7 h-7 mb-1 opacity-60" />
                <span className="text-[10px] font-bold">Adicionar</span>
              </>
            )}
          </button>
        )}

        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => inputRef.current?.click()}
              className="text-xs font-semibold gap-1.5 h-8"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              {value ? 'Trocar foto' : 'Selecionar foto'}
            </Button>
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(undefined)}
                className="text-xs h-8 text-muted-foreground hover:text-destructive"
              >
                Remover
              </Button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Aparece apenas na tela de venda e no cadastro, para facilitar a identificação. A ficha
            térmica imprime só o nome do produto — a foto nunca sai na impressão.
          </p>
        </div>
      </div>
    </div>
  )
}
