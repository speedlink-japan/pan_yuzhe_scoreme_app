export type FaceStyle = 'round' | 'soft' | 'oval'
export type EyeStyle = 'round' | 'gentle' | 'sleepy'
export type HairStyle = 'twinLoop' | 'short' | 'bob' | 'long'
export type OutfitStyle = 'female' | 'male' | 'casual' | 'formal' | 'sporty' | 'party'
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
  eyes: 'round',
  eyesColor: '#4F3A37',
  mouth: 'small',
  hair: 'twinLoop',
  hairColor: '#7EA7A2',
  outfit: 'female',
  outfitColor: '#F7F5EF',
  accessory: 'none',
}

export const outfitLabels: Record<OutfitStyle, string> = {
  female: '女性用',
  male: '男性用',
  casual: 'カジュアル',
  formal: 'フォーマル',
  sporty: 'スポーティ',
  party: 'パーティ',
}

export const characterMvpOptions = {
  skinColors: ['#F4C9B4', '#E7B092'],
  eyes: ['round', 'gentle'] as const,
  mouths: ['smile', 'small'] as const,
  hairs: ['twinLoop', 'bob'] as const,
  outfits: ['female', 'male'] as const,
  accessories: ['none', 'bow'] as const,
  hairColors: ['#7EA7A2', '#6B4A45'],
  eyesColors: ['#4F3A37', '#4D78A8'],
  outfitColors: ['#F7F5EF', '#6C78B8'],
} as const

export const characterAppearanceLabels = {
  eyes: { round: 'きらきら', gentle: 'やさしい' },
  mouth: { smile: 'にっこり', small: 'ちいさな口' },
  hair: { twinLoop: 'ツインループ', bob: 'ボブ', short: 'ショート', long: 'ロング' },
  outfit: outfitLabels,
  accessory: { none: 'なし', glasses: 'メガネ', bow: 'リボン', headband: 'ヘアバンド' },
} as const

const storageKey = 'myscore:character-appearance'

const isOneOf = <T extends string>(value: unknown, values: readonly T[]): value is T =>
  typeof value === 'string' && values.includes(value as T)

export function normalizeCharacterAppearance(value: unknown): CharacterAppearance {
  if (!value || typeof value !== 'object') return defaultCharacterAppearance

  const saved = value as Partial<CharacterAppearance>
  const legacyOutfit = saved.outfit === 'casual' ? 'female' : saved.outfit === 'formal' ? 'male' : saved.outfit

  return {
    skinColor: isOneOf(saved.skinColor, characterMvpOptions.skinColors)
      ? saved.skinColor
      : defaultCharacterAppearance.skinColor,
    face: isOneOf(saved.face, ['round', 'soft', 'oval']) ? saved.face : defaultCharacterAppearance.face,
    eyes: isOneOf(saved.eyes, ['round', 'gentle', 'sleepy']) ? saved.eyes : defaultCharacterAppearance.eyes,
    eyesColor: isOneOf(saved.eyesColor, characterMvpOptions.eyesColors)
      ? saved.eyesColor
      : defaultCharacterAppearance.eyesColor,
    mouth: isOneOf(saved.mouth, ['smile', 'small', 'neutral']) ? saved.mouth : defaultCharacterAppearance.mouth,
    hair: isOneOf(saved.hair, ['twinLoop', 'short', 'bob', 'long']) ? saved.hair : defaultCharacterAppearance.hair,
    hairColor: isOneOf(saved.hairColor, characterMvpOptions.hairColors)
      ? saved.hairColor
      : defaultCharacterAppearance.hairColor,
    outfit: isOneOf(legacyOutfit, ['female', 'male', 'casual', 'formal', 'sporty', 'party'])
      ? legacyOutfit
      : defaultCharacterAppearance.outfit,
    outfitColor: isOneOf(saved.outfitColor, characterMvpOptions.outfitColors)
      ? saved.outfitColor
      : defaultCharacterAppearance.outfitColor,
    accessory: isOneOf(saved.accessory, ['none', 'glasses', 'bow', 'headband'])
      ? saved.accessory
      : defaultCharacterAppearance.accessory,
  }
}

export function loadCharacterAppearance(): CharacterAppearance {
  if (typeof window === 'undefined') return defaultCharacterAppearance

  try {
    const saved = window.localStorage.getItem(storageKey)
    if (!saved) return defaultCharacterAppearance

    return normalizeCharacterAppearance(JSON.parse(saved))
  } catch {
    return defaultCharacterAppearance
  }
}

export function saveCharacterAppearance(appearance: CharacterAppearance): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey, JSON.stringify(normalizeCharacterAppearance(appearance)))
}
