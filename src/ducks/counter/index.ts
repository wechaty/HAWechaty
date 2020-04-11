import reducer from './reducers'

// export { default as counterSelectors } from './selectors'
// export { default as counterOperations } from './operations'

import * as counterActions    from './actions'
import * as counterTypes      from './types'
import * as counterSelectors  from './selectors'

export {
  counterActions,
  // counterEpics,
  counterSelectors,
  counterTypes,
}

export default reducer
