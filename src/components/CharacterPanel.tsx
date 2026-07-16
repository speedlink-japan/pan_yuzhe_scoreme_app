'use client'

import Image from 'next/image'
import React, { useState } from 'react'
import styles from './CharacterPanel.module.css'

type OutfitId = 'whiteSkirt' | 'uniform'
type RoomItemId = 'none' | 'laptop'
type ShopItemId = OutfitId | RoomItemId
type ShopTab = 'outfit' | 'room'

interface Character {
  name: string
  level: number
  outfit: OutfitId
}

interface CharacterPanelProps {
  availablePoints: number
  onSpendPoints: (points: number) => void
}

const outfitOptions: { id: OutfitId; label: string; description: string; image: string; price: number }[] = [
  {
    id: 'whiteSkirt',
    label: '白いスカート',
    description: '淡い水彩のワンピース風',
    image: '/assets/me-room/white-skirt-character.png',
    price: 0,
  },
  {
    id: 'uniform',
    label: '制服',
    description: '落ち着いた通学スタイル',
    image: '/assets/me-room/uniform-character.png',
    price: 30,
  },
]

const roomItems: { id: RoomItemId; label: string; description: string; image?: string; price: number }[] = [
  { id: 'none', label: '空部屋', description: '家具を置かない状態', price: 0 },
  {
    id: 'laptop',
    label: 'パソコン',
    description: 'デスクに置いて集中部屋にする',
    image: '/assets/me-room/watercolor-laptop.png',
    price: 40,
  },
]

const CHARACTER_SHOP_STORAGE_KEY = 'myscore.character.shop.v1'
const initialOwnedItems: ShopItemId[] = ['whiteSkirt', 'none']

const sampleLines = [
  '今日も少しずつ進めよう',
  'ポイントでお部屋が育ってるね',
  '次はどんな家具にする？',
]

const CharacterPanel: React.FC<CharacterPanelProps> = ({ availablePoints, onSpendPoints }) => {
  const [character, setCharacter] = useState<Character>({
    name: 'MyCharacter',
    level: 1,
    outfit: 'whiteSkirt',
  })
  const [activeItem, setActiveItem] = useState<RoomItemId>('none')
  const [ownedItems, setOwnedItems] = useState<ShopItemId[]>(initialOwnedItems)
  const [notice, setNotice] = useState('白いスカートと空部屋は最初から使えます')
  const [speechIndex, setSpeechIndex] = useState(0)
  const [isSpeechVisible, setIsSpeechVisible] = useState(true)
  const [isShopOpen, setIsShopOpen] = useState(false)
  const [shopTab, setShopTab] = useState<ShopTab>('outfit')
  const [isRoomFullscreen, setIsRoomFullscreen] = useState(false)
  const [isRoomUiHidden, setIsRoomUiHidden] = useState(false)
  const [isShopHydrated, setIsShopHydrated] = useState(false)

  const selectedOutfit = outfitOptions.find(option => option.id === character.outfit) || outfitOptions[0]
  const visibleItem = roomItems.find(item => item.id === activeItem) || roomItems[0]

  const handleChangeOutfit = (outfit: OutfitId) => {
    const option = outfitOptions.find(item => item.id === outfit)
    if (!option || !purchaseItem(option.id, option.price, option.label)) return
    setCharacter(prev => ({ ...prev, outfit }))
  }

  const handleChangeRoomItem = (itemId: RoomItemId) => {
    const item = roomItems.find(option => option.id === itemId)
    if (!item || !purchaseItem(item.id, item.price, item.label)) return
    setActiveItem(itemId)
  }

  const purchaseItem = (id: ShopItemId, price: number, label: string) => {
    if (ownedItems.includes(id)) {
      setNotice(`${label}を表示しました`)
      return true
    }

    if (availablePoints < price) {
      setNotice(`${label}の交換にはあと${price - availablePoints}pt必要です`)
      return false
    }

    setOwnedItems(prev => [...prev, id])
    onSpendPoints(price)
    setNotice(`${label}を${price}ptで交換しました`)
    return true
  }

  const handleCharacterClick = () => {
    setSpeechIndex(prev => (prev + 1) % sampleLines.length)
    setIsSpeechVisible(true)
  }

  React.useEffect(() => {
    if (!isRoomFullscreen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsRoomFullscreen(false)
        setIsShopOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isRoomFullscreen])

  React.useEffect(() => {
    const saved = window.localStorage.getItem(CHARACTER_SHOP_STORAGE_KEY)
    if (!saved) {
      setIsShopHydrated(true)
      return
    }

    try {
      const parsed = JSON.parse(saved) as {
        outfit?: OutfitId
        activeItem?: RoomItemId
        ownedItems?: ShopItemId[]
      }

      if (parsed.outfit && outfitOptions.some(option => option.id === parsed.outfit)) {
        setCharacter(prev => ({ ...prev, outfit: parsed.outfit as OutfitId }))
      }
      if (parsed.activeItem && roomItems.some(item => item.id === parsed.activeItem)) {
        setActiveItem(parsed.activeItem)
      }
      if (Array.isArray(parsed.ownedItems)) {
        setOwnedItems(Array.from(new Set([...initialOwnedItems, ...parsed.ownedItems])))
      }
    } catch {
      window.localStorage.removeItem(CHARACTER_SHOP_STORAGE_KEY)
    }
    setIsShopHydrated(true)
  }, [])

  React.useEffect(() => {
    if (!isShopHydrated) return
    window.localStorage.setItem(
      CHARACTER_SHOP_STORAGE_KEY,
      JSON.stringify({
        outfit: character.outfit,
        activeItem,
        ownedItems,
      })
    )
  }, [character.outfit, activeItem, ownedItems, isShopHydrated])

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2>Me</h2>
        <div className={styles.headerStats}>
          <span>Lv.{character.level}</span>
          <span>{availablePoints}pt</span>
        </div>
      </div>

      <div className={styles.content}>
        <section
          className={`${styles.roomStage} ${isRoomFullscreen ? styles.roomStageFullscreen : ''}`}
          aria-label="着せ替えルーム"
        >
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
          {!isRoomUiHidden && (
            <div className={styles.namePlate}>
              <span>{character.name}</span>
              <small>{selectedOutfit.label} / {visibleItem.label}</small>
            </div>
          )}

          {isShopOpen && (
            <div
              className={styles.shopOverlay}
              role="dialog"
              aria-modal="true"
              aria-label="ショップ"
              onClick={() => setIsShopOpen(false)}
            >
              <div className={styles.shopPanel} onClick={event => event.stopPropagation()}>
                <div className={styles.shopHeader}>
                  <div>
                    <strong>ショップ</strong>
                    <small>{availablePoints}pt</small>
                  </div>
                  <button
                    type="button"
                    className={styles.shopCloseButton}
                    onClick={() => setIsShopOpen(false)}
                    aria-label="ショップを閉じる"
                  >
                    ×
                  </button>
                </div>

                <div className={styles.shopTabs} role="tablist" aria-label="ショップの種類">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={shopTab === 'outfit'}
                    className={`${styles.shopTab} ${shopTab === 'outfit' ? styles.shopTabActive : ''}`}
                    onClick={() => setShopTab('outfit')}
                  >
                    着せ替え
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={shopTab === 'room'}
                    className={`${styles.shopTab} ${shopTab === 'room' ? styles.shopTabActive : ''}`}
                    onClick={() => setShopTab('room')}
                  >
                    家具
                  </button>
                </div>

                <p className={styles.notice}>{notice}</p>

                <div className={styles.optionGrid}>
                  {shopTab === 'outfit'
                    ? outfitOptions.map(option => (
                        <button
                          key={option.id}
                          type="button"
                          className={`${styles.optionButton} ${character.outfit === option.id ? styles.selected : ''}`}
                          onClick={() => handleChangeOutfit(option.id)}
                        >
                          <span>{option.label}</span>
                          <small>{ownedItems.includes(option.id) ? '購入済み' : `${option.price}ptで交換`}</small>
                        </button>
                      ))
                    : roomItems.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          className={`${styles.optionButton} ${activeItem === item.id ? styles.selected : ''}`}
                          onClick={() => handleChangeRoomItem(item.id)}
                        >
                          <span>{item.label}</span>
                          <small>{ownedItems.includes(item.id) ? '購入済み' : `${item.price}ptで交換`}</small>
                        </button>
                      ))}
                </div>
              </div>
            </div>
          )}

          {!isRoomUiHidden ? (
            <div className={styles.roomActions} aria-label="部屋の操作">
              <button
                type="button"
                className={styles.roomActionButton}
                onClick={() => setIsShopOpen(true)}
                title="着せ替えと家具のショップを開く"
              >
                ショップ
              </button>
              <button
                type="button"
                className={styles.roomActionButton}
                onClick={() => setIsRoomFullscreen(prev => !prev)}
                title={isRoomFullscreen ? '部屋を通常表示に戻す' : '部屋をフルスクリーン表示'}
              >
                {isRoomFullscreen ? '戻す' : '全画面'}
              </button>
              <button
                type="button"
                className={styles.roomActionButton}
                onClick={() => setIsRoomUiHidden(true)}
                title="部屋のUIを隠す"
              >
                UI隠し
              </button>
              <button
                type="button"
                className={styles.roomActionButton}
                onClick={() => setIsSpeechVisible(prev => !prev)}
                title={isSpeechVisible ? '吹き出しを隠す' : '吹き出しを表示'}
              >
                {isSpeechVisible ? '吹き出しオフ' : '吹き出しオン'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={styles.uiRestoreButton}
              onClick={() => setIsRoomUiHidden(false)}
              title="部屋のUIを表示する"
            >
              UI表示
            </button>
          )}
        </section>
      </div>
    </div>
  )
}

export default CharacterPanel
