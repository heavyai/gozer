/*
  vinzclortho is the key master https://ghostbusters.fandom.com/wiki/Vinz_Clortho

  Honestly, Vinz may be even more powerful than Zuul. Never ~ever~ leave Vinz enabled
  in a production environment.

  Vinz here is middleware that monitors your redux store and notifies you if:

  * you've mutated an object. VERY VERY BAD.
  * you've re-packaged a value so it's logically equivalent, but a new reference.
    Not terrible, but sloppy.

  Vinz is configured with an options hash when you apply middleware, or you can use the
  defaults.

  applyMiddleware([
    vinzclortho(options)
  ])

  options may be:

  * logMutations : true/false - spits out to console if you mutate. defaults true.
  * debugMutations : true/false - breaks to the debugger when it catches a mutation. defaults false.
  * logRepackaging : true/false - spits out to console if you repackage. defaults false.
  * debugRepackaging : true/false - breaks to debugger when it catches a repackage. defaults false.

*/

import { deepDiffDebug, diffsByTypes } from "../utils/deepDiffDebug"
import {
  deepPathWalk,
  collapseDeepWalk,
  filterDuplicates
} from "../utils/deepWalkDebug"

const defaultOptions = {
  logMutations: true,
  logRepackaging: false,
  debugMutations: false,
  debugRepackaging: false
}

export default givenOptions => {
  const options = {
    ...defaultOptions,
    ...givenOptions
  }

  // tslint-disable
  // eslint-disable-next-line
  console.info(
    "VINZ CLORTHO HAS BEEN SUMMONED. YOU HAD ~BETTER~ BE IN A DEV ENVIRONMENT!"
  )
  // tslint-enable

  return store => next => action => {
    // okay, here's where the magic happens. First things first - we do a deep walk of the
    // current state and collapse it into a single object. This gives us a record of every
    // value at every keypath - AND it maintains the original object references.
    const oldState = collapseDeepWalk(
      filterDuplicates(deepPathWalk(store.getState()))
    ) /* tslint:disable-next-line */

    // next, we just dispatch our current action.
    /* eslint-disable-next-line */
    const result = next(action)

    // Now we do a deep walk of the new state after the action was fired. Same deal - we
    // get a listing of every object at every keypath, with the original object references.
    const newState = collapseDeepWalk(
      filterDuplicates(deepPathWalk(store.getState()))
    )

    // now, we have two objects so we can just do a standard deepDiffDebug on them to find
    // the differences.
    //
    // We care about paths that differ by "ref", meaning that they are object containers, but
    // are logically equal (though not referentially equal) That indicates a re-packaging error
    //
    // We also care about paths that differ by "val", meaning that they're a scalar value that
    // has changed. In that case, we want to look through all of their parents and see if any of
    // those objects appear in both states - because if they do that indicates a mutation.
    const deepDiffs = diffsByTypes(deepDiffDebug(oldState, newState), [
      "val",
      "ref"
    ])

    const seen = new Set()

    // now we're going to iterate over the diffs.
    deepDiffs.forEach(row => {
      // because of the deepPathWalk output, we may have duplicate keys - ["foo/bar"] and ["foo", "bar"] are
      // identical paths. So we join all subpaths and check for duplication. If nothing, we continue on and
      // re-split to get all sub-paths.
      const keyStr = row.key.join("/")

      if (seen.has(keyStr)) {
        return
      }
      seen.add(keyStr)
      const key = keyStr.split("/")

      // if it's a value change and we're logging mutations, we need to look at all parent containers and see if
      // any of them have referential equality, but not value.
      if (options.logMutations && row.type === "val") {
        const subKeyRing = []
        key.forEach(piece => {
          subKeyRing.push(piece)
          const subKey = subKeyRing.join("/")
          if (seen.has(subKey)) {
            return
          }

          // if we're in here, we know a value has changed. So if the parent containers match in both states, we know that it
          // must have been a mutation.
          if (
            oldState[subKey] !== undefined &&
            newState[subKey] !== undefined
          ) {
            if (oldState[subKey] === newState[subKey]) {
              seen.add(subKey)
              // tslint-disable
              // eslint-disable-next-line
              console.error(
                "VINZ CLORTHO SAYS YOUR REDUX STORE WILL PERISH IN FLAMES. MUTATION @ ",
                subKey || "/",
                action,
                row
              )
              // ts-lint-enable
              if (options.debugMutations) {
                /* eslint-disable-next-line no-debugger */ /* tslint:disable-next-line:no-debugger */
                debugger
              }
            }
          }
        })
      }

      // if we're logging repackaging, then look to see if this is a "ref" change. That means the two objects are identical, but
      // different refs.
      if (options.logRepackaging) {
        if (
          oldState[keyStr] !== undefined &&
          newState[keyStr] !== undefined &&
          row.type === "ref"
        ) {
          // tslint-disable
          // eslint-disable-next-line
          console.warn(
            "VINZ CLORTHO SAYS YOUR REDUX STORE IS NOT IN ONE OF THE PRE-CHOSEN FORMS. UNNECESSARY RE-PACKAGING @ ",
            keyStr,
            action
          )
          // tslint-enable
        }
        if (options.debugRepackaging) {
          /* eslint-disable-next-line no-debugger */ /* tslint:disable-next-line:no-debugger */
          debugger
        }
      }
    })

    return result
  }
}
