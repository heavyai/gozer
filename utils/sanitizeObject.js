/*

  This works in conjunction with deepDiffDebug to sanitize an object so it matches a source as closely as possible.

  Let's say you have two objects:

  objA = { a : 1, { b : 2 } }
  objB = { a : 1, { b : 2 } }

  These objects have value equality, but not referential equality. If you sanitize them:

  const sanitized = sanitize(objA, objB);

  You'll end up with:

  sanitized = {a : 1, {b : 2}}

  But sanitized will also === objB.

  Let's say it's these two objects:
  objA = { a : 1, { b : 2 } }
  objB = { a : 2, { b : 2 } }

  const sanitized = sanitize(objA, objB);

  You'll end up with:

  sanitized = {a : 1, {b : 2}}

  and sanitized.b === objB.b.

  Basically, it'll move args right to left if they're referentially identical.
  If any subpath in objA is referentially equal to the same path in objB, it'll take objB's instead.

  You can also give sanitize an optional 3rd argument - an options hash.

   troubleMakers : an array of paths to check. If this is handed in, you can use it to reduce the comparisons by not
   doing a full deepDiffDebug on the props and instead only target the things you know to be problematic. Should be
   an array of path strings (not arrays)

   outputSanitizedProps : boolean which'll determine if we console.log() out the props getting sanitized.

   formatSanitizedProp : you probably don't need to override this, but it's a function call to provide prettier info on the
   prop being sanitized.

*/

import deepEquals from "fast-deep-equal"
import {
  deepDiffDebug,
  diffsByTypes,
  filterRedundantRows
} from "./deepDiffDebug"

const getValueAtPath = (obj, path) => {
  let subObj = obj
  for (const segment of path) {
    if (segment in subObj) {
      subObj = subObj[segment]
    } else {
      return undefined
    }
  }

  return subObj
}

const setValueAtPath = (obj, path, val) => {
  if (!path.length) {
    return val
  }

  const reducedPath = [...path]
  const masterKey = reducedPath.pop()

  const parent = getValueAtPath(obj, reducedPath)
  parent[masterKey] = val

  return obj
}

const shouldSanitize = (objA, objB, needsDeepCheck) => {
  // if the objects are referentially equal, we don't need to santize
  if (objA === objB) {
    return false
  } else if (needsDeepCheck) {
    // otherwise, they're not equal. If we have not performed a deep equality check,
    // then do so now
    return deepEquals(objA, objB)
  } else {
    // otherwise, they're not equal AND we have performed a deep equality check.
    // we know it needs to be sanitized.
    return true
  }
}

const defaultOptions = {
  troubleMakers: [],
  outputSanitizedProps: true,
  formatSanitizedProp: (props, path) => path.join("/")
}

export const sanitize = (props, currentProps, givenOptions) => {
  const options = { ...defaultOptions, ...givenOptions }
  let sanitizedProps = { ...props }

  const [pathsToCheck, needsDeepCheck] = options.troubleMakers.length
    ? [options.troubleMakers.map(path => path.split("/")), true]
    : [
        filterRedundantRows(
          diffsByTypes(deepDiffDebug(props, currentProps), ["ref"]).map(
            row => row.key
          )
        ),
        false
      ]

  if (Object.keys(currentProps).length) {
    pathsToCheck.forEach(path => {
      const newProp = getValueAtPath(sanitizedProps, path)
      const oldProp = getValueAtPath(currentProps, path)
      if (shouldSanitize(newProp, oldProp, needsDeepCheck)) {
        if (options.outputSanitizedProps) {
          // eslint-disable-next-line
          console.log("sanitizes ", options.formatSanitizedProp(props, path))
        }
        sanitizedProps = setValueAtPath(sanitizedProps, path, oldProp)
      }
    })
  }

  return sanitizedProps
}
