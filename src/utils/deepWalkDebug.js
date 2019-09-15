/*
  This is a companion to deepDiffDebug. That utility is mostly used by Zuul.

  This one is mostly used by vinzclortho.

  deepPathWalk will take a single object as an input and walk through it, producing
  a list of key/value pairs in a similar style to deepDiffDebug.

  const obj = {a : 1, b : 2, c : {d : 3}}

  const res = deepPathWalk(obj);

  res is:
  [
    { key : ["a"], value : 1 },
    { key : ["b"], value : 2 },
    { key : ["c"], value : { d : 3 } },
    { key : ["c", "d"], value : 3 }
  ]

  deepPathWalk accepts an optional second boolean parameter - if true, it'll return
  an object of { deepPath, duplicates }. The deepPath key is the structure defined
  above. "duplicates" is a map which contains the data defined below. It's convoluted,
  so only use if if you know you need it.

  You probably want to run the results through collapseDeepWalk first.

*/

export function deepPathWalk(obj, withDuplicates = false) {

  const duplicates = new Map()

  const deepPath = internalDeepPathWalk(obj, {duplicates})

  /* okay, this is a little convoluted.
     The reason that we have deepPathWalk and internalDeepPathWalk work is to handle the
     case of multiple references to the same object/array. internalDeepPathWalk will find
     the deepPathWalk + a list of duplicated arrays/values. The structure of duplicates is
     defined down below in a comment.

     Here, we iterate over the dupes. It'll be a structure that looks like this:

     duplicates[ { key : 'a', suboutput } ] = [ ['b'] ]

     This tells us that we need to look through the suboutput and add a new entry to the deepPath
     output foreach suboutput row. BUT we want to swap the start of the key from 'a' -> 'b'

     So if suboutput contains { key : ['a', 'x', 0, 7, 'n'] : "foo" }
     then we want to add a row containing : { key : ['b', 'x', 0, 7, 'n'] : "foo" }

     Since we've swapped the original key ('a') for the duplicated reference ('b')
  */

  for (const [{key : originalKey, subOutput}, duplicateKeys] of duplicates.entries()) {
    duplicateKeys.forEach(dupeKey => {
      subOutput.forEach( subRow => deepPath.push({
        key : [...dupeKey, ...subRow.key.slice( originalKey.length )],
        value : subRow.value
      }))
    })
  }


  deepPath.forEach( row => {
    const rowKey = row.key.join("/")
  })

  return withDuplicates
    ? { deepPath, duplicates }
    : deepPath
}

export function internalDeepPathWalk(obj, {key = [], seen = new Map(), duplicates}) {

  const output = []

  const refRow = {
    key,
    value: obj
  }

  output.push(refRow)

  /* okay, this gets a little convoluted
     When we encounter an array or an object, we add an entry to our seen map.
     That maps from the actual array/object ref to a structure with the original key
     AND the deep walk results for that object.

     Later, if we see that object again, it'll exist in our seen map. If that's the case,
     then we want to add on to our duplicates map. That map is the value of the seen map
     { key, subOutput} -> [ array of duplicate keys ]

     Let's say that objA exists at key ['a']. It'll get tossed into seen as:
     seen[objA] = { key : 'a', suboutput : [ /* results of deepWalk of objA * /] }

     Then we later encounter objA at key ['b'] That'll fall into this check here and
     add onto the duplicates Map, which will look like this:

     duplicates[ { key : 'a', suboutput } ] = [ ['b'] ]

  */
  if (seen.has(obj)) {
    const originalKey = seen.get(obj)
    if (duplicates.get(originalKey) === undefined) {
      duplicates.set(originalKey, [])
    }

    duplicates.get(originalKey).push(key)
    return output
  }

  if (obj === null) {
    // null object? DO NOTHING
  } else if (Array.isArray(obj)) {
    const subOutput = []
    seen.set(obj, {key, subOutput})
    obj.forEach((e, i) => {
      subOutput.push(...internalDeepPathWalk(e, {key : [...key, i], seen, duplicates}))
    })
    output.push(...subOutput)
  } else if (typeof obj === "object") {
    const subOutput = []
    seen.set(obj, {key, subOutput})
    Object.keys(obj)
      .sort()
      .forEach(objKey => {
        subOutput.push(...internalDeepPathWalk(obj[objKey], {key : [...key, objKey], seen, duplicates}))
      })
    output.push(...subOutput)
  } else {
    // scalar? nothing to be done - refRow added above
  }

  return output
}

/*
  This takes a deepWalk result and collapses it into an object instead of a list.
*/

export function collapseDeepWalk(res) {
  return res.reduce((collapsed, row) => {
    collapsed[row.key.join("/")] = row.value
    return collapsed
  }, {})
}

/*
  given a res list, this'll filter out duplicate keypaths.

  ["c", "d"] and ["c/d"] are the same key, and should point to the same value.
*/

export function filterDuplicates(res) {
  const seen = new Set()
  return res.filter(row => {
    const key = row.key.join("/") || "/"
    if (seen.has(key)) {
      return false
    } else {
      seen.add(key)
      return true
    }
  })
}

/*
  given a collapsed deep walk, this'll peel out only the key/value pairs with scalar values.
  Basically, it gets you the leaves of your walk.
*/

export function pickScalars(obj) {
  return Object.keys(obj).reduce((picked, objKey) => {
    const value = obj[objKey]
    if (
      value === null ||
      (!Array.isArray(value) && typeof value !== "object")
    ) {
      picked[objKey] = value
    }
    return picked
  }, {})
}

/*
  much like outputDeepDiff from deepDiffDebug, this'll output your deepWalk in a pretty format
*/

export function outputDeepWalk(
  res,
  { filter = /.*/, withValues = false, groupName = "Deep Walk Output" } = {}
) {
  /* eslint-disable-next-line no-console */
  console.groupCollapsed(groupName)
  res.forEach(row => {
    const key = row.key.join("/") || "/"
    if (key.match(filter)) {
      /* eslint-disable-next-line no-console */
      console.log("%s : %s", key, row.value, withValues ? row.value : "")
    }
  })
  /* eslint-disable-next-line no-console */
  console.groupEnd(groupName)
}
