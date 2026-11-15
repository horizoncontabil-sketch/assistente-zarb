import { expect, it } from 'vitest'
import { nomeLivre, planoDeOrganizacao, tamanho } from './organizar'

it('separa por tipo e deixa atalhos no lugar', () => {
  const plano = planoDeOrganizacao(['a.pdf', 'b.PNG', 'c.pdf', 'Chrome.lnk', 'desktop.ini', 'x.qualquer', 'planilha.xlsx'])
  expect(plano).toEqual([
    { pasta: 'PDFs', arquivos: ['a.pdf', 'c.pdf'] },
    { pasta: 'Imagens', arquivos: ['b.PNG'] },
    { pasta: 'Outros', arquivos: ['x.qualquer'] },
    { pasta: 'Planilhas', arquivos: ['planilha.xlsx'] },
  ])
})

it('não sobrescreve arquivo com o mesmo nome', () => {
  expect(nomeLivre('relatorio.pdf', new Set(['relatorio.pdf', 'relatorio (2).pdf']))).toBe('relatorio (3).pdf')
  expect(nomeLivre('novo.pdf', new Set())).toBe('novo.pdf')
})

it('tamanho legível', () => {
  expect(tamanho(1.8 * 1024 ** 3)).toBe('1,8 GB')
  expect(tamanho(2_200_000)).toBe('2,1 MB')
})
