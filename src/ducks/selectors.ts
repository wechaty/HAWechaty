import {
  getHA,
}                   from '../ha-wechaty'

import { State } from './reducers'

const isWechatyAvailable = (state: State, wechatyId: string): boolean => !!(state.availability[wechatyId])

const isHAAvailable = (state: State, haId?: string): boolean => {
  if (!haId) {
    return Object.values(state.availability)
      .filter(Boolean)
      .length > 0
  }

  const isWithHa    = (wechatyId: string) => state.cluster[wechatyId] === haId
  const isAvailable = (wechatyId: string) => !!(state.availability[wechatyId])

  return Object.keys(state.cluster)
    .filter(isWithHa)
    .filter(isAvailable)
    .length > 0
}

const getHAOfWechatyId = (state: State, wechatyId: string) => {
  const haId = state.cluster[wechatyId]
  if (!haId) {
    throw new Error('no haId')
  }
  return getHA(haId)
}

export {
  getHAOfWechatyId,
  isHAAvailable,
  isWechatyAvailable,
}