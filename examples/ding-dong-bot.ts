import {
  EventErrorPayload,
  EventLoginPayload,
  EventLogoutPayload,
  EventMessagePayload,
  EventScanPayload,
  MessageType,
  ScanStatus,
  FileBox,
}                     from 'ha-wechaty'

import { HAWechaty } from '../src/'

/**
 *
 * 1. Declare your Bot!
 *
 */
const ha = new HAWechaty()

/**
 *
 * 2. Register event handlers for Bot
 *
 */
ha
  .on('logout', onLogout)
  .on('login',  onLogin)
  .on('scan',   onScan)
  .on('error',  onError)
  .on('message', onMessage)

/**
 *
 * 3. Start the bot!
 *
 */
ha.start()
  .catch(async e => {
    console.error('Bot start() fail:', e)
    await ha.stop()
    process.exit(-1)
  })

/**
 *
 * 4. You are all set. ;-]
 *
 */

/**
 *
 * 5. Define Event Handler Functions for:
 *  `scan`, `login`, `logout`, `error`, and `message`
 *
 */
function onScan (payload: EventScanPayload) {
  if (payload.qrcode) {
    // Generate a QR Code online via
    // http://goqr.me/api/doc/create-qr-code/
    const qrcodeImageUrl = [
      'https://api.qrserver.com/v1/create-qr-code/?data=',
      encodeURIComponent(payload.qrcode),
    ].join('')

    console.info(`[${payload.status}] ${qrcodeImageUrl}\nScan QR Code above to log in: `)
  } else {
    console.info(`[${payload.status}] `, ScanStatus[payload.status])
  }
}

async function onLogin (payload: EventLoginPayload) {
  console.info(`${payload.contactId} login`)

  const contactPayload = await ha.contactPayload(payload.contactId)
  console.info(`contact payload: ${JSON.stringify(contactPayload)}`)

  ha.messageSendText(payload.contactId, 'Wechaty login').catch(console.error)
}

function onLogout (payload: EventLogoutPayload) {
  console.info(`${payload.contactId} logouted`)
}

function onError (payload: EventErrorPayload) {
  console.error('Bot error:', payload.data)
  /*
  if (bot.logonoff()) {
      bot.say('Wechaty error: ' + e.message).catch(console.error)
  }
  */
}

/**
 *
 * 6. The most important handler is for:
 *    dealing with Messages.
 *
 */
async function onMessage (payload: EventMessagePayload) {
  console.info(`onMessage(${payload.messageId})`)

  // const DEBUG: boolean = true
  // if (DEBUG) {
  //   return
  // }

  const messagePayload = await ha.messagePayload(payload.messageId)
  console.info('messagePayload:', JSON.stringify(messagePayload))

  if (messagePayload.fromId) {
    const contactPayload = await ha.contactPayload(messagePayload.fromId)
    console.info(`contactPayload(fromId:${messagePayload.fromId}):`, JSON.stringify(contactPayload))
  }

  if (messagePayload.roomId) {
    const roomPayload = await ha.roomPayload(messagePayload.roomId)
    console.info('roomPayload:', JSON.stringify(roomPayload))
  }

  if (messagePayload.toId) {
    const contactPayload = await ha.contactPayload(messagePayload.toId)
    console.info(`contactPayload(toId:${messagePayload.toId}):`, JSON.stringify(contactPayload))
  }

  if (messagePayload.fromId === ha.selfId()) {
    console.info('skip self message')
    return
  }

  if (messagePayload.type === MessageType.Text
      && /^ding$/i.test(messagePayload.text || '')
  ) {
    let conversationId = messagePayload.roomId || messagePayload.fromId

    if (!conversationId) {
      throw new Error('no conversation id')
    }
    await ha.messageSendText(conversationId, 'dong')

    const fileBox = FileBox.fromUrl('https://wechaty.github.io/wechaty/images/bot-qr-code.png')
    await ha.messageSendFile(conversationId, fileBox)
  }
}

/**
 *
 * 7. Output the Welcome Message
 *
 */
const welcome = `
HAWechaty Version: ${ha}@${ha.version()}

Please wait... I'm trying to login in...

`
console.info(welcome)

// async function loop () {
//   while (true) {
//     await new Promise(resolve => setTimeout(resolve, 1000))
//   }
// }

// loop()
