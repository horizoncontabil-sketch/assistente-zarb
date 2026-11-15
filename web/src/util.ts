// Meta do dia combinada com o Paulo em 15/11/2026 (plano-pessoal-2027-02 no segundo cérebro).
export const META = { kcal: 2000, proteina: 165 }

export const fmt = (n: number) => Math.round(n).toLocaleString('pt-BR')
export const kgTexto = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

export function saudacao(d = new Date()) {
  const h = d.getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

export const dataLonga = (d: Date) => {
  const t = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export const numero = (t: string): number | null => {
  const n = Number(t.replace(',', '.').trim())
  return t.trim() && Number.isFinite(n) && n >= 0 ? n : null
}
