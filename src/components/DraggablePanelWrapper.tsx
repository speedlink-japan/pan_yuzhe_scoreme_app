'use client'

import React, { ReactNode } from 'react'
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
  onPositionChange?: (state: DragResizeState) => void
}

const DraggablePanelWrapper: React.FC<DraggablePanelWrapperProps> = ({
  children,
  initialState,
  isLocked,
  onPositionChange,
}) => {
  const { position, handleMouseDown, isDragging, isResizing } = useDragResize(
    initialState,
    isLocked,
    onPositionChange
  )

  return (
    <div
      className={`${styles.wrapper} ${isDragging ? styles.dragging : ''} ${
        isResizing ? styles.resizing : ''
      } ${isLocked ? styles.locked : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${position.width}px`,
        height: `${position.height}px`,
      }}
    >
      <div
        className={styles.dragHandle}
        onMouseDown={(e) => handleMouseDown(e, 'drag')}
        style={{ cursor: isLocked ? 'default' : 'grab' }}
      />

      <div className={styles.content}>{children}</div>

      {!isLocked && (
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
