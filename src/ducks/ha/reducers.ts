import { createReducer } from 'typesafe-actions'

import * as actions from './actions'
import * as types   from './types'

const initialState: types.State = {
  availability : {},   // map wechaty id to availability (true or false)
  cluster      : {},   // map wechaty id to ha id

  ha           : {},   // map ha id to instance
  wechaty      : {},   // map wechaty id to instance
}

const haReducer = createReducer(initialState)
  .handleAction(actions.failWechaty, (state, action) => ({
    ...state,
    availability: {
      ...state.availability,
      [action.payload.wechaty.id]: false,
    },
  }))
  .handleAction(actions.recoverWechaty, (state, action) => ({
    ...state,
    availability: {
      ...state.availability,
      [action.payload.wechaty.id]: true,
    },
  }))
  .handleAction(actions.addWechaty, (state, action) => ({
    ...state,
    cluster: {
      ...state.cluster,
      [action.payload.wechaty.id]: action.payload.ha.id,
    },
    ha: {
      ...state.ha,
      [action.payload.ha.id]: action.payload.ha,
    },
    wechaty: {
      ...state.wechaty,
      [action.payload.wechaty.id]: action.payload.wechaty,
    },
  }))
  .handleAction(actions.delWechaty, (state, action) => ({
    ...state,
    availability: {
      ...state.availability,
      [action.payload.wechaty.id]: undefined,
    },
    cluster: {
      ...state.cluster,
      [action.payload.wechaty.id]: undefined,
    },
    // ha: {
    //   ...state.ha,
    //   [action.payload.ha.id]: undefined,
    // },
    wechaty: {
      ...state.wechaty,
      [action.payload.wechaty.id]: undefined,
    },
  }))
export default haReducer