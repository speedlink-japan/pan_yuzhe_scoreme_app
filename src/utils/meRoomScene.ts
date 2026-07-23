export const ME_ROOM_SCENE = {
  width: 1586,
  height: 992,
  background: '/assets/me-room/watercolor-room.png',
} as const

export type SceneAnchor = 'center' | 'bottom-center' | 'top-left'

export interface ScenePlacement {
  x: number
  y: number
  width: number
  height: number
  anchor: SceneAnchor
  zIndex: number
  rotation?: number
}

export interface SceneHitbox {
  x: number
  y: number
  width: number
  height: number
}

export interface RoomItemSceneDefinition {
  placement: ScenePlacement
  hitbox?: SceneHitbox
  usePoint?: {
    x: number
    y: number
    characterScale: number
    facing: 'left' | 'right' | 'front'
  }
}

export const CHARACTER_SCENE_PLACEMENT: ScenePlacement = {
  x: 52,
  y: 95,
  width: 27,
  height: 49,
  anchor: 'bottom-center',
  zIndex: 3,
}

export const ROOM_ITEM_SCENES = {
  laptop: {
    placement: {
      x: 77,
      y: 60,
      width: 20.5,
      height: 26,
      anchor: 'bottom-center',
      zIndex: 2,
      rotation: -1,
    },
    hitbox: {
      x: 66.75,
      y: 34,
      width: 20.5,
      height: 26,
    },
    usePoint: {
      x: 61,
      y: 90,
      characterScale: 0.8,
      facing: 'front',
    },
  },
} satisfies Record<string, RoomItemSceneDefinition>

export const clampScenePercent = (value: number): number =>
  Math.min(100, Math.max(0, value))

export const scenePercentToPixel = (
  x: number,
  y: number
): { x: number; y: number } => ({
  x: Math.round((clampScenePercent(x) / 100) * ME_ROOM_SCENE.width),
  y: Math.round((clampScenePercent(y) / 100) * ME_ROOM_SCENE.height),
})
