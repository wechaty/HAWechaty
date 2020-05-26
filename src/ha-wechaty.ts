import { EventEmitter } from 'events'

import {
  Wechaty,
  WechatyOptions,
  WechatyPlugin,
  Room,
  MemoryCard,
}                   from 'wechaty'

import { WechatyEventName } from 'wechaty/dist/src/wechaty'

import { StateSwitch } from 'state-switch'
import flattenArray from 'flatten-array'

import cuid from 'cuid'

import {
  VERSION,
  log,
}             from './config'

import {
  WechatyRedux,
}                                 from './wechaty-redux/'

import * as api from './api/'
import { State } from './ducks/reducers'

import { envWechaty } from './env-wechaty'
import { Store } from 'redux'
import {
  Duck,
  Ducksifiable,
}                 from 'ducks'

const haWechatyStore = new Map<string, HAWechaty>()

export const getHA = (id: string) => {
  const ha = haWechatyStore.get(id)
  if (!ha) {
    throw new Error('no HA Wechaty instance for id ' + id)
  }
  return ha
}

export interface HAWechatyOptions {
  name?   : string,
  memory? : MemoryCard,
  store?  : Store,
  wechatyOptionsList? : WechatyOptions[],
}

export class HAWechaty extends EventEmitter implements Ducksifiable {

  public store: Store

  public id: string
  public state: StateSwitch

  public wechatyList: Wechaty[]

  private redux: WechatyRedux

  public Room = {
    findAll : this.roomFindAll.bind(this),
    load    : this.roomLoad.bind(this),
  }

  public async roomFindAll (): Promise<Room[]> {
    log.verbose('HAWechaty', 'roomFindAll()')
    const roomListList = Promise.all(
      this.wechatyList
        .filter(wechaty => wechaty.logonoff())
        .filter(haDucks.selectors.isWechatyAvailable(this.duckState()))
        .map(
          wechaty => wechaty.Room.findAll()
        )
    )

    const roomList = [] as Room[]

    /**
     * allRoomList may contain one room for multiple times
     * because we have more than one bot in the same room
     */
    const allRoomList = flattenArray(roomListList) as Room[]
    for (const room of allRoomList) {
      const exist = roomList.some(r => r.id === room.id)
      if (exist) {
        // We have a room in our list, so skip this one
        continue
      }
      roomList.push(room)
    }
    return roomList
  }

  public async roomLoad (id: string): Promise<null | Room> {
    log.verbose('HAWechaty', 'roomLoad(%s)', id)
    const roomList = this.wechatyList
      .filter(wechaty => wechaty.logonoff())
      .filter(haDucks.selectors.isWechatyAvailable(this.duckState()))
      .map(wechaty => wechaty.Room.load(id))

    for (const room of roomList) {
      try {
        await room.ready()
        if (room.isReady()) {
          log.verbose('HAWechaty', 'roomLoad() %s has room id %s', room.wechaty, room.id)
          return room
        }
      } catch (e) {
        log.verbose('HAWechaty', 'roomLoad() %s has no room id %s', room.wechaty, room.id)
      }
    }

    return null
  }

  constructor (
    public options: HAWechatyOptions = {},
  ) {
    super()
    log.verbose('HAWechaty', 'constructor("%s")', JSON.stringify(options))
    this.id = cuid()
    this.wechatyList = []
    this.state = new StateSwitch('HAWechaty')

    this.redux = new WechatyRedux()

    haWechatyStore.set(this.id, this)

    let store
    if (options.store) {
      store = options.store
    } else {
      store = configureStore()
    }
    this.store = store

    // TODO: init via the options
  }

  public ducksify () {
    return new Duck(api)
  }

  public duckState (): State {
    return this.store.getState().ha
  }

  public name (): string {
    return this.wechatyList
      // .filter(wechaty => wechaty.logonoff())
      // .filter(wechaty => availableState[wechaty.id])
      .map(wechaty => wechaty.name())
      .join(',')
  }

  public version () {
    return VERSION
  }

  public async start () {
    log.verbose('HAWechaty', 'start()')

    try {
      this.state.on('pending')

      const wechatyList = envWechaty(this.options)
      this.wechatyList.push(
        ...wechatyList
      )

      if (this.wechatyList.length <= 0) {
        throw new Error('no wechaty puppet found')
      }

      log.verbose('HAWechaty', 'start() %s puppet initialized', this.wechatyList.length)

      for (const wechaty of this.wechatyList) {
        log.silly('HAWechaty', 'start() %s starting', wechaty)

        this.emit('wechaty', wechaty)

        wechaty.use(this.redux.plugin({
          store: this.store,
        }))
        await wechaty.start()

      }

      this.state.on(true)

    } catch (e) {
      log.warn('HAWechaty', 'start() rejection: %s', e)
      console.info(e)
      this.state.off(true)
    }

  }

  public async stop () {
    log.verbose('HAWechaty', 'stop()')

    try {
      this.state.off('pending')

      await Promise.all(
        this.wechatyList.map(
          wechaty => wechaty.stop()
        )
      )

      /**
       * Delete all Wechaty instances
       *  Huan(202005) TODO: make sure they are GC-ed?
       */
      this.wechatyList = []

    } catch (e) {
      log.warn('HAWechaty', 'stop() rejection: %s', e)
      throw e
    } finally {
      this.state.off(true)
    }
  }

  public use (...pluginList: WechatyPlugin[]): void {
    log.verbose('HAWechaty', 'use(%s)',
      pluginList.map(
        plugin => plugin.name
      ).join(','),
    )

    /**
     * for internal plugin usage
     */
    ;(this.on as any)('wechaty', (wechaty: Wechaty) => wechaty.use(...pluginList))

    if (this.wechatyList.length > 0) {
      this.wechatyList.forEach(wechaty => wechaty.use(...pluginList))
    }
  }

  public logonoff (): boolean {
    log.verbose('HAWechaty', 'logonoff()')
    return this.wechatyList
      .filter(haDucks.selectors.isWechatyAvailable(this.duckState()))
      .some(wechaty => wechaty.logonoff())
  }

  public on (
    eventName     : WechatyEventName,
    handlerModule : string | Function,
  ): this {
    this.wechatyList.forEach(wechaty => wechaty.on(eventName as any, handlerModule as any))
    return this
  }

  public async logout (): Promise<void> {
    log.verbose('HAWechaty', 'logout()')

    await Promise.all(
      this.wechatyList.map(
        wechaty => wechaty.logout()
      )
    )
  }

  public async say (text: string): Promise<void> {
    log.verbose('HAWechaty', 'say(%s)', text)
    this.wechatyList
      .filter(wechaty => wechaty.logonoff())
      .filter(haDucks.selectors.isWechatyAvailable(this.duckState()))
      .forEach(wechaty => wechaty.say(text))
  }

}
