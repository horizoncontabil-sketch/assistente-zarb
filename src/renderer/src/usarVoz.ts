import { useCallback, useEffect, useRef, useState } from 'react'
import { createModel, type Model } from 'vosk-browser'
import { ouviuOChamado } from '../../shared/chamado'
import { api } from './util'

export type EstadoVoz = 'parado' | 'ouvindo' | 'transcrevendo'

// Gravação da fala: começa no atalho (ou no "Ei, Zarb") e para sozinha quando a pessoa
// fica em silêncio, ou no atalho de novo. O áudio vai para a transcrição e é descartado.
export function usarGravacao(aoTranscrever: (texto: string) => void, aoErro: (erro: string) => void) {
  const [estado, setEstado] = useState<EstadoVoz>('parado')
  const [nivel, setNivel] = useState(0)
  const parar = useRef<() => void>(() => {})
  const cancelado = useRef(false)

  const iniciar = useCallback(async () => {
    if (estado !== 'parado') return
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    } catch {
      aoErro('Não consegui usar o microfone. Confira se ele está ligado e liberado no Windows.')
      return
    }
    cancelado.current = false
    const ctx = new AudioContext()
    const analisador = ctx.createAnalyser()
    analisador.fftSize = 1024
    ctx.createMediaStreamSource(stream).connect(analisador)
    const amostras = new Float32Array(analisador.fftSize)
    const gravador = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
    const pedacos: Blob[] = []
    gravador.ondataavailable = (e) => e.data.size && pedacos.push(e.data)

    const inicio = performance.now()
    let falou = false
    let ultimoSom = inicio
    let quadro = 0
    const LIMIAR = 0.02

    const medir = () => {
      analisador.getFloatTimeDomainData(amostras)
      let soma = 0
      for (const a of amostras) soma += a * a
      const rms = Math.sqrt(soma / amostras.length)
      setNivel(Math.min(1, rms * 12))
      const t = performance.now()
      if (rms > LIMIAR) {
        falou = true
        ultimoSom = t
      }
      // Para: 1,5 s de silêncio depois de falar, 7 s sem falar nada, ou 45 s no total.
      if ((falou && t - ultimoSom > 1500) || (!falou && t - inicio > 7000) || t - inicio > 45_000) {
        if (!falou) cancelado.current = true
        parar.current()
        return
      }
      quadro = requestAnimationFrame(medir)
    }

    gravador.onstop = async () => {
      cancelAnimationFrame(quadro)
      stream.getTracks().forEach((t) => t.stop())
      ctx.close()
      setNivel(0)
      if (cancelado.current || !pedacos.length) {
        setEstado('parado')
        return
      }
      setEstado('transcrevendo')
      const audio = new Uint8Array(await new Blob(pedacos, { type: 'audio/webm' }).arrayBuffer())
      const r = await api.transcrever(audio)
      setEstado('parado')
      if (r.ok) aoTranscrever(r.texto)
      else aoErro(r.erro)
    }
    parar.current = () => gravador.state !== 'inactive' && gravador.stop()
    gravador.start(250)
    setEstado('ouvindo')
    quadro = requestAnimationFrame(medir)
  }, [estado, aoTranscrever, aoErro])

  const alternar = useCallback(() => {
    if (estado === 'ouvindo') parar.current()
    else if (estado === 'parado') iniciar()
  }, [estado, iniciar])

  const cancelar = useCallback(() => {
    cancelado.current = true
    parar.current()
  }, [])

  return { estado, nivel, alternar, iniciar, cancelar }
}

// "Ei, Zarb": reconhecimento no próprio PC (Vosk). Nada sai do computador até ouvir o chamado.
export function usarChamado(ativo: boolean, pausado: boolean, aoChamar: () => void) {
  const [status, setStatus] = useState<'desligado' | 'carregando' | 'escutando' | 'erro'>('desligado')
  const pausadoRef = useRef(pausado)
  pausadoRef.current = pausado
  const chamar = useRef(aoChamar)
  chamar.current = aoChamar

  useEffect(() => {
    if (!ativo) {
      setStatus('desligado')
      return
    }
    let fim = false
    let modelo: Model | null = null
    let stream: MediaStream | null = null
    let ctx: AudioContext | null = null
    let urlModelo: string | null = null
    let ultimo = 0
    setStatus('carregando')
    ;(async () => {
      try {
        const bytes = await api.modeloVoz()
        if (!bytes || fim) throw new Error('sem modelo')
        urlModelo = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/gzip' }))
        // Se o modelo vier estragado o vosk-browser não avisa: desiste depois de 90 s.
        modelo = await Promise.race([
          createModel(urlModelo, -1),
          new Promise<never>((_, falhar) => setTimeout(() => falhar(new Error('modelo não carregou')), 90_000)),
        ])
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } })
        if (fim) return
        ctx = new AudioContext()
        const rec = new modelo.KaldiRecognizer(ctx.sampleRate)
        const conferir = (texto: unknown) => {
          if (typeof texto !== 'string' || !texto || pausadoRef.current) return
          const agora = performance.now()
          if (agora - ultimo > 3000 && ouviuOChamado(texto)) {
            ultimo = agora
            chamar.current()
          }
        }
        rec.on('partialresult', (m) => conferir((m as { result?: { partial?: string } }).result?.partial))
        rec.on('result', (m) => conferir((m as { result?: { text?: string } }).result?.text))
        // atalho: ScriptProcessor está obsoleto, mas é o que o vosk-browser aceita; trocar por AudioWorklet se ele passar a aceitar.
        const proc = ctx.createScriptProcessor(4096, 1, 1)
        proc.onaudioprocess = (e) => {
          if (!pausadoRef.current) rec.acceptWaveform(e.inputBuffer)
        }
        ctx.createMediaStreamSource(stream).connect(proc)
        proc.connect(ctx.destination)
        setStatus('escutando')
      } catch {
        if (!fim) setStatus('erro')
      }
    })()
    return () => {
      fim = true
      stream?.getTracks().forEach((t) => t.stop())
      ctx?.close()
      modelo?.terminate()
      if (urlModelo) URL.revokeObjectURL(urlModelo)
    }
  }, [ativo])

  return status
}
