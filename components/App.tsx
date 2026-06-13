'use client'

import { useState, useEffect } from 'react'
import type { ModeId, Step, View, AnalysisResult } from '@/lib/types'
import Landing from './Landing'
import Workspace from './Workspace'
import Results from './Results'
import Button from './ui/Button'
import { useLang } from '@/lib/LangContext'

function AppInner() {
  const { t } = useLang()
  const [view, setView]     = useState<View>('landing')
  const [mode, setMode]     = useState<ModeId>('roast')
  const [step, setStep]     = useState<Step>('mode')
  const [file, setFile]     = useState<File | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)

  useEffect(() => {
    document.documentElement.dataset.theme = mode
  }, [mode])

  const goWorkspace = () => {
    setStep('mode')
    setView('workspace')
    window.scrollTo({ top: 0 })
  }

  const reanalyze = (toStep?: string) => {
    setStep((toStep as Step) || 'mode')
    setFile(null)
    setResult(null)
    setView('workspace')
    window.scrollTo({ top: 0 })
  }

  const handleAnalyze = (res: AnalysisResult) => {
    setResult(res)
    setView('results')
    window.scrollTo({ top: 0 })
  }

  return (
    <>
      {view === 'landing' && (
        <Landing mode={mode} setMode={setMode} onStart={goWorkspace} />
      )}

      {view === 'workspace' && (
        <div>
          <div style={{ padding: '16px clamp(20px,5vw,60px) 0' }}>
            <Button
              variant="quiet" size="sm" icon="back"
              onClick={() => { setView('landing'); window.scrollTo({ top: 0 }) }}
            >
              {t.home}
            </Button>
          </div>
          <Workspace
            mode={mode} setMode={setMode}
            step={step} setStep={setStep}
            file={file} setFile={setFile}
            onAnalyze={handleAnalyze}
          />
        </div>
      )}

      {view === 'results' && result && (
        <Results
          mode={mode} setMode={setMode}
          file={file} result={result}
          onReanalyze={reanalyze}
        />
      )}
    </>
  )
}

export default function App() {
  return <AppInner />
}
