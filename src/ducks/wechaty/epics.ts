import {
  isActionOf,
  RootState,
  RootAction,
  RootService,
}                 from 'typesafe-actions'

import {
  Epic,
}                     from 'redux-observable'

import {
  of,
  from,
}                 from 'rxjs'
import {
  catchError,
  filter,
  ignoreElements,
  mapTo,
  mergeMap,
  tap,
}                   from 'rxjs/operators'

// import {
//   Contact,
//   Message,
//   Wechaty,
// }             from 'wechaty'

import * as actions from './actions'

type DucksEpic = Epic<
  RootAction,
  RootAction,
  RootState,
  RootService
>

export const dingEpic$: DucksEpic = actions$ => actions$.pipe(
  filter(isActionOf(actions.dingAsync.request)),
  tap(action => action.payload.wechaty.ding(action.payload.data)),
  ignoreElements(),
)

export const resetEpic$: DucksEpic = actions$ => actions$.pipe(
  filter(isActionOf(actions.resetAsync.request)),
  mergeMap(action => from(action.payload.wechaty.reset(action.payload.data)).pipe(
    mapTo(actions.resetAsync.success()),
    catchError(e => of(actions.resetAsync.failure(e))),
  ))
)

export const sayEpic$: DucksEpic = actions$ => actions$.pipe(
  filter(isActionOf(actions.sayAsync.request)),
  mergeMap(action => from(action.payload.sayable.say(action.payload.text)).pipe(
    mapTo(actions.sayAsync.success()),
    catchError(e => of(actions.sayAsync.failure(e))),
  ))
)
