/*
  This is a companion to deepDiffDebug. That utility is mostly used by Zuul.

  This one is mostly used by vinceclortho.

  deepPathWalk will take a single object as an input and walk through it, producing
  a list of key/value pairs in a similar style to deepDiffDebug.

  const obj = {a : 1, b : 2, c : {d : 3}}

  const res = deepPathWalk(obj);

  res is:
  [
    { key : "a", value : 1 },
    { key : "b", value : 2 },
    { key : "c", value : { d : 3 } },
    { key : "c/d", value : 3 }
  ]

*/

export function deepPathWalk(obj, key = [], seen = new Set()) {
  const output = []

  const refRow = {
    key,
    value: obj
  }

  output.push(refRow)

  if (seen.has(obj)) {
    // already seen? bomb out early.
    return output
  }

  seen.add(obj)

  if (obj === null) {
    // null object? DO NOTHING
  } else if (Array.isArray(obj)) {
    obj.forEach((e, i) => {
      const subOutput = deepPathWalk(e, [...key, i], seen)
      output.push(...subOutput)
    })
  } else if (typeof obj === "object") {
    Object.keys(obj)
      .sort()
      .forEach(objKey => {
        const subOutput = deepPathWalk(obj[objKey], [...key, objKey], seen)
        output.push(...subOutput)
      })
  } else {
    output.push(refRow)
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
