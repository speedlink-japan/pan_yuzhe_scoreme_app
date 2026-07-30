'use client'

import React from 'react'
import Image from 'next/image'
import type { CharacterAppearance } from '@/utils/characterAppearance'
import styles from './CharacterPanel.module.css'

interface CharacterAvatarProps {
  appearance: CharacterAppearance
  className?: string
}

const assetRoot = '/assets/character/front'

const layerStyle: React.CSSProperties = {
  inset: 0,
  height: '100%',
  objectFit: 'contain',
  pointerEvents: 'none',
  position: 'absolute',
  width: '100%',
}

const CharacterAvatar: React.FC<CharacterAvatarProps> = ({ appearance, className }) => {
  const skin = appearance.skinColor === '#E7B092' ? 'tan' : 'light'
  const eyes = appearance.eyes === 'gentle' || appearance.eyes === 'sleepy' ? 'gentle' : 'sparkle'
  const mouth = appearance.mouth === 'small' || appearance.mouth === 'neutral' ? 'small' : 'smile'
  const hair = appearance.hair === 'bob' ? 'bob' : 'twin-loop'
  const outfit = appearance.outfit === 'male' || appearance.outfit === 'formal' ? 'male' : 'female'
  const accessory = appearance.accessory === 'bow' ? 'bow' : null

  const layers = [
    `${assetRoot}/body/${skin}.png`,
    `${assetRoot}/outfit/${outfit}.png`,
    `${assetRoot}/hair/${hair}.png`,
    `${assetRoot}/eyes/${eyes}.png`,
    `${assetRoot}/mouth/${mouth}.png`,
    accessory ? `${assetRoot}/accessory/${accessory}.png` : null,
  ].filter((src): src is string => Boolean(src))

  return (
    <div
      className={`${styles.rasterAvatar} ${className ?? ''}`}
      role="img"
      aria-label="正面向きの水彩風キャラクター"
    >
      {layers.map(src => (
        <Image key={src} src={src} alt="" aria-hidden="true" fill sizes="100%" unoptimized style={layerStyle} />
      ))}
    </div>
  )
}

export default CharacterAvatar
