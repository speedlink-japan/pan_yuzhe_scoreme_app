'use client'

import React from 'react'
import type { CharacterAppearance } from '@/utils/characterAppearance'

interface CharacterAvatarProps {
  appearance: CharacterAppearance
  className?: string
}

const hairShapes = {
  twinLoop: 'M31 106 C22 48 53 18 100 18 C147 18 178 48 169 106 L151 155 L49 155 Z',
  short: 'M38 94 C32 48 56 23 100 23 C144 23 168 48 162 94 L147 112 L53 112 Z',
  bob: 'M31 106 C22 48 53 18 100 18 C147 18 178 48 169 106 L151 155 L49 155 Z',
  long: 'M29 105 C22 45 53 15 100 15 C147 15 178 45 171 105 L164 203 L36 203 Z',
}

const outfitColors: Record<CharacterAppearance['outfit'], string> = {
  female: '#F7F5EF',
  male: '#6C78B8',
  casual: '#8CCFC3',
  formal: '#6C78B8',
  sporty: '#F3B562',
  party: '#D98AB8',
}

const CharacterAvatar: React.FC<CharacterAvatarProps> = ({ appearance, className }) => {
  const faceWidth = appearance.face === 'round' ? 66 : appearance.face === 'oval' ? 57 : 62
  const faceHeight = appearance.face === 'round' ? 74 : appearance.face === 'oval' ? 84 : 79
  const outfitColor = appearance.outfitColor || outfitColors[appearance.outfit]
  const isMaleOutfit = appearance.outfit === 'male' || appearance.outfit === 'formal'

  return (
    <svg
      className={className}
      viewBox="0 0 200 240"
      role="img"
      aria-label="正面向きのキャラクター"
      preserveAspectRatio="xMidYMid meet"
    >
      {isMaleOutfit ? (
        <>
          <path d="M42 239 C44 201 57 178 78 176 H122 C143 178 156 201 158 239 Z" fill={outfitColor} />
          <path d="M82 178 H118 V217 H82 Z" fill="#F7F5EF" opacity="0.95" />
          <path d="M100 181 V217" stroke="#B6C5D6" strokeWidth="2" />
          <path d="M45 214 H155" stroke="#C28A54" strokeWidth="4" opacity="0.8" />
        </>
      ) : (
        <>
          <path d="M42 239 C44 193 65 176 100 176 C135 176 156 193 158 239 Z" fill={outfitColor} />
          <path d="M60 221 C82 207 118 207 140 221" fill="none" stroke="#FFFFFF" strokeWidth="5" opacity="0.62" />
        </>
      )}

      <path d="M79 157 H121 V188 C112 196 88 196 79 188 Z" fill={appearance.skinColor} />
      <path d={hairShapes[appearance.hair]} fill={appearance.hairColor} />
      {appearance.hair === 'twinLoop' && (
        <>
          <circle cx="30" cy="73" r="28" fill={appearance.hairColor} />
          <circle cx="170" cy="73" r="28" fill={appearance.hairColor} />
          <circle cx="30" cy="73" r="15" fill="#5E9693" opacity="0.5" />
          <circle cx="170" cy="73" r="15" fill="#5E9693" opacity="0.5" />
        </>
      )}

      <ellipse cx="100" cy="107" rx={faceWidth} ry={faceHeight} fill={appearance.skinColor} />
      <path d="M36 103 C40 58 66 34 100 34 C134 34 160 58 164 103" fill="none" stroke={appearance.hairColor} strokeWidth="13" strokeLinecap="round" />

      {appearance.eyes === 'sleepy' ? (
        <>
          <path d="M66 109 Q76 116 86 109" fill="none" stroke={appearance.eyesColor} strokeWidth="4" strokeLinecap="round" />
          <path d="M114 109 Q124 116 134 109" fill="none" stroke={appearance.eyesColor} strokeWidth="4" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="76" cy="108" rx={appearance.eyes === 'round' ? 9 : 7} ry={appearance.eyes === 'round' ? 11 : 9} fill="#FFFFFF" />
          <ellipse cx="124" cy="108" rx={appearance.eyes === 'round' ? 9 : 7} ry={appearance.eyes === 'round' ? 11 : 9} fill="#FFFFFF" />
          <circle cx="76" cy="110" r="4" fill={appearance.eyesColor} />
          <circle cx="124" cy="110" r="4" fill={appearance.eyesColor} />
        </>
      )}

      <path d="M69 91 Q76 87 83 91" fill="none" stroke={appearance.eyesColor} strokeWidth="3" strokeLinecap="round" />
      <path d="M117 91 Q124 87 131 91" fill="none" stroke={appearance.eyesColor} strokeWidth="3" strokeLinecap="round" />
      <path d="M100 116 Q96 126 100 128" fill="none" stroke="#C88F7E" strokeWidth="2" strokeLinecap="round" />

      {appearance.mouth === 'smile' && <path d="M91 139 Q100 147 109 139" fill="none" stroke="#B65E70" strokeWidth="3" strokeLinecap="round" />}
      {appearance.mouth === 'small' && <path d="M96 141 Q100 144 104 141" fill="none" stroke="#B65E70" strokeWidth="3" strokeLinecap="round" />}
      {appearance.mouth === 'neutral' && <path d="M94 142 H106" stroke="#B65E70" strokeWidth="3" strokeLinecap="round" />}

      <path d="M42 82 Q64 55 87 63 L82 91 Q60 85 42 100 Z" fill={appearance.hairColor} />
      <path d="M158 82 Q136 55 113 63 L118 91 Q140 85 158 100 Z" fill={appearance.hairColor} />

      {appearance.accessory === 'glasses' && (
        <>
          <circle cx="76" cy="108" r="16" fill="none" stroke="#5A5968" strokeWidth="3" />
          <circle cx="124" cy="108" r="16" fill="none" stroke="#5A5968" strokeWidth="3" />
          <path d="M92 108 H108" stroke="#5A5968" strokeWidth="3" />
        </>
      )}
      {appearance.accessory === 'bow' && (
        <>
          <path d="M100 37 C82 20 70 27 78 45 C85 56 94 49 100 43 Z" fill="#F2A8C7" />
          <path d="M100 37 C118 20 130 27 122 45 C115 56 106 49 100 43 Z" fill="#F2A8C7" />
          <circle cx="100" cy="40" r="6" fill="#D76D9D" />
        </>
      )}
      {appearance.accessory === 'headband' && <path d="M45 76 Q100 30 155 76" fill="none" stroke="#F2A8C7" strokeWidth="7" strokeLinecap="round" />}
    </svg>
  )
}

export default CharacterAvatar
