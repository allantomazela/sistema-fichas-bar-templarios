/** Rodapé com os atalhos mais usados no balcão. */
export function AppFooter() {
  return (
    <footer className="h-7 sm:h-8 bg-slate-900 text-slate-300 px-2 sm:px-4 flex items-center justify-between text-[10px] sm:text-[11px] shrink-0 border-t border-slate-800">
      <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto py-1 no-scrollbar min-w-0">
        {ATALHOS_RODAPE.map((atalho) => (
          <span key={atalho.tecla} className={`flex items-center gap-1 shrink-0 ${atalho.classe ?? ''}`}>
            <kbd className="bg-slate-800 text-slate-200 px-1.5 py-0.2 rounded font-mono text-[10px] border border-slate-700">
              {atalho.tecla}
            </kbd>
            {atalho.rotulo}
          </span>
        ))}
      </div>
      <div className="hidden sm:flex items-center gap-2 text-slate-400 shrink-0">
        <span>Bar Templários · Dados locais</span>
      </div>
    </footer>
  )
}

const ATALHOS_RODAPE: { tecla: string; rotulo: string; classe?: string }[] = [
  { tecla: 'F1', rotulo: 'PDV' },
  { tecla: 'F2', rotulo: 'Caixa' },
  { tecla: 'F3', rotulo: 'Produtos', classe: 'hidden sm:flex' },
  { tecla: 'Enter', rotulo: 'Finalizar' },
  { tecla: 'Esc', rotulo: 'Limpar', classe: 'hidden md:flex' },
]
