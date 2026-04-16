import { useEffect, useRef, useState } from 'react'

interface DragResizeState {
  x: number
  y: number
  width: number
  height: number
}

interface DragResizeResult {
  position: DragResizeState
  handleMouseDown: (e: React.MouseEvent<HTMLDivElement>, type: 'drag' | 'resize') => void
  isDragging: boolean
  isResizing: boolean
}

export const useDragResize = (
  initialState: DragResizeState,
  isLocked: boolean,
  onPositionChange?: (state: DragResizeState) => void
): DragResizeResult => {
  const [position, setPosition] = useState<DragResizeState>(initialState)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0, panelX: 0, panelY: 0 })
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 })

  // マウスダウン時の処理
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, type: 'drag' | 'resize') => {
    if (isLocked) return

    if (type === 'drag') {
      setIsDragging(true)
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panelX: position.x,
        panelY: position.y,
      }
    } else if (type === 'resize') {
      setIsResizing(true)
      resizeStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        width: position.width,
        height: position.height,
      }
    }
  }

  // マウスムーブ
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStartRef.current.x
        const deltaY = e.clientY - dragStartRef.current.y
        const newState = {
          ...position,
          x: Math.max(0, dragStartRef.current.panelX + deltaX),
          y: Math.max(0, dragStartRef.current.panelY + deltaY),
        }
        setPosition(newState)
        onPositionChange?.(newState)
      }

      if (isResizing) {
        const deltaX = e.clientX - resizeStartRef.current.x
        const deltaY = e.clientY - resizeStartRef.current.y
        const newState = {
          ...position,
          width: Math.max(200, resizeStartRef.current.width + deltaX),
          height: Math.max(150, resizeStartRef.current.height + deltaY),
        }
        setPosition(newState)
        onPositionChange?.(newState)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
    }

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, position, onPositionChange])

  return {
    position,
    handleMouseDown,
    isDragging,
    isResizing,
  }
}
