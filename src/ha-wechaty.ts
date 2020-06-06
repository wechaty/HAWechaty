import { EventEmitter }     from 'events'
import {
  MemoryCard,
  Room,
  Wechaty,
  WechatyPlugin,
  Contact,
}                           from 'wechaty'
import { WechatyEventName } from 'wechaty/dist/src/wechaty'
import { StateSwitch }      from 'state-switch'
import cuid                 from 'cuid'
import {
  Bundle,
  Ducks,
}                           from 'ducks'

import { WechatyRedux } from 'wechaty-redux'

import {
  VERSION,
  log,
}                     from './config'
import * as haDuck    from './duck/'
import * as instances from './manager'

export interface HAWechatyOptions {
  name?   : string,
  memory? : MemoryCard,
  ducks   : Ducks<any>,
}

export class HAWechaty extends EventEmitter {

  public id: string
  public state: StateSwitch

  public bundle: Bundle<typeof haDuck>

  protected wechatyList: Wechaty[]

  public Contact = {
    load : this.contactLoad.bind(this),
  }

  protected async contactLoad (id: string): Promise<null | Contact> {
    log.verbose('HAWechaty', 'contactLoad(%s)', id)
    const contactList = this.wechatyList
      .filter(wechaty => wechaty.logonoff())
      .filter(this.bundle.selectors.isWechatyAvailable)
      .map(wechaty => wechaty.Contact.load(id))

    log.verbose('HAWechaty', 'contactLoad() found %s contact(s)', contactList.length)

    let okList = [] as Contact[]
    for (const contact of contactList) {
      try {
        await contact.ready()
        okList.push(contact)
      } catch (e) {
        log.verbose('HAWechaty', 'contactLoad() %s has no contact id %s', contact.wechaty, contact.id)
      }
    }

    if (okList.length > 0) {
      const index = Math.floor(Math.random() * okList.length)
      return okList[index]
    }

    return null
  }

  public Room = {
    findAll : this.roomFindAll.bind(this),
    load    : this.roomLoad.bind(this),
  }

  public async roomFindAll (): Promise<Room[]> {
    log.verbose('HAWechaty', 'roomFindAll()')
    const roomListList = await Promise.all(
      this.wechatyList
        .filter(wechaty => wechaty.logonoff())
        .filter(
          this.bundle.selectors.isWechatyAvailable
          // haApi.selectors.isWechatyAvailable(this.duckState())
        )
        .map(
          wechaty => wechaty.Room.findAll()
        )
    )

    const roomList = [] as Room[]

    /**
     * allRoomList may contain one room for multiple times
     * because we have more than one bot in the same room
     */
    const allRoomList = roomListList.flat()
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
      .filter(
        this.bundle.selectors.isWechatyAvailable
        // haApi.selectors.isWechatyAvailable(this.duckState())
      )
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
    public options: HAWechatyOptions,
  ) {
    super()
    log.verbose('HAWechaty', 'constructor("%s")', JSON.stringify(options))
    this.id = cuid()
    this.wechatyList = []
    this.state = new StateSwitch('HAWechaty')

    this.bundle = options.ducks.ducksify(haDuck)

    instances.setHa(this)
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

  public add (...wechatyList: Wechaty[]): this {
    log.verbose('HAWechaty', 'add(%s)',
      wechatyList
        .map(wechaty => wechaty.name())
        .join(', ')
    )

    this.wechatyList.push(
      ...wechatyList
    )

    const store = this.bundle.store

    wechatyList.forEach(async wechaty => {
      log.verbose('HAWechaty', 'add() installing  WechatyRedux to %s ...', wechaty)
      wechaty.use(WechatyRedux({ store }))
      // this.emit('wechaty', wechaty)
      if (this.state.on() && wechaty.state.off()) {
        log.silly('HAWechaty', 'add() %s is starting', wechaty)
        await wechaty.start()
      } else {
        log.verbose('HAWechaty', 'add() skip starting for %s', wechaty)
      }
    })

    return this
  }

  public remove (...wechatyList: Wechaty[]): this {
    log.verbose('HAWechaty', 'remove(%s)',
      wechatyList
        .map(wechaty => wechaty.name())
        .join(', ')
    )
    throw new Error('to be implemented')
  }

  public nodes (): Wechaty[] {
    return this.wechatyList
  }

  public async start () {
    log.verbose('HAWechaty', 'start()')

    try {
      this.state.on('pending')

      if (this.wechatyList.length <= 0) {
        throw new Error('no wechaty puppet found')
      }

      log.verbose('HAWechaty', 'start() %s wechaty initialized', this.wechatyList.length)

      for (const wechaty of this.wechatyList) {
        log.silly('HAWechaty', 'start() %s starting', wechaty)
        if (wechaty.state.off()) {
          await wechaty.start()
        } else {
          log.verbose('HAWechaty', 'start() %s skip starting: its already started.', wechaty)
        }
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
      .filter(
        this.bundle.selectors.isWechatyAvailable
        // haApi.selectors.isWechatyAvailable(this.duckState())
      )
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
      .filter(
        this.bundle.selectors.isWechatyAvailable
        // haApi.selectors.isWechatyAvailable(this.duckState())
      )
      .forEach(wechaty => wechaty.say(text))
  }

}
