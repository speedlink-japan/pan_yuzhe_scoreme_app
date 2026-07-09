'use client'

import Image from 'next/image'
import React, { useState } from 'react'
import styles from './CharacterPanel.module.css'

type OutfitId = 'whiteSkirt' | 'uniform'
type RoomItemId = 'none' | 'laptop'

interface Character {
  name: string
  level: number
  points: number
  outfit: OutfitId
}

const outfitOptions: { id: OutfitId; label: string; description: string; image: string; price: number }[] = [
  {
    id: 'whiteSkirt',
    label: '白いスカート',
    description: '淡い水彩のワンピース風',
    image: '/assets/me-room/white-skirt-character.png',
    price: 80,
  },
  {
    id: 'uniform',
    label: '制服',
    description: '落ち着いた通学スタイル',
    image: '/assets/me-room/uniform-character.png',
    price: 120,
  },
]

const roomItems: { id: RoomItemId; label: string; description: string; image?: string; price: number }[] = [
  { id: 'none', label: '空部屋', description: '家具を置かない状態', price: 0 },
  {
    id: 'laptop',
    label: 'パソコン',
    description: 'デスクに置いて集中部屋にする',
    image: '/assets/me-room/watercolor-laptop.png',
    price: 150,
  },
]

const sampleLines = [
  '今日も少しずつ進めよう',
  'ポイントでお部屋が育ってるね',
  '次はどんな家具にする？',
]

const CharacterPanel: React.FC = () => {
  const [character, setCharacter] = useState<Character>({
    name: 'MyCharacter',
    level: 1,
    points: 250,
    outfit: 'whiteSkirt',
  })
  const [activeItem, setActiveItem] = useState<RoomItemId>('none')
  const [speechIndex, setSpeechIndex] = useState(0)
  const [isSpeechVisible, setIsSpeechVisible] = useState(true)

  const selectedOutfit = outfitOptions.find(option => option.id === character.outfit) || outfitOptions[0]
  const visibleItem = roomItems.find(item => item.id === activeItem) || roomItems[0]

  const handleChangeOutfit = (outfit: OutfitId) => {
    setCharacter(prev => ({ ...prev, outfit }))
  }

  const handleCharacterClick = () => {
    setSpeechIndex(prev => (prev + 1) % sampleLines.length)
    setIsSpeechVisible(true)
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2>Me</h2>
        <div className={styles.headerStats}>
          <span>Lv.{character.level}</span>
          <span>{character.points}pt</span>
        </div>
      </div>

      <div className={styles.content}>
        <section className={styles.roomStage} aria-label="着せ替えルーム">
          <Image
            className={styles.roomBackground}
            src="/assets/me-room/watercolor-room.png"
            alt=""
            fill
            sizes="(max-width: 600px) 100vw, 50vw"
            priority
          />
          {visibleItem.image && (
            <Image
              className={`${styles.roomItem} ${styles[activeItem]}`}
              src={visibleItem.image}
              alt={visibleItem.label}
              width={320}
              height={256}
            />
          )}
          {isSpeechVisible && (
            <button
              type="button"
              className={styles.speechBubble}
              onClick={() => setIsSpeechVisible(false)}
              aria-label="セリフを閉じる"
            >
              {sampleLines[speechIndex]}
            </button>
          )}
          <button
            type="button"
            className={styles.characterButton}
            onClick={handleCharacterClick}
            aria-label={`${character.name}のセリフを見る`}
          >
            <Image
              className={styles.miniCharacter}
              src={selectedOutfit.image}
              alt={character.name}
              width={360}
              height={440}
            />
          </button>
          <div className={styles.namePlate}>
            <span>{character.name}</span>
            <small>{selectedOutfit.label} / {visibleItem.label}</small>
          </div>
        </section>

        <section className={styles.controls}>
          <div className={styles.controlGroup}>
            <div className={styles.groupHeader}>
              <span>着せ替え交換</span>
              <small>{selectedOutfit.description}</small>
            </div>
            <div className={styles.optionGrid}>
              {outfitOptions.map(option => (
                <button
                  key={option.id}
                  type="button"
                  className={`${styles.optionButton} ${character.outfit === option.id ? styles.selected : ''}`}
                  onClick={() => handleChangeOutfit(option.id)}
                >
                  <span>{option.label}</span>
                  <small>{option.price}pt</small>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <div className={styles.groupHeader}>
              <span>家具交換</span>
              <small>{visibleItem.description}</small>
            </div>
            <div className={styles.optionGrid}>
              {roomItems.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.optionButton} ${activeItem === item.id ? styles.selected : ''}`}
                  onClick={() => setActiveItem(item.id)}
                >
                  <span>{item.label}</span>
                  <small>{item.price === 0 ? '0pt' : `${item.price}pt`}</small>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default CharacterPanel
