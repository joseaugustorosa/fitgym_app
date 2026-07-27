import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { countCheckInsToday, listPosts, listStudents } from '../../services/api'

export function AdminDashboardPage() {
  const [students, setStudents] = useState(0)
  const [checkIns, setCheckIns] = useState(0)
  const [posts, setPosts] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([listStudents(), countCheckInsToday(), listPosts(5)])
      .then(([s, c, p]) => {
        setStudents(s.filter((x) => x.active).length)
        setCheckIns(c)
        setPosts(p.length)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-neutral-400">Carregando dashboard…</p>

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold">Dashboard</h2>
        <p className="mt-1 text-sm text-neutral-400">Visão rápida da academia</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'Alunos ativos', value: students },
          { label: 'Check-ins hoje', value: checkIns },
          { label: 'Posts recentes', value: posts },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl bg-surface-2 p-4">
            <p className="text-sm text-neutral-400">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-brand">{card.value}</p>
          </div>
        ))}
      </div>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
          Ações rápidas
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            {
              to: '/admin/alunos',
              title: 'Cadastrar aluno',
              subtitle: 'Nome, e-mail e senha em 1 passo',
            },
            {
              to: '/admin/treinos',
              title: 'Montar treino',
              subtitle: 'Importar catálogo ou criar exercício',
            },
            {
              to: '/admin/dieta',
              title: 'Editar dieta',
              subtitle: 'Template padrão da academia',
            },
            {
              to: '/admin/comunidade',
              title: 'Criar desafio',
              subtitle: 'Engajar alunos no feed',
            },
          ].map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="rounded-2xl bg-surface-2 p-4 transition-colors active:bg-surface-3"
            >
              <p className="font-semibold text-brand">{action.title}</p>
              <p className="mt-1 text-sm text-neutral-400">{action.subtitle}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
