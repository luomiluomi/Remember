import { useCallback, useEffect, useRef, useState } from 'react'
import type { TranslationMessage } from '../../i18n/index.js'
import { ApiError } from '../../services/api/client.js'
import { transcribe } from '../../services/api/speech.js'
import { canRecord, startRecording, type Recording } from '../../services/speech/recorder.js'
import { useSettings } from '../../services/settings.js'
import { showToast } from '../base/toastState.js'

export type VoiceInputStatus = 'idle' | 'starting' | 'recording' | 'transcribing'

/**
 * 录音依赖 getUserMedia，只在安全上下文可用（HTTPS、localhost、file://）。
 * 普通 HTTP 页面上直接禁用入口，避免点击后必然失败。
 */
const AVAILABLE = typeof window === 'undefined' || canRecord()

const describeRecordingError = (error: unknown): TranslationMessage => {
  if (error instanceof DOMException) {
    if (error.name === 'NativePermissionRequested') {
      return { key: 'voiceInputHoldRetry' }
    }
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return { key: 'voiceInputPermissionDenied' }
    }
    if (error.name === 'NotFoundError') {
      return { key: 'voiceInputNoDevice' }
    }
  }
  return { key: 'voiceInputRecordingFailed' }
}

const describeTranscriptionError = (error: unknown, timedOut: boolean): TranslationMessage => {
  if (timedOut) {
    return { key: 'voiceInputTimeout' }
  }
  if (error instanceof ApiError) {
    if (error.kind === 'network') {
      return { key: 'voiceInputNetwork' }
    }
    if (error.status !== undefined) {
      return { key: 'voiceInputHttp', params: { status: error.status } }
    }
    if (error.kind === 'protocol') {
      return { key: 'voiceInputProtocol' }
    }
  }
  return { key: 'voiceInputFailed' }
}

/**
 * 语音输入（oneshot）：点击开始录音，再次点击结束并转写，结果交给 onText 填入输入框。
 * 转写中再次点击取消。录满 120 秒自动结束。
 */
export const useVoiceInput = (onText: (text: string, send: boolean) => void) => {
  const [status, setStatus] = useState<VoiceInputStatus>('idle')
  /** 本次录音已录秒数，只在录音中递增 */
  const [seconds, setSeconds] = useState(0)
  const recordingRef = useRef<Recording | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const operationRef = useRef(0)
  const holdRef = useRef(false)
  const onTextRef = useRef(onText)
  onTextRef.current = onText

  const cancelOperation = useCallback(() => {
    operationRef.current++
    recordingRef.current?.cancel()
    recordingRef.current = null
    controllerRef.current?.abort()
    controllerRef.current = null
  }, [])

  const cancel = useCallback(() => {
    cancelOperation()
    setStatus('idle')
  }, [cancelOperation])

  const finish = useCallback(async () => {
    const recording = recordingRef.current
    if (!recording) {
      // 仍在等待麦克风授权时也允许取消；迟到的录音对象会立即释放。
      cancel()
      return
    }
    const operation = operationRef.current
    recordingRef.current = null
    const controller = new AbortController()
    controllerRef.current = controller
    setStatus('transcribing')
    let timedOut = false
    const timeout = window.setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 45000)
    try {
      let audio: Blob | null
      try {
        audio = await recording.stop()
      } finally {
        recording.cancel()
      }
      if (operationRef.current !== operation) {
        return
      }
      if (!audio) {
        showToast({ key: 'voiceInputEmpty' })
        return
      }
      const text = await transcribe(useSettings.getState().apiKey ?? '', audio, controller.signal)
      if (controller.signal.aborted || operationRef.current !== operation) {
        return
      }
      if (text.trim()) {
        onTextRef.current(text.trim(), holdRef.current)
      } else {
        showToast({ key: 'voiceInputEmpty' })
      }
    } catch (error) {
      if (operationRef.current === operation && (!controller.signal.aborted || timedOut)) {
        showToast(describeTranscriptionError(error, timedOut))
      }
    } finally {
      clearTimeout(timeout)
      if (operationRef.current === operation) {
        controllerRef.current = null
        setStatus('idle')
      }
    }
  }, [cancel])

  const start = async (hold: boolean) => {
    if (!AVAILABLE || status !== 'idle') {
      return
    }
    const operation = ++operationRef.current
    holdRef.current = hold
    setStatus('starting')
    try {
      const recording = await startRecording(() => {
        if (operationRef.current === operation) {
          showToast({ key: 'voiceInputLimitReached' })
          void finish()
        }
      })
      if (operationRef.current !== operation) {
        recording.cancel()
        return
      }
      recordingRef.current = recording
      setStatus('recording')
      if (!hold) {
        showToast({ key: 'voiceInputRecordingHint' })
      }
    } catch (error) {
      if (operationRef.current === operation) {
        setStatus('idle')
        showToast(describeRecordingError(error))
      }
    }
  }

  const release = () => {
    if (recordingRef.current) {
      void finish()
    } else if (status === 'starting') {
      cancel()
      showToast({ key: 'voiceInputHoldRetry' })
    }
  }

  const toggle = () => {
    if (status === 'idle') {
      void start(false)
    } else if (status === 'recording') {
      void finish()
    } else {
      cancel()
    }
  }

  useEffect(() => {
    if (status !== 'recording') {
      return
    }
    const startedAt = Date.now()
    setSeconds(0)
    // 半秒刷新一次，让显示的秒数与实际录音时长保持一致
    const timer = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAt) / 1000))
    }, 500)
    return () => clearInterval(timer)
  }, [status])

  useEffect(() => cancelOperation, [cancelOperation])

  /** 当前录音的频谱分析节点，未录音时为 null */
  const getAnalyser = useCallback(() => recordingRef.current?.analyser ?? null, [])
  const getLevel = useCallback(() => recordingRef.current?.getLevel?.() ?? 0, [])

  return {
    status,
    seconds,
    getAnalyser,
    getLevel,
    start,
    release,
    toggle,
    cancel,
    available: AVAILABLE,
  }
}
