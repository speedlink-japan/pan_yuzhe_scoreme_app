'use client'

import React, { ReactNode, useState, useEffect } from 'react'
import styles from './DraggablePanelWrapper.module.css'
import { useDragResize } from '@/hooks/useDragResize'

interface DragResizeState {
  x: number
  y: number
  width: number
  height: number
}

interface DraggablePanelWrapperProps {
  children: ReactNode
  initialState: DragResizeState
  isLocked: boolean
  zIndex: number
  onPositionChange?: (state: DragResizeState) => void
  onBringToFront?: () => void
  layoutMode?: 'normal' | 'fullscreen'
}

const DraggablePanelWrapper: React.FC<DraggablePanelWrapperProps> = ({
  children,
  initialState,
  isLocked,
  zIndex,
  onPositionChange,
  onBringToFront,
  layoutMode = 'normal',
}) => {
  // フルスクリーンモード時は常にロック状態
  const effectivelyLocked = layoutMode === 'fullscreen' ? true : isLocked
  const { position, handleMouseDown, isDragging, isResizing } = useDragResize(
    initialState,
    effectivelyLocked,
    onPositionChange
  )
  const [isVisible, setIsVisible] = useState(false)

  // マウント時にアニメーションを実行
  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div
      className={`${styles.wrapper} ${isDragging ? styles.dragging : ''} ${
        isResizing ? styles.resizing : ''
      } ${effectivelyLocked ? styles.locked : ''} ${isVisible ? styles.fadeIn : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${position.width}px`,
        height: `${position.height}px`,
        zIndex: zIndex,
      }}
      onClick={onBringToFront}
    >
      <div
        className={`${styles.dragHandle} ${layoutMode === 'fullscreen' ? styles.fullscreen : ''}`}
        onMouseDown={(e) => handleMouseDown(e, 'drag')}
        style={{ cursor: effectivelyLocked ? 'default' : 'grab' }}
      />

      <div className={styles.content}>{children}</div>

      {!effectivelyLocked && (
        <div
          className={styles.resizeHandle}
          onMouseDown={(e) => handleMouseDown(e, 'resize')}
          style={{ cursor: 'nwse-resize' }}
        >
          ⤡
        </div>
      )}
    </div>
  )
}

export default DraggablePanelWrapper
