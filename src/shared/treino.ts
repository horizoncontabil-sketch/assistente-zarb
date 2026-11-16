// Plano de treino do Paulo (fechado com ele em 15/11/2026): superior/inferior, seg/ter/qui/sáb às 6h30.
// Mudança de exercício ou de regra é decisão dele; o detalhe está no segundo cérebro (plano-pessoal-2027-02).

export type Aquecimento = { pct: number; reps: number } // pct = % da carga de trabalho (0 = só a barra)
export type Exercicio = {
  id: string
  nome: string
  series: number
  faixa: [number, number]
  porLado?: boolean
  descanso: number // segundos
  descansoTexto: string
  aquecimento: Aquecimento[]
  passo: number // kg a subir quando fecha o topo da faixa
  dicas: string[]
}
export type Treino = { id: 'supA' | 'infA' | 'supB' | 'infB'; nome: string; foco: string; antes: string[]; exercicios: Exercicio[] }

const SUPERIOR_ANTES = ['2 a 3 min de esteira ou bicicleta leve', '10 rotações de braço para a frente e 10 para trás', '15 face pulls bem leves']
const INFERIOR_ANTES = ['3 min de bicicleta leve', 'Se o aquecimento incomodar a perna, vá direto para as opções com máquina']
const PERNA = 'Perna em recuperação: na 1ª semana termine com 3 repetições sobrando. Dor no ponto da lesão, para.'

export const TREINOS: Treino[] = [
  {
    id: 'supA',
    nome: 'Superior A',
    foco: 'Peito e costas',
    antes: SUPERIOR_ANTES,
    exercicios: [
      { id: 'supino-inclinado-halteres', nome: 'Supino inclinado com halteres', series: 4, faixa: [6, 8], descanso: 150, descansoTexto: '2 a 3 min', aquecimento: [{ pct: 50, reps: 12 }, { pct: 75, reps: 5 }], passo: 2,
        dicas: ['Banco a 30°, segundo ou terceiro furo.', 'Escápulas juntas e para baixo, pés firmes.', 'Desce em 2 s até a altura do peito, cotovelos a 45°.', 'Sobe para cima e um pouco para dentro, sem bater os halteres.', 'Sentiu na frente do ombro: baixe o banco um furo.'] },
      { id: 'puxada-aberta', nome: 'Puxada aberta', series: 4, faixa: [8, 10], descanso: 120, descansoTexto: '2 min', aquecimento: [{ pct: 50, reps: 10 }], passo: 5,
        dicas: ['Pegada um pouco mais aberta que os ombros, polegar por cima.', 'Peito para cima, tronco uns 10° para trás.', 'Desça os ombros antes de dobrar os braços.', 'Barra até o alto do peito; volta devagar alongando as costas.', 'Se precisar balançar, a carga está pesada.'] },
      { id: 'supino-reto', nome: 'Supino reto (barra ou máquina)', series: 3, faixa: [6, 8], descanso: 150, descansoTexto: '2 a 3 min', aquecimento: [], passo: 2.5,
        dicas: ['Escápulas presas no banco do começo ao fim.', 'Barra desce na linha do mamilo; na máquina, pegada no meio do peito.', 'Cotovelos a 45°.', 'Falha só na máquina ou com alguém por perto.'] },
      { id: 'remada-maquina-colada', nome: 'Remada na máquina de anilha', series: 3, faixa: [8, 10], descanso: 120, descansoTexto: '2 min', aquecimento: [], passo: 5,
        dicas: ['Apoio na altura do peito.', 'Cotovelos colados, puxando para o umbigo.', 'Puxe com o cotovelo; segure 1 s atrás.', 'Volta esticando o braço inteiro.', 'O peito não sai do apoio.'] },
      { id: 'elevacao-lateral', nome: 'Elevação lateral', series: 3, faixa: [12, 15], descanso: 60, descansoTexto: '1 min', aquecimento: [], passo: 1,
        dicas: ['Carga leve, sem balançar.', 'Cotovelos para fora até a altura do ombro.', 'Desce em 2 s.', 'Trapézio subiu junto: baixe a carga.'] },
      { id: 'triceps-polia', nome: 'Tríceps na polia', series: 2, faixa: [10, 12], descanso: 0, descansoTexto: 'direto para a rosca', aquecimento: [], passo: 2.5,
        dicas: ['Alternado com a rosca direta: faz um, vai direto para o outro.', 'Cotovelos colados nas costelas, parados.', 'Estica até o fim e aperta 1 s.'] },
      { id: 'rosca-direta', nome: 'Rosca direta', series: 2, faixa: [10, 12], descanso: 60, descansoTexto: '1 min e volta ao tríceps', aquecimento: [], passo: 2,
        dicas: ['Cotovelos ao lado do corpo.', 'Sem balançar o tronco; desce em 2 s.'] },
    ],
  },
  {
    id: 'infA',
    nome: 'Inferior A',
    foco: 'Frente da coxa',
    antes: [...INFERIOR_ANTES.slice(0, 1), '10 agachamentos sem peso', '10 balanços de perna de cada lado', INFERIOR_ANTES[1]],
    exercicios: [
      { id: 'agachamento-smith', nome: 'Agachamento no smith', series: 4, faixa: [6, 8], descanso: 150, descansoTexto: '2 a 3 min', aquecimento: [{ pct: 0, reps: 10 }, { pct: 50, reps: 6 }, { pct: 75, reps: 3 }], passo: 5,
        dicas: ['Trava de segurança um pouco abaixo da sua descida.', 'Barra no trapézio; pés 15 a 20 cm à frente da barra.', 'Desce em 2 a 3 s até a coxa paralela.', 'Ar preso no abdômen; calcanhar no chão.', 'Sentiu a lombar: pés um pouco para trás. Calcanhar sobe: pés para a frente.', PERNA] },
      { id: 'leg-press', nome: 'Leg press', series: 3, faixa: [10, 12], descanso: 120, descansoTexto: '2 min', aquecimento: [], passo: 10,
        dicas: ['Pés no meio da plataforma.', 'Desce até uns 90° sem o quadril descolar.', 'Não trava o joelho em cima.'] },
      { id: 'cadeira-flexora', nome: 'Cadeira flexora', series: 3, faixa: [10, 12], descanso: 105, descansoTexto: '1,5 a 2 min', aquecimento: [], passo: 5,
        dicas: ['Joelho alinhado com o eixo da máquina.', 'Tronco levemente para a frente.', 'Puxa e aperta 1 s; volta em 2 a 3 s.', 'Quadril não sai do banco.'] },
      { id: 'cadeira-extensora', nome: 'Cadeira extensora', series: 3, faixa: [12, 15], descanso: 75, descansoTexto: '1 a 1,5 min', aquecimento: [], passo: 5,
        dicas: ['Joelho alinhado com o eixo; rolo acima do tornozelo.', 'Aperta 1 s em cima, desce em 2 a 3 s.', 'Sem tranco.'] },
      { id: 'panturrilha-pe', nome: 'Panturrilha em pé', series: 4, faixa: [10, 15], descanso: 60, descansoTexto: '1 min', aquecimento: [], passo: 5,
        dicas: ['Desce lento e segura 1 a 2 s alongado.', 'Sobe o mais alto possível e segura 1 s.', 'Sem quicar.'] },
      { id: 'abdominal-maquina', nome: 'Abdominal na máquina', series: 3, faixa: [10, 15], descanso: 60, descansoTexto: '1 min', aquecimento: [], passo: 5,
        dicas: ['Enrola as costelas na direção do quadril.', 'Braços e pernas não fazem força.', 'Volta devagar sem bater as anilhas.', 'Fechou 15 com folga: sobe a carga.'] },
    ],
  },
  {
    id: 'supB',
    nome: 'Superior B',
    foco: 'Costas e peito, outros ângulos',
    antes: SUPERIOR_ANTES,
    exercicios: [
      { id: 'puxada-triangulo', nome: 'Puxada com triângulo', series: 3, faixa: [6, 10], descanso: 120, descansoTexto: '2 min', aquecimento: [{ pct: 50, reps: 10 }], passo: 5,
        dicas: ['Palmas viradas uma para a outra.', 'Tronco 15 a 20° para trás, peito para cima.', 'Cotovelos colados, pegador no alto do peito.', 'Volta alongando as costas lá em cima.'] },
      { id: 'supino-inclinado-maquina', nome: 'Supino inclinado na máquina ou smith', series: 3, faixa: [8, 10], descanso: 120, descansoTexto: '2 min', aquecimento: [{ pct: 50, reps: 8 }], passo: 5,
        dicas: ['Pegadores na linha do alto do peito.', 'Escápulas presas, cotovelos a 45°.', 'Desce em 2 s, sobe sem travar.'] },
      { id: 'remada-maquina-aberta', nome: 'Remada na máquina, cotovelos abertos', series: 3, faixa: [8, 12], descanso: 105, descansoTexto: '1,5 a 2 min', aquecimento: [], passo: 5,
        dicas: ['Cotovelos a 60-70° do corpo, puxando para a linha do peito.', 'Aperta as escápulas 1 s.', 'Ombros longe das orelhas.', 'Pode ser um braço de cada vez.'] },
      { id: 'crucifixo-polia-baixo', nome: 'Crucifixo na polia, de baixo para cima', series: 3, faixa: [12, 15], descanso: 60, descansoTexto: '1 min', aquecimento: [], passo: 2.5,
        dicas: ['Polias embaixo, um passo à frente.', 'Cotovelo com leve dobra fixa.', 'Mãos se encontram na altura do queixo; aperta 1 s.'] },
      { id: 'elevacao-lateral-b', nome: 'Elevação lateral', series: 3, faixa: [12, 15], descanso: 60, descansoTexto: '1 min', aquecimento: [], passo: 1,
        dicas: ['Carga leve, cotovelos para fora até o ombro, desce em 2 s.'] },
      { id: 'face-pull', nome: 'Face pull', series: 3, faixa: [12, 15], descanso: 60, descansoTexto: '1 min', aquecimento: [], passo: 2.5,
        dicas: ['Polia na altura do rosto, polegar para trás.', 'Puxa para a testa abrindo os cotovelos.', 'Segura 1 s; sem jogar o corpo.'] },
      { id: 'rosca-martelo', nome: 'Rosca martelo', series: 2, faixa: [10, 12], descanso: 60, descansoTexto: '1 min', aquecimento: [], passo: 2,
        dicas: ['Palmas uma para a outra, cotovelos colados.'] },
      { id: 'triceps-frances', nome: 'Tríceps francês', series: 2, faixa: [10, 12], descanso: 60, descansoTexto: '1 min', aquecimento: [], passo: 2.5,
        dicas: ['Cotovelos para a frente, perto da cabeça.', 'Na polia é mais fácil de controlar.', 'Incomodou o cotovelo: menos carga.'] },
    ],
  },
  {
    id: 'infB',
    nome: 'Inferior B',
    foco: 'Posterior e glúteo',
    antes: [INFERIOR_ANTES[0], '10 elevações de quadril no chão', '10 inclinações de tronco sem peso', '10 balanços de perna de cada lado'],
    exercicios: [
      { id: 'terra-romeno', nome: 'Levantamento terra romeno', series: 4, faixa: [6, 8], descanso: 150, descansoTexto: '2 a 3 min', aquecimento: [{ pct: 0, reps: 10 }, { pct: 60, reps: 5 }], passo: 5,
        dicas: ['Joelhos com leve dobra que não muda.', 'Quadril para trás, barra colada nas pernas.', 'Desce até o meio da canela com as costas retas.', 'Sobe apertando o glúteo.', 'Lombar arredondou: desceu demais ou pesado.'] },
      { id: 'bulgaro', nome: 'Agachamento búlgaro', series: 3, faixa: [8, 10], porLado: true, descanso: 120, descansoTexto: '1,5 min entre pernas, 2 min entre séries', aquecimento: [], passo: 2,
        dicas: ['Pé de trás no banco, o da frente dois passos à frente.', 'Desce até o joelho de trás quase no chão.', 'Começa pela perna mais fraca.', 'Perna reclamou ou faltou equilíbrio: leg press com os pés altos, 3 x 10-12.', PERNA] },
      { id: 'hiperextensao', nome: 'Hiperextensão 45° (glúteo)', series: 3, faixa: [10, 12], descanso: 90, descansoTexto: '1,5 min', aquecimento: [], passo: 5,
        dicas: ['Apoio um pouco abaixo do osso do quadril.', 'Pés virados para fora.', 'Sobe apertando o glúteo até o corpo reto, sem passar.', 'Fácil com 12: anilha no peito.'] },
      { id: 'abdutora', nome: 'Cadeira abdutora', series: 3, faixa: [12, 15], descanso: 60, descansoTexto: '1 min', aquecimento: [], passo: 5,
        dicas: ['Tronco levemente para a frente.', 'Abre, segura 1 s, volta sem bater as placas.'] },
      { id: 'panturrilha-sentado', nome: 'Panturrilha sentado', series: 4, faixa: [12, 15], descanso: 60, descansoTexto: '1 min', aquecimento: [], passo: 5,
        dicas: ['Segura 1 a 2 s alongado embaixo e 1 s em cima.'] },
      { id: 'elevacao-pernas', nome: 'Elevação de pernas', series: 3, faixa: [10, 15], descanso: 60, descansoTexto: '1 min', aquecimento: [], passo: 0,
        dicas: ['Joelhos dobrados; enrola o quadril para cima no fim.', 'Desce devagar.', 'Puxou a lombar: dobre mais os joelhos.'] },
    ],
  },
]

// Segunda, terça, quinta e sábado (getDay: 0 = domingo).
const POR_DIA: Record<number, Treino['id']> = { 1: 'supA', 2: 'infA', 4: 'supB', 6: 'infB' }

export function treinoDoDia(d: Date): Treino | null {
  const id = POR_DIA[d.getDay()]
  return id ? TREINOS.find((t) => t.id === id)! : null
}

export const acharTreino = (id: string) => TREINOS.find((t) => t.id === id) ?? null

export type SerieFeita = { kg: number | null; reps: number | null }

// Progressão dupla: fechou todas as séries no topo da faixa com a mesma carga, sobe o passo.
export function sugerirCarga(ex: Exercicio, ultimas: SerieFeita[]): { kg: number; subir: boolean } | null {
  const comCarga = ultimas.filter((s) => s.kg != null && s.reps != null) as { kg: number; reps: number }[]
  if (!comCarga.length) return null
  const kg = Math.max(...comCarga.map((s) => s.kg))
  const naCarga = comCarga.filter((s) => s.kg === kg)
  const fechou = ex.passo > 0 && naCarga.length >= ex.series && naCarga.every((s) => s.reps >= ex.faixa[1])
  return { kg: fechou ? kg + ex.passo : kg, subir: fechou }
}

// Carga do aquecimento arredondada para 1 kg (0% = só a barra).
export const cargaAquecimento = (trabalho: number | null, pct: number) => (trabalho == null || pct === 0 ? null : Math.round((trabalho * pct) / 100))

// Passos: subida combinada a partir da segunda 16/11/2026: 4.000, 5.000, 6.000 e depois 7.000.
const INICIO_PASSOS = new Date(2026, 10, 16)
export function metaPassos(d: Date): { meta: number; semana: number } {
  const dias = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - INICIO_PASSOS.getTime()) / 86400000)
  const semana = Math.max(1, Math.floor(dias / 7) + 1)
  return { meta: [4000, 5000, 6000][semana - 1] ?? 7000, semana }
}

// Série dita pelo microfone do teclado ou digitada: "30 kg 8", "30 por 8", "8 com 30", "oito". Só número sozinho = repetições.
const PALAVRAS: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
  onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20,
}
export function lerSerieFalada(texto: string): { kg: number | null; reps: number | null } | null {
  const t = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(e meio|e meia)\b/g, ',5')
    .replace(/\b[a-z]+\b/g, (p) => (p in PALAVRAS ? String(PALAVRAS[p]) : p))
    .replace(/(\d)\s*,5/g, '$1.5')
    .replace(/(\d),(\d)/g, '$1.$2')
  const nums = [...t.matchAll(/(\d+(?:\.\d+)?)\s*(kg|quilos?|kilos?|k\b|reps?|repeticoes|repeticao|vezes)?/g)].map((m) => ({ n: Number(m[1]), un: m[2] ?? '', fim: (m.index ?? 0) + m[0].length }))
  if (!nums.length || nums.length > 2) return null
  let kg: number | null = null
  let reps: number | null = null
  for (const x of nums) {
    if (/^(kg|quilo|kilo|k)/.test(x.un)) kg = x.n
    else if (x.un) reps = x.n
  }
  const soltos = nums.filter((x) => !x.un)
  if (soltos.length === 2) {
    // "8 com 30": repetições antes. "30 x 8", "30 por 8", "30 8": carga antes.
    const com = /\bcom\b/.test(t.slice(soltos[0].fim))
    ;[reps, kg] = com ? [soltos[0].n, soltos[1].n] : [soltos[1].n, soltos[0].n]
  } else if (soltos.length === 1) {
    if (kg == null && reps != null) kg = soltos[0].n
    else if (reps == null) reps = soltos[0].n
  }
  if (reps != null && (!Number.isInteger(reps) || reps < 1 || reps > 50)) return null
  if (kg != null && (kg < 0 || kg > 500)) return null
  return { kg, reps }
}

// Evolução: por treino feito, a maior carga das séries de trabalho e as repetições nela (mais recente primeiro).
export function evolucao(series: { dia: string; kg: number | null; reps: number | null }[]): { dia: string; kg: number; reps: number[] }[] {
  const porDia = new Map<string, { kg: number; reps: number }[]>()
  for (const s of series) if (s.kg != null && s.reps != null) porDia.set(s.dia, [...(porDia.get(s.dia) ?? []), { kg: s.kg, reps: s.reps }])
  return [...porDia.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dia, l]) => {
      const kg = Math.max(...l.map((x) => x.kg))
      return { dia, kg, reps: l.filter((x) => x.kg === kg).map((x) => x.reps) }
    })
}
