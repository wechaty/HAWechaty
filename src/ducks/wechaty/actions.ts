import {
  createAction,
  createAsyncAction,
}                       from 'typesafe-actions'

import {
  Wechaty,
  Message,
}             from 'wechaty'

// import {
//   EventResetPayload,
// }                       from 'wechaty-puppet'

import { Sayable } from 'wechaty/dist/src/types'

import types from './types'

const prepareTurnOnSwitch  = (wechaty: Wechaty, status: true | 'pending') => ({ status, wechaty })
const prepareTurnOffSwitch = (wechaty: Wechaty, status: true | 'pending') => ({ status, wechaty })

const prepareScanEvent     = (wechaty: Wechaty, qrcode: string)   => ({ qrcode, wechaty })
const prepareLoginEvent    = (wechaty: Wechaty, userName: string) => ({ userName, wechaty })
const prepareLogoutEvent   = (wechaty: Wechaty) => ({ wechaty })
const prepareMessageEvent  = (message: Message) => ({ message })
const prepareData     = (wechaty: Wechaty, data: string) => ({ data, wechaty })

const turnOnSwitch  = createAction(types.SWITCH_ON,  prepareTurnOnSwitch)()
const turnOffSwitch = createAction(types.SWITCH_OFF, prepareTurnOffSwitch)()

const scanEvent      = createAction(types.EVENT_SCAN,       prepareScanEvent)()
const loginEvent     = createAction(types.EVENT_LOGIN,      prepareLoginEvent)()
const logoutEvent    = createAction(types.EVENT_LOGOUT,     prepareLogoutEvent)()
const messageEvent   = createAction(types.EVENT_MESSAGE,    prepareMessageEvent)()
const dongEvent      = createAction(types.EVENT_DONG,       prepareData)()
const heartbeatEvent = createAction(types.EVENT_HEARTBEAT,  prepareData)()

const ding  = createAction(types.DING,  prepareData)()
const reset = createAction(types.RESET, prepareData)()

/**
 * Async
 */
const sayAsync = createAsyncAction(
  types.SAY_REQUEST,
  types.SAY_SUCCESS,
  types.SAY_FAILURE,
)<{ sayable: Sayable, text: string }, void, Error>()

export default {
  ...{
    turnOffSwitch,
    turnOnSwitch,
  },

  ...{
    dongEvent,
    heartbeatEvent,
    loginEvent,
    logoutEvent,
    messageEvent,
    scanEvent,
  },

  ding,
  reset,

  sayAsync,
}
