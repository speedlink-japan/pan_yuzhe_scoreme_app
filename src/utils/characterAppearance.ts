export type FaceStyle = 'round' | 'soft' | 'oval'
export type EyeStyle = 'round' | 'gentle' | 'sleepy'
export type HairStyle = 'short' | 'bob' | 'long'
export type OutfitStyle = 'casual' | 'formal' | 'sporty' | 'party'
export type AccessoryStyle = 'none' | 'glasses' | 'bow' | 'headband'

export interface CharacterAppearance {
  skinColor: string
  face: FaceStyle
  eyes: EyeStyle
  eyesColor: string
  mouth: 'smile' | 'small' | 'neutral'
  hair: HairStyle
  hairColor: string
  outfit: OutfitStyle
  outfitColor: string
  accessory: AccessoryStyle
}

export const defaultCharacterAppearance: CharacterAppearance = {
  skinColor: '#F4C9B4',
  face: 'soft',
  eyes: 'gentle',
  eyesColor: '#4F3A37',
  mouth: 'smile',
  hair: 'bob',
  hairColor: '#6B4A45',
  outfit: 'casual',
  outfitColor: '#F7F5EF',
  accessory: 'bow',
}

export const outfitLabels: Record<OutfitStyle, string> = {
  casual: 'カジュアル',
  formal: 'フォーマル',
  sporty: 'スポーティ',
  party: 'パーティ',
}

const storageKey = 'myscore:character-appearance'

export function loadCharacterAppearance(): CharacterAppearance {
  if (typeof window === 'undefined') return defaultCharacterAppearance

  try {
    const saved = window.localStorage.getItem(storageKey)
    if (!saved) return defaultCharacterAppearance

    return {
      ...defaultCharacterAppearance,
      ...JSON.parse(saved),
    }
  } catch {
    return defaultCharacterAppearance
  }
}

export function saveCharacterAppearance(appearance: CharacterAppearance): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey, JSON.stringify(appearance))
}
