// Meta de composição corporal quebrada em mês, semana e dia. Nada aqui tem dados do Paulo:
// os números dele ficam só no PC (plano.json), digitados na tela "Montar minha meta".
import { diaLocal } from './datas'

export type Plano = {
  inicio: string // AAAA-MM-DD
  fim: string
  pesoInicial: number
  gorduraInicial: number // %
  gorduraAlvo: number // %
  alturaCm: number
  idade: number
  kcal: number
  proteina: number
  carbo: number
  gordura: number
  treinosSemana: number
  refeicaoLivreKcal: number
}

export type RegistroCorpo = {
  dia: string
  peso?: number
  abdomen?: number
  gordura?: number
  musculo?: number
  visceral?: number
  pressaoSis?: number
  pressaoDia?: number
  treino?: boolean
}

const MS_DIA = 86_400_000
const data = (s: string) => new Date(`${s}T12:00:00`)
const r1 = (n: number) => Math.round(n * 10) / 10

export const massaMagra = (p: Pick<Plano, 'pesoInicial' | 'gorduraInicial'>) => p.pesoInicial * (1 - p.gorduraInicial / 100)
export const pesoAlvo = (p: Plano) => r1(massaMagra(p) / (1 - p.gorduraAlvo / 100))
export const diasDoPlano = (p: Plano) => Math.round((data(p.fim).getTime() - data(p.inicio).getTime()) / MS_DIA)
export const semanasDoPlano = (p: Plano) => Math.round(diasDoPlano(p) / 7)

// Gordura estimada pelo peso, supondo a massa magra do começo (a bioimpedância corrige quando chega).
export const gorduraPeloPeso = (p: Plano, peso: number) => r1((1 - massaMagra(p) / peso) * 100)

// Peso esperado num dia: linha reta do início ao fim.
export function pesoEsperado(p: Plano, dia: string): number {
  const t = Math.min(1, Math.max(0, (data(dia).getTime() - data(p.inicio).getTime()) / (diasDoPlano(p) * MS_DIA)))
  return r1(p.pesoInicial + (pesoAlvo(p) - p.pesoInicial) * t)
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

// Um marco por mês: o último dia de cada mês dentro do plano (o último é o fim).
export function marcos(p: Plano): { mes: string; dia: string; peso: number; gordura: number }[] {
  const saida = []
  const fim = data(p.fim)
  let d = data(p.inicio)
  while (d <= fim) {
    const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0, 12)
    const dia = diaLocal(ultimo > fim ? fim : ultimo)
    const peso = pesoEsperado(p, dia)
    saida.push({ mes: MESES[d.getMonth()], dia, peso, gordura: gorduraPeloPeso(p, peso) })
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1, 12)
  }
  return saida
}

export function semanaDe(dia: string): string[] {
  const d = data(dia)
  const seg = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7), 12)
  return Array.from({ length: 7 }, (_, i) => diaLocal(new Date(seg.getFullYear(), seg.getMonth(), seg.getDate() + i, 12)))
}

export function mediaPeso(registros: RegistroCorpo[], dias: string[]): number | null {
  const pesos = registros.filter((r) => dias.includes(r.dia) && r.peso).map((r) => r.peso!)
  return pesos.length ? r1(pesos.reduce((a, b) => a + b, 0) / pesos.length) : null
}

// Média móvel de 7 dias de cada dia com peso (para o gráfico).
export function mediaMovel(registros: RegistroCorpo[]): { dia: string; media: number }[] {
  const comPeso = registros.filter((r) => r.peso).sort((a, b) => a.dia.localeCompare(b.dia))
  return comPeso.map((r) => {
    const ini = data(r.dia).getTime() - 6 * MS_DIA
    const janela = comPeso.filter((x) => data(x.dia).getTime() >= ini && x.dia <= r.dia)
    return { dia: r.dia, media: r1(janela.reduce((s, x) => s + x.peso!, 0) / janela.length) }
  })
}

// Metas sugeridas a partir dos dados digitados (o Paulo pode mudar qualquer número depois).
// Gasto: Mifflin-St Jeor (homem) x 1,5 para quem treina 3 a 4 vezes. Déficit: o que a meta pede,
// entre 300 e 750 kcal por dia. Proteína 2,1 g/kg; gordura 0,8 g/kg; carboidrato o resto.
export function sugerirMetas(p: Omit<Plano, 'kcal' | 'proteina' | 'carbo' | 'gordura'>): Pick<Plano, 'kcal' | 'proteina' | 'carbo' | 'gordura'> {
  const basal = 10 * p.pesoInicial + 6.25 * p.alturaCm - 5 * p.idade + 5
  const gasto = basal * 1.5
  const gorduraAPerder = p.pesoInicial - massaMagra(p) / (1 - p.gorduraAlvo / 100)
  const deficit = Math.min(750, Math.max(300, (gorduraAPerder * 7700) / Math.max(1, diasDoPlano(p as Plano))))
  const kcal = Math.max(1700, Math.round((gasto - deficit) / 50) * 50)
  const proteina = Math.round((p.pesoInicial * 2.1) / 5) * 5
  const gordura = Math.round((p.pesoInicial * 0.8) / 5) * 5
  const carbo = Math.max(0, Math.round((kcal - proteina * 4 - gordura * 9) / 4 / 5) * 5)
  return { kcal, proteina, carbo, gordura }
}

export function resumoSemana(p: Plano, registros: RegistroCorpo[], diasNaMeta: (dia: string) => boolean, hoje: string) {
  const dias = semanaDe(hoje)
  const ate = dias.filter((d) => d <= hoje)
  return {
    dias,
    mediaPeso: mediaPeso(registros, dias),
    alvoMedia: pesoEsperado(p, dias[6]),
    treinos: registros.filter((r) => dias.includes(r.dia) && r.treino).length,
    diasNaMeta: ate.filter(diasNaMeta).length,
    diasContados: ate.length,
  }
}
