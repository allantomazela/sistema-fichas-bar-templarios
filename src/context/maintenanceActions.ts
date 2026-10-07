import { toast } from 'sonner'
import { LocalDatabaseService } from '@/services/db'
import {
  saveAutomaticBackup,
  saveBackupFile,
  type MotivoBackupAutomatico,
} from '@/services/backupFiles'
import type { DatabaseBackup } from '@/types/pos'

export interface DependenciasManutencao {
  /** Recarrega configuração, catálogo, caixa, vendas e estoque a partir do banco. */
  recarregarTudo: () => void
  /** Limpa carrinho, última venda e pré-visualização de impressão. */
  limparTelaDeVenda: () => void
  persistirAgora: (mensagemFalha: string) => void
}

export interface AcoesManutencao {
  zerarVendas: (fundoTroco: number, operador: string) => void
  zerarBancoCompleto: () => Promise<boolean>
  importarBackup: (jsonContent: string) => Promise<boolean>
  exportarBackup: () => Promise<void>
}

/** Backup, restauração e resets — operações que trocam o banco inteiro de uma vez. */
export function criarAcoesDeManutencao(deps: DependenciasManutencao): AcoesManutencao {
  const concluir = (mensagem: string, caminhoBackup: string | null, falhaGravacao: string) => {
    deps.recarregarTudo()
    deps.limparTelaDeVenda()
    toast.success(mensagem, {
      description: caminhoBackup ? `Backup automático do estado anterior: ${caminhoBackup}` : undefined,
      duration: caminhoBackup ? 15000 : undefined,
    })
    deps.persistirAgora(falhaGravacao)
  }

  return {
    zerarVendas(fundoTroco, operador) {
      try {
        LocalDatabaseService.resetVendasParaNovoEvento(operador, fundoTroco)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Não foi possível reiniciar as vendas.')
        return
      }
      concluir('Base de vendas reiniciada para um novo evento!', null, 'Reinício feito, mas falhou gravar no disco.')
    },

    async zerarBancoCompleto() {
      const backup = await salvarBackupAntes('antes_de_zerar')
      if (backup === false) return false
      try {
        LocalDatabaseService.zerarBancoCompleto()
      } catch (err) {
        console.error('Falha ao zerar o banco de dados', err)
        toast.error('Não foi possível zerar o banco por completo. Feche e abra o aplicativo e tente de novo.')
        return false
      }
      concluir(
        'Banco de dados zerado. Cadastre categorias e produtos para começar.',
        backup,
        'Banco zerado, mas falhou gravar no disco. Feche e abra o aplicativo.',
      )
      return true
    },

    async importarBackup(jsonContent) {
      const dados = lerArquivoDeBackup(jsonContent)
      if (!dados) return false
      const backup = await salvarBackupAntes('antes_de_restaurar')
      if (backup === false) return false
      if (!LocalDatabaseService.importBackup(dados)) {
        toast.error('Não foi possível restaurar o backup. Os dados atuais podem estar incompletos: restaure o backup automático.')
        return false
      }
      concluir('Backup restaurado com sucesso!', backup, 'Backup restaurado, mas falhou gravar no disco.')
      return true
    },

    async exportarBackup() {
      try {
        const ok = await saveBackupFile(serializarBackup())
        if (ok) toast.success('Backup exportado com sucesso!')
      } catch (err) {
        console.error(err)
        toast.error('Falha ao exportar o backup.')
      }
    },
  }
}

function serializarBackup(): string {
  return JSON.stringify(LocalDatabaseService.exportBackup(), null, 2)
}

/** Caminho do backup (null no navegador) ou false se falhou — nesse caso nada deve ser alterado. */
async function salvarBackupAntes(motivo: MotivoBackupAutomatico): Promise<string | null | false> {
  try {
    return await saveAutomaticBackup(serializarBackup(), motivo)
  } catch (err) {
    console.error(`Falha no backup automático (${motivo})`, err)
    toast.error('Não foi possível salvar o backup automático. Nada foi alterado.')
    return false
  }
}

/** Valida o arquivo antes de mexer em qualquer coisa. */
function lerArquivoDeBackup(jsonContent: string): DatabaseBackup | null {
  let dados: unknown
  try {
    dados = JSON.parse(jsonContent)
  } catch {
    toast.error('O arquivo escolhido não é um backup válido (JSON ilegível).')
    return null
  }
  if (!LocalDatabaseService.isBackupValido(dados)) {
    toast.error('Estrutura de backup inválida: faltam configurações, categorias ou produtos.')
    return null
  }
  return dados
}
