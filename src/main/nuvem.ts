// Base única com o celular: o mesmo Supabase pessoal do app do iPhone. Login uma vez (e-mail e senha do app);
// a sessão fica cifrada pelo cofre do Windows. Sem login, o PC segue funcionando só com o arquivo local.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cifrar, decifrar } from './config'
import { gravarJson, lerJson } from './armazem'
import { aplicarRemoto, diferencas, paraLinhas, type Linha, type Pendentes } from '../shared/sincronia'

const URL = 'https://xbqfrjgvevpuiybsvdco.supabase.co'
const CHAVE = 'sb_publishable_QCQmEl6TGbLXHQgb9ze6bA_ilCkmnks'

const cofre = {
  getItem: (k: string) => decifrar(lerJson<Record<string, string>>('nuvem-sessao', {})[k]),
  setItem: (k: string, v: string) => gravarJson('nuvem-sessao', { ...lerJson<Record<string, string>>('nuvem-sessao', {}), [k]: cifrar(v) }),
  removeItem: (k: string) => {
    const x = lerJson<Record<string, string>>('nuvem-sessao', {})
    delete x[k]
    gravarJson('nuvem-sessao', x)
  },
}

export const db: SupabaseClient = createClient(URL, CHAVE, { auth: { storage: cofre, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })

let email: string | null = null
export const conectado = () => email
export async function iniciar(aoMudar: () => void) {
  const { data } = await db.auth.getSession()
  email = data.session?.user.email ?? null
  db.auth.onAuthStateChange((_e, s) => {
    const novo = s?.user.email ?? null
    if (novo !== email) {
      email = novo
      aoMudar()
    }
  })
}
export async function entrar(e: string, senha: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  const { error } = await db.auth.signInWithPassword({ email: e, password: senha })
  if (!error) return { ok: true }
  if (/Invalid login/i.test(error.message)) return { ok: false, erro: 'E-mail ou senha não conferem.' }
  if (/not confirmed/i.test(error.message)) return { ok: false, erro: 'Falta confirmar o e-mail.' }
  return { ok: false, erro: 'Não deu para entrar agora. Confira a internet.' }
}
export const sair = () => db.auth.signOut()

// Uma coleção sincronizada (tarefas ou hábitos). Guarda localmente o que ainda não subiu.
export function colecao<T extends { id: string }>(tabela: 'tarefas' | 'habitos' | 'plano' | 'receitas' | 'alimentos_meus', arquivoLocal: string) {
  const arqPend = `${arquivoLocal}-pendentes`
  let pendentes: Pendentes<T> = lerJson<Pendentes<T>>(arqPend, {})
  const guardar = () => gravarJson(arqPend, pendentes)
  let subindo = false
  return {
    // Chamado depois de cada mudança local.
    mudou(antes: T[], depois: T[]) {
      pendentes = { ...pendentes, ...diferencas(antes, depois, new Date().toISOString()) }
      guardar()
      void this.subir()
    },
    // Primeira vez conectado: tudo o que está no PC sobe.
    subirTudo(itens: T[]) {
      const em = new Date(0).toISOString() // não passa por cima do que já está na nuvem
      for (const x of itens) if (!pendentes[x.id]) pendentes[x.id] = { dados: x, em }
      guardar()
    },
    async subir() {
      if (!email || subindo || !Object.keys(pendentes).length) return
      subindo = true
      const enviando = pendentes
      try {
        const { error } = await db.from(tabela).upsert(paraLinhas(enviando), { onConflict: 'dono,id' })
        if (error) return
        // Só sai da fila o que não mudou de novo enquanto subia.
        pendentes = Object.fromEntries(Object.entries(pendentes).filter(([id, p]) => enviando[id]?.em !== p.em))
        guardar()
      } finally {
        subindo = false
      }
    },
    // Lista da nuvem com os pendentes por cima; null se não conectado ou sem internet.
    async puxar(): Promise<T[] | null> {
      if (!email) return null
      await this.subir()
      const { data, error } = await db.from(tabela).select('id,dados,apagado,atualizado_em')
      if (error || !data) return null
      return aplicarRemoto(data as Linha<T>[], pendentes)
    },
  }
}

// Coleção gravada em tabela própria do celular (refeições, registro do dia): o aparelho só traduz as linhas.
// O que está pendente no PC vale até subir; depois, vale a nuvem.
export type Tradutor<T extends { id: string }> = {
  ler: () => Promise<T[] | null>
  gravar: (x: T) => Promise<boolean>
  apagar: (id: string) => Promise<boolean>
}
export function colecaoMapeada<T extends { id: string }>(arquivoLocal: string, t: Tradutor<T>) {
  const arqPend = `${arquivoLocal}-pendentes`
  let pendentes: Pendentes<T> = lerJson<Pendentes<T>>(arqPend, {})
  const guardar = () => gravarJson(arqPend, pendentes)
  let subindo = false
  return {
    mudou(antes: T[], depois: T[]) {
      pendentes = { ...pendentes, ...diferencas(antes, depois, new Date().toISOString()) }
      guardar()
      void this.subir()
    },
    subirTudo(itens: T[]) {
      const em = new Date(0).toISOString()
      for (const x of itens) if (!pendentes[x.id]) pendentes[x.id] = { dados: x, em }
      guardar()
    },
    async subir() {
      if (!email || subindo) return
      subindo = true
      try {
        for (const [id, p] of Object.entries(pendentes)) {
          const ok = p.dados ? await t.gravar(p.dados) : await t.apagar(id)
          if (!ok) return
          if (pendentes[id]?.em === p.em) {
            const { [id]: _, ...resto } = pendentes
            pendentes = resto
            guardar()
          }
        }
      } catch {
        // sem internet: tenta de novo na próxima volta
      } finally {
        subindo = false
      }
    },
    async puxar(): Promise<T[] | null> {
      if (!email) return null
      await this.subir()
      const l = await t.ler()
      if (!l) return null
      return aplicarRemoto(l.map((dados) => ({ id: dados.id, dados, apagado: false, atualizado_em: '' })), pendentes)
    },
  }
}

export const deu = (r: { error: unknown }) => !r.error
