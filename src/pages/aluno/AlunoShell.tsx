import { useState } from 'react'
import { BottomNav } from '../../components/BottomNav'
import { SessaoPage } from './SessaoPage'
import { TreinoPage } from './TreinoPage'
import { DietaPage } from './DietaPage'
import { ComunidadePage } from './ComunidadePage'
import type { TabId } from '../../types'

export function AlunoShell() {
  const [activeTab, setActiveTab] = useState<TabId>('sessao')

  const pages: Record<TabId, React.ReactNode> = {
    sessao: <SessaoPage onNavigate={setActiveTab} />,
    treino: <TreinoPage />,
    dieta: <DietaPage />,
    comunidade: <ComunidadePage />,
  }

  return (
    <div className="app-shell mx-auto flex h-full max-w-[430px] flex-col">
      <main key={activeTab} className="page-enter scroll-area flex-1 overflow-y-auto pt-[env(safe-area-inset-top)]">
        {pages[activeTab]}
      </main>
      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  )
}
