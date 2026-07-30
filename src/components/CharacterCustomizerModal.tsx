'use client'

import React, { useState } from 'react'
import styles from './CharacterPanel.module.css'
import CharacterAvatar from './CharacterAvatar'
import {
  characterAppearanceLabels,
  characterMvpOptions,
  type AccessoryStyle,
  type CharacterAppearance,
  type EyeStyle,
  type HairStyle,
  type OutfitStyle,
} from '@/utils/characterAppearance'

type Category = 'eyes' | 'mouth' | 'hair' | 'outfit' | 'accessory' | 'colors'

interface CharacterCustomizerModalProps {
  appearance: CharacterAppearance
  onChange: (appearance: CharacterAppearance) => void
  onClose: () => void
  onReset: () => void
}

const categories: { id: Category; label: string }[] = [
  { id: 'eyes', label: '目' },
  { id: 'mouth', label: '口' },
  { id: 'hair', label: '髪' },
  { id: 'outfit', label: '服' },
  { id: 'accessory', label: '小物' },
  { id: 'colors', label: '色' },
]

const labels = characterAppearanceLabels

const CharacterCustomizerModal: React.FC<CharacterCustomizerModalProps> = ({ appearance, onChange, onClose, onReset }) => {
  const [category, setCategory] = useState<Category>('eyes')

  const update = <K extends keyof CharacterAppearance>(key: K, value: CharacterAppearance[K]) => {
    onChange({ ...appearance, [key]: value })
  }

  const optionButton = <T extends string>(
    key: keyof CharacterAppearance,
    value: T,
    label: string,
    preview: CharacterAppearance
  ) => (
    <button
      type="button"
      key={value}
      className={`${styles.customizerOption} ${appearance[key] === value ? styles.customizerSelected : ''}`}
      onClick={() => update(key, value as CharacterAppearance[typeof key])}
      aria-label={`${label}を選択`}
    >
      <span className={styles.optionAvatarWrap}>
        <CharacterAvatar appearance={preview} className={styles.optionAvatar} />
      </span>
      <span>{label}</span>
    </button>
  )

  const renderOptions = () => {
    if (category === 'eyes') {
      return (
        <div className={styles.customizerOptionGrid}>
          {characterMvpOptions.eyes.map(value => optionButton(
            'eyes',
            value,
            labels.eyes[value],
            { ...appearance, eyes: value as EyeStyle }
          ))}
        </div>
      )
    }

    if (category === 'mouth') {
      return (
        <div className={styles.customizerOptionGrid}>
          {characterMvpOptions.mouths.map(value => optionButton(
            'mouth',
            value,
            labels.mouth[value],
            { ...appearance, mouth: value }
          ))}
        </div>
      )
    }

    if (category === 'hair') {
      return (
        <div className={styles.customizerOptionGrid}>
          {characterMvpOptions.hairs.map(value => optionButton(
            'hair',
            value,
            labels.hair[value],
            { ...appearance, hair: value as HairStyle }
          ))}
        </div>
      )
    }

    if (category === 'outfit') {
      return (
        <div className={styles.customizerOptionGrid}>
          {characterMvpOptions.outfits.map(value => optionButton(
            'outfit',
            value,
            labels.outfit[value],
            { ...appearance, outfit: value as OutfitStyle }
          ))}
        </div>
      )
    }

    if (category === 'accessory') {
      return (
        <div className={styles.customizerOptionGrid}>
          {characterMvpOptions.accessories.map(value => optionButton(
            'accessory',
            value,
            labels.accessory[value],
            { ...appearance, accessory: value as AccessoryStyle }
          ))}
        </div>
      )
    }

    const paletteSections = [
      ['skinColor', '肌', characterMvpOptions.skinColors],
      ['hairColor', '髪', characterMvpOptions.hairColors],
      ['eyesColor', '目', characterMvpOptions.eyesColors],
      ['outfitColor', '服', characterMvpOptions.outfitColors],
    ] as const

    return (
      <div className={styles.paletteSections}>
        <p className={styles.paletteHint}>初回MVPは各パーツ2パターン</p>
        {paletteSections.map(([key, label, colors]) => (
          <div key={key} className={styles.paletteSection}>
            <span className={styles.paletteLabel}>{label}</span>
            <div className={styles.colorGrid}>
              {colors.map(color => (
                <button
                  type="button"
                  key={color}
                  aria-label={`${label}色 ${color}`}
                  className={`${styles.colorSwatch} ${appearance[key] === color ? styles.colorSelected : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => update(key, color)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={styles.customizerOverlay}>
      <div className={styles.customizerModal} role="dialog" aria-modal="true" aria-label="キャラクター作成">
        <div className={styles.customizerHeader}>
          <div>
            <h3>キャラクターを作成</h3>
            <p>正面固定・初回MVP・この端末に保存</p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="キャラクター作成を閉じる">×</button>
        </div>

        <div className={styles.customizerBody}>
          <div className={styles.customizerPreview}>
            <CharacterAvatar appearance={appearance} className={styles.largeAvatar} />
            <span>正面ビュー</span>
            <small>肌2・目2・口2・髪2・服2</small>
          </div>

          <div className={styles.customizerControls}>
            <div className={styles.customizerTabs} role="tablist" aria-label="キャラクターパーツ">
              {categories.map(item => (
                <button
                  type="button"
                  key={item.id}
                  role="tab"
                  aria-selected={category === item.id}
                  className={`${styles.customizerTab} ${category === item.id ? styles.customizerTabActive : ''}`}
                  onClick={() => setCategory(item.id)}
                >
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
