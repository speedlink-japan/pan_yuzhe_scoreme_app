'use client'

import Image from 'next/image'
import React, { useState } from 'react'
import styles from './CharacterPanel.module.css'
import CharacterAvatar from './CharacterAvatar'
import CharacterCustomizerModal from './CharacterCustomizerModal'
import {
  CharacterShopState,
  TODO_SESSION_STORAGE_KEY,
  TodoSession,
  getTodoTimestamp,
  normalizeTodoSession,
} from '@/utils/todoSession'
import { persistTodoSession } from '@/utils/todoSupabaseSync'
import {
  CHARACTER_SCENE_PLACEMENT,
  ME_ROOM_SCENE,
  ROOM_ITEM_SCENES,
  ScenePlacement,
} from '@/utils/meRoomScene'
import {
  defaultCharacterAppearance,
  loadCharacterAppearance,
  saveCharacterAppearance,
  type CharacterAppearance,
} from '@/utils/characterAppearance'

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

const roomItems: {
  id: RoomItemId
  label: string
  description: string
  image?: string
  price: number
  scene?: ScenePlacement
}[] = [
  { id: 'none', label: '空部屋', description: '家具を置かない状態', price: 0 },
  {
    id: 'laptop',
    label: 'パソコン',
    description: 'デスクに置いて集中部屋にする',
    image: '/assets/me-room/watercolor-laptop.png',
    price: 40,
    scene: ROOM_ITEM_SCENES.laptop.placement,
  },
]

const CHARACTER_SHOP_STORAGE_KEY = 'myscore.character.shop.v1'
const LEGACY_CHARACTER_SPENT_STORAGE_KEY = 'myscore.character.purchase.spent.v1'
const initialOwnedItems: ShopItemId[] = ['whiteSkirt', 'none']

const appearanceByShopOutfit: Record<OutfitId, Pick<CharacterAppearance, 'outfit' | 'outfitColor'>> = {
  whiteSkirt: { outfit: 'female', outfitColor: '#F7F5EF' },
  uniform: { outfit: 'male', outfitColor: '#6C78B8' },
}

const readTodoSession = (): TodoSession => {
  if (typeof window === 'undefined') return normalizeTodoSession(null)

  try {
    const raw = window.localStorage.getItem(TODO_SESSION_STORAGE_KEY)
    return normalizeTodoSession(raw ? JSON.parse(raw) : null)
  } catch {
    return normalizeTodoSession(null)
  }
}

const sampleLines = [
  '今日も少しずつ進めよう',
  'ポイントでお部屋が育ってるね',
  '次はどんな家具にする？',
]

const CharacterPanel: React.FC<CharacterPanelProps> = ({ availablePoints }) => {
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
  const [appearance, setAppearance] = useState<CharacterAppearance>(defaultCharacterAppearance)
  const [isAppearanceLoaded, setIsAppearanceLoaded] = useState(false)
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false)
  const [showCharacterReference, setShowCharacterReference] = useState(false)

  const selectedOutfit = outfitOptions.find(option => option.id === character.outfit) || outfitOptions[0]
  const visibleItem = roomItems.find(item => item.id === activeItem) || roomItems[0]

  const syncAppearanceToShop = React.useCallback((outfit: OutfitId) => {
    setAppearance(prev => ({ ...prev, ...appearanceByShopOutfit[outfit] }))
  }, [])

  const scenePlacementStyle = (placement: ScenePlacement): React.CSSProperties => ({
    left: `${placement.x}%`,
    top: `${placement.y}%`,
    width: `${placement.width}%`,
    height: `${placement.height}%`,
    zIndex: placement.zIndex,
    '--scene-rotation': `${placement.rotation || 0}deg`,
  } as React.CSSProperties)

  const commitShopState = React.useCallback((nextShop: CharacterShopState): boolean => {
    const currentSession = readTodoSession()
    const nextSession = normalizeTodoSession({
      ...currentSession,
      characterShop: nextShop,
    })
    const updatedAt = getTodoTimestamp()

    try {
      void persistTodoSession(nextSession, updatedAt).catch(() => undefined)
    } catch {
      setNotice('ショップ状態の保存に失敗した')
      return false
    }

    const savedShop = nextSession.characterShop
    setCharacter(prev => ({ ...prev, outfit: savedShop.outfit as OutfitId }))
    setActiveItem(savedShop.activeItem as RoomItemId)
    setOwnedItems(savedShop.ownedItems as ShopItemId[])
    syncAppearanceToShop(savedShop.outfit as OutfitId)
    window.dispatchEvent(
      new CustomEvent('todo-session-external-update', { detail: nextSession })
    )
    return true
  }, [syncAppearanceToShop])

  const selectShopItem = (
    id: ShopItemId,
    price: number,
    label: string,
    selection: Partial<Pick<CharacterShopState, 'outfit' | 'activeItem'>>
  ) => {
    const currentShop = readTodoSession().characterShop
    const isOwned = currentShop.ownedItems.includes(id)

    if (!isOwned && availablePoints < price) {
      setNotice(`${label}の交換にはあと${price - availablePoints}pt必要です`)
      return
    }

    const nextShop: CharacterShopState = {
      ...currentShop,
      ...selection,
      spentPoints: currentShop.spentPoints + (isOwned ? 0 : price),
      ownedItems: isOwned ? currentShop.ownedItems : [...currentShop.ownedItems, id],
    }

    if (!commitShopState(nextShop)) return
    setNotice(isOwned ? `${label}を表示しました` : `${label}を${price}ptで交換しました`)
  }

  const handleChangeOutfit = (outfit: OutfitId) => {
    const option = outfitOptions.find(item => item.id === outfit)
    if (!option) return
    selectShopItem(option.id, option.price, option.label, { outfit })
  }

  const handleChangeRoomItem = (itemId: RoomItemId) => {
    const item = roomItems.find(option => option.id === itemId)
    if (!item) return
    selectShopItem(item.id, item.price, item.label, { activeItem: itemId })
  }

  const handleCharacterClick = () => {
    setSpeechIndex(prev => (prev + 1) % sampleLines.length)
    setIsSpeechVisible(true)
  }

  React.useEffect(() => {
    setAppearance(loadCharacterAppearance())
    setIsAppearanceLoaded(true)
  }, [])

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setShowCharacterReference(
      process.env.NODE_ENV === 'development' && params.get('characterReference') === '1'
    )
  }, [])

  React.useEffect(() => {
    if (isAppearanceLoaded) saveCharacterAppearance(appearance)
  }, [appearance, isAppearanceLoaded])

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
    const sessionShop = readTodoSession().characterShop
    const saved = window.localStorage.getItem(CHARACTER_SHOP_STORAGE_KEY)
    const legacySpent = Number(
      window.localStorage.getItem(LEGACY_CHARACTER_SPENT_STORAGE_KEY) || '0'
    )
    let migratedShop = sessionShop
    let hasLegacyData = Number.isFinite(legacySpent) && legacySpent > 0

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as {
          outfit?: OutfitId
          activeItem?: RoomItemId
          ownedItems?: ShopItemId[]
        }

        migratedShop = {
          spentPoints: sessionShop.spentPoints || (hasLegacyData ? legacySpent : 0),
          outfit:
            parsed.outfit && outfitOptions.some(option => option.id === parsed.outfit)
              ? parsed.outfit
              : sessionShop.outfit,
          activeItem:
            parsed.activeItem && roomItems.some(item => item.id === parsed.activeItem)
              ? parsed.activeItem
              : sessionShop.activeItem,
          ownedItems: Array.from(
            new Set([
              ...sessionShop.ownedItems,
              ...(Array.isArray(parsed.ownedItems) ? parsed.ownedItems : []),
            ])
          ),
        }
        hasLegacyData = true
      } catch {
        setNotice('旧ショップデータを読み込めなかった')
      }
    }

    setCharacter(prev => ({ ...prev, outfit: migratedShop.outfit as OutfitId }))
    setActiveItem(migratedShop.activeItem as RoomItemId)
    setOwnedItems(migratedShop.ownedItems as ShopItemId[])
    syncAppearanceToShop(migratedShop.outfit as OutfitId)
    if (hasLegacyData) commitShopState(migratedShop)
  }, [commitShopState, syncAppearanceToShop])

  React.useEffect(() => {
    const handleSessionUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<Partial<TodoSession>>
      const shop = normalizeTodoSession(customEvent.detail).characterShop
      setCharacter(prev => ({ ...prev, outfit: shop.outfit as OutfitId }))
      setActiveItem(shop.activeItem as RoomItemId)
      setOwnedItems(shop.ownedItems as ShopItemId[])
      syncAppearanceToShop(shop.outfit as OutfitId)
    }

    window.addEventListener('todo-session-updated', handleSessionUpdate)
    window.addEventListener('todo-session-external-update', handleSessionUpdate)
    return () => {
      window.removeEventListener('todo-session-updated', handleSessionUpdate)
      window.removeEventListener('todo-session-external-update', handleSessionUpdate)
    }
  }, [syncAppearanceToShop])

  const handleResetAppearance = () => {
    setAppearance({
      ...defaultCharacterAppearance,
      ...appearanceByShopOutfit[character.outfit],
    })
  }

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
          <div className={styles.sceneCanvas}>
            <Image
              className={styles.roomBackground}
              src={ME_ROOM_SCENE.background}
              alt=""
              fill
              sizes="(max-width: 600px) 100vw, 80vw"
              priority
            />
            {visibleItem.image && visibleItem.scene && (
              <Image
                className={styles.roomItem}
                style={scenePlacementStyle(visibleItem.scene)}
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
              style={scenePlacementStyle(CHARACTER_SCENE_PLACEMENT)}
              onClick={handleCharacterClick}
              aria-label={`${character.name}のセリフを見る`}
            >
              <CharacterAvatar
                appearance={appearance}
                className={styles.roomCharacterAvatar}
                showReference={showCharacterReference}
              />
            </button>
          </div>
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

          {isCustomizerOpen && (
            <CharacterCustomizerModal
              appearance={appearance}
              onChange={setAppearance}
              onClose={() => setIsCustomizerOpen(false)}
              onReset={handleResetAppearance}
            />
          )}

          {!isRoomUiHidden ? (
            <div className={styles.roomActions} aria-label="部屋の操作">
              <button
                type="button"
                className={styles.roomActionButton}
                onClick={() => setIsCustomizerOpen(true)}
                title="正面向きキャラクターの見た目を調整"
              >
                キャラ作成
              </button>
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
