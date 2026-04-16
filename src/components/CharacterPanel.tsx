'use client'

import React, { useState } from 'react'
import styles from './CharacterPanel.module.css'

interface Character {
  name: string
  level: number
  points: number
  outfit: string
  mood: string
  dailyShown: boolean
}

const CharacterPanel: React.FC = () => {
  const [character, setCharacter] = useState<Character>({
    name: 'MyCharacter',
    level: 1,
    points: 250,
    outfit: 'casual',
    mood: 'happy',
    dailyShown: true,
  })

  const [showModeModal, setShowModeModal] = useState(true)
  const [selectedOutfit, setSelectedOutfit] = useState(character.outfit)

  const outfits = [
    { id: 'casual', label: 'Casual', emoji: '👕' },
    { id: 'formal', label: 'Formal', emoji: '🎩' },
    { id: 'party', label: 'Party', emoji: '🎉' },
    { id: 'athletic', label: 'Athletic', emoji: '🏃' },
  ]

  const handleCloseDailyModal = () => {
    setShowModeModal(false)
  }

  const handleChangeOutfit = (outfitId: string) => {
    setSelectedOutfit(outfitId)
    setCharacter({ ...character, outfit: outfitId })
  }

  const handleBreak = () => {
    alert('☕ You take a nice break with your character!')
  }

  const handleAccessory = () => {
    alert("✨ Let's change the outfit!")
    setShowModeModal(true)
  }

  const handleHobby = () => {
    alert('🎲 Your character is having fun with hobbies!')
  }

  return (
    <div className={styles.panel}>
      {showModeModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>How should I be today? 🤔</h3>
            <p>Let us choose the mood and outfit for today!</p>

            <div className={styles.outfitGrid}>
              {outfits.map(outfit => (
                <button
                  key={outfit.id}
                  className={`${styles.outfitBtn} ${selectedOutfit === outfit.id ? styles.selected : ''}`}
                  onClick={() => handleChangeOutfit(outfit.id)}
                >
                  <span className={styles.outfitEmoji}>{outfit.emoji}</span>
                  <span className={styles.outfitLabel}>{outfit.label}</span>
                </button>
              ))}
            </div>

            <label className={styles.dailyCheckbox}>
              <input
                type="checkbox"
                checked={!character.dailyShown}
                onChange={(e) => setCharacter({ ...character, dailyShown: !e.target.checked })}
              />
              Do not show again today
            </label>

            <button
              onClick={handleCloseDailyModal}
              className={styles.confirmBtn}
            >
              Confirm ✨
            </button>
          </div>
        </div>
      )}

      <div className={styles.header}>
        <h2>🏠 Me</h2>
        <span className={styles.levelBadge}>Lv.{character.level}</span>
      </div>

      <div className={styles.content}>
        <div className={styles.characterDisplay}>
          <div className={styles.characterImage}>
            🎀
          </div>
          <div className={styles.characterInfo}>
            <h3>{character.name}</h3>
            <p className={styles.outfit}>Outfit: {selectedOutfit}</p>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Points:</span>
                <span className={styles.statValue}>{character.points}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Level:</span>
                <span className={styles.statValue}>{character.level}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.actionButtons}>
          <button
            className={styles.actionBtn}
            onClick={handleBreak}
            title="Take a break"
          >
            <span className={styles.btnEmoji}>☕</span>
            <span className={styles.btnLabel}>Relax</span>
          </button>

          <button
            className={styles.actionBtn}
            onClick={handleAccessory}
            title="Change outfit"
          >
            <span className={styles.btnEmoji}>✨</span>
            <span className={styles.btnLabel}>Fashion</span>
          </button>

          <button
            className={styles.actionBtn}
            onClick={handleHobby}
            title="Hobby interaction"
          >
            <span className={styles.btnEmoji}>🎲</span>
            <span className={styles.btnLabel}>Hobby</span>
          </button>
        </div>

        <div className={styles.rewardsSection}>
          <h4>Rewards</h4>
          <div className={styles.rewardsList}>
            <div className={styles.rewardItem}>
              <span>✨ Special Outfit</span>
              <span className={styles.pointsRequired}>500pts</span>
            </div>
            <div className={styles.rewardItem}>
              <span>🎀 Accessory Pack</span>
              <span className={styles.pointsRequired}>300pts</span>
            </div>
            <div className={styles.rewardItem}>
              <span>🏡 Home Decoration</span>
              <span className={styles.pointsRequired}>250pts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CharacterPanel
