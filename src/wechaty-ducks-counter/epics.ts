import {
  isActionOf,
}                 from 'typesafe-actions'

import {
  filter,
  mergeMap,
  map,
}                   from 'rxjs/operators'

import {
  api as wechatyApi,
}                           from '../wechaty-redux/'

import * as actions from './actions'

import {
  Epic,
}               from 'redux-observable'

const counterEpic: Epic = actions$ => actions$.pipe(
  filter(isActionOf(wechatyApi.actions.messageEvent)),
  mergeMap(wechatyApi.utils.toMessage$),
  map(message => message.self()
    ? actions.moMessage(message.wechaty.id)
    : actions.mtMessage(message.wechaty.id)
  )
)

export {
  counterEpic,
}
