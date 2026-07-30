'use client'

import React, { useState } from 'react'
import styles from './CharacterPanel.module.css'
import CharacterAvatar from './CharacterAvatar'
import type { CharacterAppearance, HairStyle } from '@/utils/characterAppearance'

type Category = 'face' | 'eyes' | 'hair' | 'outfit' | 'accessory' | 'colors'

interface CharacterCustomizerModalProps {
  appearance: CharacterAppearance
  onChange: (appearance: CharacterAppearance) => void
  onClose: () => void
  onReset: () => void
}

const categories: { id: Category; label: string }[] = [
  { id: 'face', label: '顔' },
  { id: 'eyes', label: '目' },
  { id: 'hair', label: '髪' },
  { id: 'outfit', label: '服' },
  { id: 'accessory', label: '小物' },
  { id: 'colors', label: '色' },
]

const palettes = {
  skinColor: ['#F4C9B4', '#E7B092', '#C98769', '#9A624E', '#F1D8C8', '#DFA6A6'],
  hairColor: ['#302A2A', '#6B4A45', '#B7854A', '#B85D50', '#D987B8', '#7D8CC7', '#7EA7A2', '#EDE7DC'],
  eyesColor: ['#4F3A37', '#4D78A8', '#657D61', '#74518D', '#30353D', '#A56B3F'],
  outfitColor: ['#8CCFC3', '#6C78B8', '#F3B562', '#D98AB8', '#E99A8B', '#7B9BC7', '#756A9C', '#6D9B7A'],
}

const hairBackByStyle: Record<HairStyle, HairStyle> = {
  short: 'short',
  bob: 'bob',
  long: 'long',
}

const CharacterCustomizerModal: React.FC<CharacterCustomizerModalProps> = ({ appearance, onChange, onClose, onReset }) => {
  const [category, setCategory] = useState<Category>('hair')

  const update = <K extends keyof CharacterAppearance>(key: K, value: CharacterAppearance[K]) => {
    onChange({ ...appearance, [key]: value })
  }

  const renderOptions = () => {
    if (category === 'face') {
      return (
        <div className={styles.customizerOptionGrid}>
          {(['round', 'soft', 'oval'] as const).map(value => (
            <button type="button" key={value} className={`${styles.customizerOption} ${appearance.face === value ? styles.customizerSelected : ''}`} onClick={() => update('face', value)}>
              <span className={styles.optionPreview}>◯</span><span>{value}</span>
            </button>
          ))}
        </div>
      )
    }

    if (category === 'eyes') {
      return (
        <div className={styles.customizerOptionGrid}>
          {(['round', 'gentle', 'sleepy'] as const).map(value => (
            <button type="button" key={value} className={`${styles.customizerOption} ${appearance.eyes === value ? styles.customizerSelected : ''}`} onClick={() => update('eyes', value)}>
              <span className={styles.optionPreview}>{value === 'sleepy' ? '⌒' : '●'}</span><span>{value}</span>
            </button>
          ))}
        </div>
      )
    }

    if (category === 'hair') {
      return (
        <div className={styles.customizerOptionGrid}>
          {(['short', 'bob', 'long'] as const).map(value => (
            <button type="button" key={value} className={`${styles.customizerOption} ${appearance.hair === value ? styles.customizerSelected : ''}`} onClick={() => update('hair', hairBackByStyle[value])}>
              <span className={styles.optionPreview}>♒</span><span>{value}</span>
            </button>
          ))}
        </div>
      )
    }

    if (category === 'outfit') {
      return (
        <div className={styles.customizerOptionGrid}>
          {(['casual', 'formal', 'sporty', 'party'] as const).map(value => (
            <button type="button" key={value} className={`${styles.customizerOption} ${appearance.outfit === value ? styles.customizerSelected : ''}`} onClick={() => update('outfit', value)}>
              <span className={styles.optionPreview}>◒</span><span>{value}</span>
            </button>
          ))}
        </div>
      )
    }

    if (category === 'accessory') {
      return (
        <div className={styles.customizerOptionGrid}>
          {(['none', 'glasses', 'bow', 'headband'] as const).map(value => (
            <button type="button" key={value} className={`${styles.customizerOption} ${appearance.accessory === value ? styles.customizerSelected : ''}`} onClick={() => update('accessory', value)}>
              <span className={styles.optionPreview}>{value === 'none' ? '×' : value === 'glasses' ? '◉' : value === 'bow' ? '🎀' : '⌒'}</span><span>{value}</span>
            </button>
          ))}
        </div>
      )
    }

    return (
      <div className={styles.paletteSections}>
        {([
          ['skinColor', '肌'],
          ['hairColor', '髪'],
          ['eyesColor', '目'],
          ['outfitColor', '服'],
        ] as const).map(([key, label]) => (
          <div key={key} className={styles.paletteSection}>
            <span className={styles.paletteLabel}>{label}</span>
            <div className={styles.colorGrid}>
              {palettes[key].map(color => (
                <button type="button" key={color} aria-label={`${label}色 ${color}`} className={`${styles.colorSwatch} ${appearance[key] === color ? styles.colorSelected : ''}`} style={{ backgroundColor: color }} onClick={() => update(key, color)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={styles.customizerOverlay}>
      <div className={styles.customizerModal} role="dialog" aria-modal="true" aria-label="キャラクターの見た目調整">
        <div className={styles.customizerHeader}>
          <div>
            <h3>見た目を調整</h3>
            <p>正面固定・この端末に保存</p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="見た目調整を閉じる">×</button>
        </div>

        <div className={styles.customizerBody}>
          <div className={styles.customizerPreview}>
            <CharacterAvatar appearance={appearance} className={styles.largeAvatar} />
            <span>正面ビュー</span>
          </div>

          <div className={styles.customizerControls}>
            <div className={styles.customizerTabs} role="tablist" aria-label="キャラクターパーツ">
              {categories.map(item => (
                <button type="button" key={item.id} role="tab" aria-selected={category === item.id} className={`${styles.customizerTab} ${category === item.id ? styles.customizerTabActive : ''}`} onClick={() => setCategory(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className={styles.customizerOptions}>{renderOptions()}</div>
          </div>
        </div>

        <div className={styles.customizerFooter}>
          <button type="button" className={styles.resetCustomizerButton} onClick={onReset}>初期化</button>
          <button type="button" className={styles.confirmBtn} onClick={onClose}>保存して閉じる</button>
        </div>
      </div>
    </div>
  )
}

export default CharacterCustomizerModal
