'use client'

import Image from 'next/image'
import React, { useState } from 'react'
import styles from './CharacterPanel.module.css'

type OutfitId = 'home' | 'focus' | 'music'
type RoomItemId = 'guitar' | 'laptop'

interface Character {
  name: string
  level: number
  points: number
  outfit: OutfitId
}

const outfitOptions: { id: OutfitId; label: string; tone: string }[] = [
  { id: 'home', label: '部屋着', tone: 'やさしいピンク' },
  { id: 'focus', label: '集中', tone: '落ち着いたブルー' },
  { id: 'music', label: '音楽', tone: 'あたたかいオレンジ' },
]

const roomItems: { id: RoomItemId; label: string; image: string }[] = [
  { id: 'guitar', label: 'ギター', image: '/assets/me-room/guitar.png' },
  { id: 'laptop', label: 'パソコン', image: '/assets/me-room/laptop.png' },
]

const CharacterPanel: React.FC = () => {
  const [character, setCharacter] = useState<Character>({
    name: 'MyCharacter',
    level: 1,
    points: 250,
    outfit: 'home',
  })
  const [activeItem, setActiveItem] = useState<RoomItemId>('guitar')

  const selectedOutfit = outfitOptions.find(option => option.id === character.outfit) || outfitOptions[0]
  const visibleItem = roomItems.find(item => item.id === activeItem) || roomItems[0]

  const handleChangeOutfit = (outfit: OutfitId) => {
    setCharacter(prev => ({ ...prev, outfit }))
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2>🏠 Me</h2>
        <div className={styles.headerStats}>
          <span>Lv.{character.level}</span>
          <span>{character.points}pt</span>
        </div>
      </div>

      <div className={styles.content}>
        <section className={styles.roomStage} aria-label="着せ替えルーム">
          <Image
            className={styles.roomBackground}
            src="/assets/me-room/room-background.png"
            alt=""
            fill
            sizes="(max-width: 600px) 100vw, 50vw"
            priority
          />
          <Image
            className={`${styles.miniCharacter} ${styles[character.outfit]}`}
            src="/assets/me-room/mini-character.png"
            alt={character.name}
            width={420}
            height={336}
          />
          <Image
            className={`${styles.roomItem} ${styles[activeItem]}`}
            src={visibleItem.image}
            alt={visibleItem.label}
            width={260}
            height={260}
          />
          <div className={styles.namePlate}>
            <span>{character.name}</span>
            <small>{selectedOutfit.label}</small>
          </div>
        </section>

        <section className={styles.controls}>
          <div className={styles.controlGroup}>
            <div className={styles.groupHeader}>
              <span>着せ替え</span>
              <small>{selectedOutfit.tone}</small>
            </div>
            <div className={styles.optionGrid}>
              {outfitOptions.map(option => (
                <button
                  key={option.id}
                  type="button"
                  className={`${styles.optionButton} ${character.outfit === option.id ? styles.selected : ''}`}
                  onClick={() => handleChangeOutfit(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <div className={styles.groupHeader}>
              <span>部屋アイテム</span>
              <small>{visibleItem.label}</small>
            </div>
            <div className={styles.optionGrid}>
              {roomItems.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.optionButton} ${activeItem === item.id ? styles.selected : ''}`}
                  onClick={() => setActiveItem(item.id)}
                >
                  {item.label}
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
