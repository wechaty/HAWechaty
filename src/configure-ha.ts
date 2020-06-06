/**
 *   Wechaty Open Source Software - https://github.com/wechaty
 *
 *   @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
import { Ducks } from 'ducks'

import { Duck as wechatyDuck } from 'wechaty-redux'
import * as haDuck from './duck/'

import { HAWechaty } from '.'
import { envWechaty } from './env-wechaty'

let initialized = false

function configureHa () {
  if (initialized) {
    throw new Error('configureHa() can not be called twice: it has already been called before.')
  }
  initialized = true

  const ducks = new Ducks({
    ha      : haDuck,
    wechaty : wechatyDuck,
  })

  ducks.configureStore()

  const name = 'ha-wechaty'

  const ha = new HAWechaty({
    ducks,
    name,
  })

  const wechatyList = envWechaty({
    name: 'env-wechaty',
  })

  ha.add(
    ...wechatyList
  )

  return ha
}

export {
  configureHa,
}
