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
  const watercolorId = React.useId().replace(/:/g, '')
  const faceWidth = appearance.face === 'round' ? 66 : appearance.face === 'oval' ? 57 : 62
  const faceHeight = appearance.face === 'round' ? 74 : appearance.face === 'oval' ? 84 : 79
  const outfitColor = appearance.outfitColor || outfitColors[appearance.outfit]
  const isMaleOutfit = appearance.outfit === 'male' || appearance.outfit === 'formal'
  const isTwinLoop = appearance.hair === 'twinLoop'
  const eyeWidth = appearance.eyes === 'round' ? 13 : 11
  const eyeHeight = appearance.eyes === 'round' ? 16 : 14

  return (
    <svg
      className={className}
      viewBox="0 0 200 240"
      role="img"
      aria-label="正面向きのキャラクター"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id={`watercolor-${watercolorId}`} x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="paperNoise" />
          <feDisplacementMap in="SourceGraphic" in2="paperNoise" scale="1.2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>

      <g
        filter={`url(#watercolor-${watercolorId})`}
        stroke="#5B403B"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M72 205 C70 220 70 231 68 239 H88 C91 226 91 215 91 204 Z" fill={appearance.skinColor} strokeWidth="2.1" />
        <path d="M109 204 C109 216 109 226 112 239 H132 C130 228 130 217 128 205 Z" fill={appearance.skinColor} strokeWidth="2.1" />

        {isMaleOutfit ? (
          <>
            <path d="M42 239 C44 198 58 176 78 174 H122 C142 176 156 198 158 239 Z" fill={outfitColor} strokeWidth="2.4" />
            <path d="M82 178 H118 V216 H82 Z" fill="#F7F5EF" strokeWidth="1.7" />
            <path d="M100 181 V216 M84 202 H116" fill="none" stroke="#B7C3D7" strokeWidth="1.8" />
            <path d="M48 216 H152" fill="none" stroke="#D89C56" strokeWidth="3.4" opacity="0.78" />
            <path d="M70 229 H91 M109 229 H130" fill="none" stroke="#6C78B8" strokeWidth="3" opacity="0.52" />
          </>
        ) : (
          <>
            <path d="M42 239 C44 194 65 176 100 176 C135 176 156 194 158 239 Z" fill={outfitColor} strokeWidth="2.4" />
            <path d="M62 181 H138" fill="none" stroke="#8CCFC3" strokeWidth="7" opacity="0.8" />
            <path d="M58 221 C82 207 118 207 142 221" fill="none" stroke="#D99A58" strokeWidth="3.3" opacity="0.78" />
            <path d="M63 234 H137" fill="none" stroke="#8CCFC3" strokeWidth="4" opacity="0.72" />
          </>
        )}

        <path d="M79 157 H121 V188 C112 196 88 196 79 188 Z" fill={appearance.skinColor} strokeWidth="2.1" />

        {isTwinLoop && (
          <>
            <circle cx="30" cy="73" r="29" fill={appearance.hairColor} strokeWidth="2.4" />
            <circle cx="170" cy="73" r="29" fill={appearance.hairColor} strokeWidth="2.4" />
            <circle cx="30" cy="73" r="15" fill="#5E9693" stroke="none" opacity="0.52" />
            <circle cx="170" cy="73" r="15" fill="#5E9693" stroke="none" opacity="0.52" />
          </>
        )}

        <path d={hairShapes[appearance.hair]} fill={appearance.hairColor} strokeWidth="2.5" />
        <ellipse cx="100" cy="107" rx={faceWidth} ry={faceHeight} fill={appearance.skinColor} strokeWidth="2.4" />
        <path d="M36 103 C40 58 66 34 100 34 C134 34 160 58 164 103" fill="none" stroke={appearance.hairColor} strokeWidth="12" />

        {appearance.eyes === 'sleepy' ? (
          <>
            <path d="M63 109 Q76 119 89 109" fill="none" stroke={appearance.eyesColor} strokeWidth="4" />
            <path d="M111 109 Q124 119 137 109" fill="none" stroke={appearance.eyesColor} strokeWidth="4" />
          </>
        ) : (
          <>
            <ellipse cx="76" cy="108" rx={eyeWidth} ry={eyeHeight} fill={appearance.eyesColor} strokeWidth="1.4" />
            <ellipse cx="124" cy="108" rx={eyeWidth} ry={eyeHeight} fill={appearance.eyesColor} strokeWidth="1.4" />
            <circle cx="71" cy="102" r="4.2" fill="#FFFDF9" stroke="none" />
            <circle cx="119" cy="102" r="4.2" fill="#FFFDF9" stroke="none" />
            <circle cx="81" cy="116" r="2.5" fill="#FFFDF9" stroke="none" opacity="0.76" />
            <circle cx="129" cy="116" r="2.5" fill="#FFFDF9" stroke="none" opacity="0.76" />
          </>
        )}

        <path d="M65 91 Q76 84 87 91" fill="none" stroke={appearance.eyesColor} strokeWidth="3" />
        <path d="M113 91 Q124 84 135 91" fill="none" stroke={appearance.eyesColor} strokeWidth="3" />
        <circle cx="62" cy="132" r="7" fill="#EFA5A2" stroke="none" opacity="0.45" />
        <circle cx="138" cy="132" r="7" fill="#EFA5A2" stroke="none" opacity="0.45" />
        <path d="M100 116 Q96 126 100 128" fill="none" stroke="#C88F7E" strokeWidth="2" />

        {appearance.mouth === 'smile' && <path d="M90 139 Q100 149 110 139" fill="none" stroke="#B65E70" strokeWidth="3" />}
        {appearance.mouth === 'small' && <path d="M96 142 Q100 145 104 142" fill="none" stroke="#B65E70" strokeWidth="3" />}
        {appearance.mouth === 'neutral' && <path d="M94 142 H106" stroke="#B65E70" strokeWidth="3" />}

        <path d="M42 82 Q64 55 87 63 L82 91 Q60 85 42 100 Z" fill={appearance.hairColor} strokeWidth="2.1" />
        <path d="M158 82 Q136 55 113 63 L118 91 Q140 85 158 100 Z" fill={appearance.hairColor} strokeWidth="2.1" />
        <path d="M72 52 Q88 43 100 51 Q112 43 128 52" fill="none" stroke="#FFFFFF" strokeWidth="3" opacity="0.3" />

        {appearance.accessory === 'glasses' && (
          <>
            <circle cx="76" cy="108" r="18" fill="none" stroke="#5A5968" strokeWidth="3" />
            <circle cx="124" cy="108" r="18" fill="none" stroke="#5A5968" strokeWidth="3" />
            <path d="M94 108 H106" stroke="#5A5968" strokeWidth="3" />
          </>
        )}
        {appearance.accessory === 'bow' && (
          <>
            <path d="M100 37 C82 19 68 27 77 46 C85 57 94 49 100 43 Z" fill="#7EA7A2" strokeWidth="2.1" />
            <path d="M100 37 C118 19 132 27 123 46 C115 57 106 49 100 43 Z" fill="#7EA7A2" strokeWidth="2.1" />
            <circle cx="100" cy="40" r="6" fill="#D99A58" strokeWidth="1.5" />
          </>
        )}
        {appearance.accessory === 'headband' && <path d="M45 76 Q100 30 155 76" fill="none" stroke="#F2A8C7" strokeWidth="7" />}
      </g>
    </svg>
  )
}

export default CharacterAvatar
