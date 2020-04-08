import {
  Wechaty,
  WechatyOptions,
  Room,
  MemoryCard,
}                   from 'wechaty'

import { WechatyEventName } from 'wechaty/dist/src/wechaty'

import { StateSwitch } from 'state-switch'
import flattenArray from 'flatten-array'

import {
  Subscription,
}                   from 'rxjs'
import {
  VERSION,
  log,
}             from './config'

import {
  heartbeat$,
  availableState,
}                   from './heartbeat$'

export interface HAWechatyOptions {
  name?               : string,
  memory?             : MemoryCard,
  wechatyOptionsList? : WechatyOptions[],
}

export class HAWechaty {

  public state: StateSwitch

  public wechatyList: Wechaty[]

  private heartbeatSub?: Subscription

  public Room = {
    findAll : this.roomFindAll.bind(this),
    load    : this.roomLoad.bind(this),
  }

  public async roomFindAll (): Promise<Room[]> {
    log.verbose('HAWechaty', 'roomFindAll()')
    const roomListList = Promise.all(
      this.wechatyList
        .filter(wechaty => wechaty.logonoff())
        .filter(wechaty => availableState[wechaty.id])
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
      .filter(wechaty => availableState[wechaty.id])
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
    log.verbose('HAWechaty', 'constructor("%s")', JSON.stringify(options))
    this.wechatyList = []
    this.state = new StateSwitch('HAWechaty')

    // TODO: init via the options
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

      const haWechatyPuppet = process.env.HA_WECHATY_PUPPET || ''

      const wechatyPuppetList = haWechatyPuppet
        .split(':')
        .filter(v => !!v)
        .map(v => v.toUpperCase())
        .map(v => v.replace(/-/g, '_'))

      if (wechatyPuppetList.includes('WECHATY_PUPPET_HOSTIE')
          && process.env.HA_WECHATY_PUPPET_HOSTIE_TOKEN
      ) {
        this.wechatyList.push(
          new Wechaty({
            ...this.options,
            puppet: 'wechaty-puppet-hostie',
            puppetOptions: {
              token: process.env.HA_WECHATY_PUPPET_HOSTIE_TOKEN,
            },
          }),
        )
      }

      if (wechatyPuppetList.includes('WECHATY_PUPPET_PADPLUS')
          && process.env.HA_WECHATY_PUPPET_PADPLUS_TOKEN
      ) {
        // https://github.com/wechaty/wechaty-puppet-padplus#how-to-emit-the-message-that-you-sent
        process.env.PADPLUS_REPLAY_MESSAGE = 'true'

        this.wechatyList.push(
          new Wechaty({
            ...this.options,
            puppet: 'wechaty-puppet-padplus',
            puppetOptions: {
              token: process.env.HA_WECHATY_PUPPET_PADPLUS_TOKEN,
            },
          }),
        )
      }

      if (wechatyPuppetList.includes('WECHATY_PUPPET_MOCK')
          && process.env.HA_WECHATY_PUPPET_MOCK_TOKEN
      ) {
        this.wechatyList.push(
          new Wechaty({
            ...this.options,
            puppet: 'wechaty-puppet-mock',
            puppetOptions: {
              token: process.env.HA_WECHATY_PUPPET_MOCK_TOKEN,
            },
          }),
        )
      }

      if (this.wechatyList.length <= 0) {
        throw new Error('no wechaty puppet found')
      }

      log.info('HAWechaty', 'start() %s puppet inited', this.wechatyList.length)

      this.heartbeatSub = heartbeat$(this.wechatyList).subscribe(
        x => {
          log.verbose('HAWechaty', 'start() heartbeat$(%s) next: %s', x)
          log.verbose('HAWechaty', 'start() heartbeat$() availableState: "%s"', JSON.stringify(availableState))
        },
        e => log.error('HAWechaty', 'start() heartbeat$(%s) error: %s', e),
        () => log.verbose('HAWechaty', 'start() heartbeat$(%s) complete'),
      )

      await Promise.all(
        this.wechatyList.map(
          wechaty => wechaty.start()
        )
      )

      this.state.on(true)

    } catch (e) {
      log.warn('HAWechaty', 'start() rejection: %s', e)
      this.state.off(true)
    }

  }

  public async stop () {
    log.verbose('HAWechaty', 'stop()')

    try {
      this.state.off('pending')

      if (this.heartbeatSub) {
        this.heartbeatSub.unsubscribe()
        this.heartbeatSub = undefined
      }

      await Promise.all(
        this.wechatyList.map(
          wechaty => wechaty.stop()
        )
      )

    } catch (e) {
      log.warn('HAWechaty', 'stop() rejection: %s', e)
      throw e
    } finally {
      this.state.off(true)
    }
  }

  public logonoff (): boolean {
    log.verbose('HAWechaty', 'logonoff()')
    return this.wechatyList
      .filter(wechaty => availableState[wechaty.id])
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
      .filter(wechaty => availableState[wechaty.id])
      .forEach(wechaty => wechaty.say(text))
  }

}
