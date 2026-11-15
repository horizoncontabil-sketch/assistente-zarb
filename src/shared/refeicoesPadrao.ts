// Refeições salvas que já nascem no celular, montadas com o Paulo em 15/11/2026 (valores da TACO).
import { ALIMENTOS_TACO, item, type ItemRefeicao } from './alimentacao'

const porId = (id: number, gramas: number): ItemRefeicao => {
  const a = ALIMENTOS_TACO.find((x) => x.id === `taco:${id}`)
  if (!a) throw new Error(`Alimento taco:${id} não está na base`)
  return item(a, gramas)
}

export const REFEICOES_PADRAO: { nome: string; itens: ItemRefeicao[] }[] = [
  // 600 g: frango 200, arroz 250, feijão 100, legumes 50 (cenoura como média dos legumes).
  { nome: 'Marmita', itens: [porId(408, 200), porId(3, 250), porId(561, 100), porId(109, 50)] },
  { nome: 'Sanduíche de frango', itens: [porId(52, 50), porId(408, 100), porId(468, 15)] },
  { nome: 'Ovos com pão', itens: [porId(488, 150), porId(53, 50), porId(461, 30)] },
  // A TACO só tem atum em óleo; escorrido fica um pouco abaixo disso.
  { nome: 'Atum com pão', itens: [porId(277, 120), porId(53, 50)] },
]
