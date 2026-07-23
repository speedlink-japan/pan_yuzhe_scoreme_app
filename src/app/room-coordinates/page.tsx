'use client'

import Image from 'next/image'
import Link from 'next/link'
import { MouseEvent, useMemo, useState } from 'react'
import {
  CHARACTER_SCENE_PLACEMENT,
  ME_ROOM_SCENE,
  clampScenePercent,
  scenePercentToPixel,
} from '@/utils/meRoomScene'
import styles from './page.module.css'

interface SelectedPoint {
  x: number
  y: number
}

const gridLabels = Array.from({ length: 11 }, (_, index) => index * 10)

const roundCoordinate = (value: number): number => Math.round(value * 100) / 100

export default function RoomCoordinatesPage() {
  const [point, setPoint] = useState<SelectedPoint>({
    x: CHARACTER_SCENE_PLACEMENT.x,
    y: CHARACTER_SCENE_PLACEMENT.y,
  })
  const [objectWidth, setObjectWidth] = useState(20)
  const [isGridVisible, setIsGridVisible] = useState(true)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')

  const pixelPoint = scenePercentToPixel(point.x, point.y)
  const placementText = useMemo(
    () =>
      `{ x: ${point.x.toFixed(2)}, y: ${point.y.toFixed(2)}, width: ${objectWidth.toFixed(1)}, anchor: 'bottom-center' }`,
    [objectWidth, point.x, point.y]
  )

  const handleSceneSelect = (event: MouseEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = clampScenePercent(((event.clientX - bounds.left) / bounds.width) * 100)
    const y = clampScenePercent(((event.clientY - bounds.top) / bounds.height) * 100)

    setPoint({ x: roundCoordinate(x), y: roundCoordinate(y) })
    setCopyState('idle')
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(placementText)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.coordinateHeader} aria-label="選択中の座標">
        <div className={styles.titleRow}>
          <div>
            <p className={styles.eyebrow}>Me room placement tool</p>
            <h1>部屋の座標確認</h1>
          </div>
          <Link className={styles.backLink} href="/">
            MyScoreへ戻る
          </Link>
        </div>

        <div className={styles.coordinateSummary} aria-live="polite">
          <div className={styles.coordinateCard}>
            <span>正規化座標</span>
            <strong>X {point.x.toFixed(2)} / Y {point.y.toFixed(2)}</strong>
          </div>
          <div className={styles.coordinateCard}>
            <span>元画像の座標</span>
            <strong>X {pixelPoint.x}px / Y {pixelPoint.y}px</strong>
          </div>
          <label className={styles.widthControl}>
            <span>オブジェクト幅</span>
            <span className={styles.widthInputRow}>
              <input
                type="range"
                min="1"
                max="100"
                step="0.5"
                value={objectWidth}
                onChange={event => {
                  setObjectWidth(Number(event.target.value))
                  setCopyState('idle')
                }}
              />
              <strong>{objectWidth.toFixed(1)}%</strong>
            </span>
          </label>
        </div>

        <div className={styles.configurationRow}>
          <code>{placementText}</code>
          <button type="button" className={styles.copyButton} onClick={handleCopy}>
            {copyState === 'copied'
              ? 'コピー済み'
              : copyState === 'failed'
                ? 'コピー失敗'
                : '設定値をコピー'}
          </button>
          <button
            type="button"
            className={styles.gridButton}
            aria-pressed={isGridVisible}
            onClick={() => setIsGridVisible(current => !current)}
          >
            {isGridVisible ? 'グリッドを隠す' : 'グリッドを表示'}
          </button>
        </div>
      </section>

      <section className={styles.workspace}>
        <p className={styles.instructions}>
          背景上の配置したい場所をクリック。赤い十字の中心が選択座標になる。
        </p>

        <div className={styles.canvasShell}>
          <button
            type="button"
            className={styles.scene}
            onClick={handleSceneSelect}
            aria-label="部屋背景から座標を選択"
          >
            <Image
              className={styles.background}
              src={ME_ROOM_SCENE.background}
              alt="Meタブで使用中の部屋背景"
              fill
              priority
              sizes="100vw"
              draggable={false}
            />

            {isGridVisible && (
              <span className={styles.grid} aria-hidden="true">
                {gridLabels.map(value => (
                  <span
                    key={`x-${value}`}
                    className={`${styles.xLabel} ${value === 0 ? styles.labelStart : ''} ${value === 100 ? styles.labelEnd : ''}`}
                    style={{ left: `${value}%` }}
                  >
                    {value}
                  </span>
                ))}
                {gridLabels.map(value => (
                  <span
                    key={`y-${value}`}
                    className={`${styles.yLabel} ${value === 0 ? styles.labelStart : ''} ${value === 100 ? styles.labelEnd : ''}`}
                    style={{ top: `${value}%` }}
                  >
                    {value}
                  </span>
                ))}
              </span>
            )}

            <span
              className={styles.marker}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
              aria-hidden="true"
            >
              <span>{point.x.toFixed(2)}, {point.y.toFixed(2)}</span>
            </span>
          </button>
        </div>

        <p className={styles.canvasMeta}>
          基準画像: {ME_ROOM_SCENE.width} × {ME_ROOM_SCENE.height}px / Xは左から、Yは上から0〜100
        </p>
      </section>
    </main>
  )
}
