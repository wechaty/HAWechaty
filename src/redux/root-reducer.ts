import { combineReducers }  from 'redux'

import counter from '../wechaty-ducks-counter/'
import ha      from '../ducks/'
import wechaty from '../wechaty-redux/ducks'

export default combineReducers({
  counter,
  ha,
  wechaty,
})
