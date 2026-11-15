// Ícones em traço, 20x20, herdando a cor do texto.
const P: Record<string, string> = {
  mic: 'M10 2.5a2.5 2.5 0 0 0-2.5 2.5v5a2.5 2.5 0 0 0 5 0V5A2.5 2.5 0 0 0 10 2.5Z M5 9.5a5 5 0 0 0 10 0 M10 14.5V17.5',
  config: 'M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z M16.2 12.2l1.3 1-1.5 2.6-1.6-.6a6 6 0 0 1-1.6.9L12.5 18h-3l-.3-1.9a6 6 0 0 1-1.6-.9l-1.6.6-1.5-2.6 1.3-1a6 6 0 0 1 0-1.9l-1.3-1L6 6.7l1.6.6a6 6 0 0 1 1.6-.9L9.5 4.5h3l.3 1.9a6 6 0 0 1 1.6.9l1.6-.6 1.5 2.6-1.3 1a6 6 0 0 1 0 1.9Z',
  check: 'M4.5 10.5l3.5 3.5 7.5-8',
  relogio: 'M10 17.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z M10 6v4l2.5 2',
  agenda: 'M4 5.5h12v11H4z M4 9h12 M7.5 3.5v3 M12.5 3.5v3',
  link: 'M8.5 11.5l3-3 M7 9.5 5.5 11a2.5 2.5 0 0 0 3.5 3.5l1.5-1.5 M13 10.5 14.5 9A2.5 2.5 0 0 0 11 5.5L9.5 7',
  copia: 'M7 7h8.5v9.5H7z M4.5 13V3.5H13',
  fixar: 'M12 3l5 5-2 .5-3 3 .5 3-1.5 1.5L4 9l1.5-1.5 3 .5 3-3Z M7 13l-3.5 3.5',
  lixo: 'M4 6h12 M8 6V4h4v2 M5.5 6l.8 10.5h7.4L14.5 6',
  terminal: 'M3.5 4.5h13v11h-13z M6.5 8l2.5 2-2.5 2 M10.5 12.5h3',
  mais: 'M10 4.5v11 M4.5 10h11',
  fechar: 'M5.5 5.5l9 9 M14.5 5.5l-9 9',
  enviar: 'M3.5 10h12 M11 5.5l4.5 4.5-4.5 4.5',
  seta: 'M7.5 4.5 13 10l-5.5 5.5',
  video: 'M3.5 6h9v8h-9z M12.5 9l4-2.5v7l-4-2.5',
  lista: 'M7 6h9 M7 10h9 M7 14h9 M4 6h.01 M4 10h.01 M4 14h.01',
  sol: 'M10 13.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M10 2v2 M10 16v2 M2 10h2 M16 10h2 M4.3 4.3l1.4 1.4 M14.3 14.3l1.4 1.4 M4.3 15.7l1.4-1.4 M14.3 5.7l1.4-1.4',
  busca: 'M9 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z M13.5 13.5 17 17',
  editar: 'M12.5 4.5l3 3-8.5 8.5H4v-3Z',
  sair: 'M8 4.5H4.5v11H8 M11.5 6.5 15 10l-3.5 3.5 M15 10H8',
  atualizar: 'M15.5 8A6 6 0 0 0 4.6 7 M4.5 3.5V7H8 M4.5 12a6 6 0 0 0 10.9 1 M15.5 16.5V13H12',
}

export type NomeIcone = keyof typeof P

export function Icone({ nome, tamanho = 18 }: { nome: NomeIcone; tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[nome]} />
    </svg>
  )
}
