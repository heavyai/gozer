/*
  Why is your component re-rendering? Just WTF actually changed in your props?

  Use this handy dandy debug function to find out!

  Sample usage:

  shouldComponentUpdate(nextProps, nextState) {
    if (this.props.id === "1") {
      outputDeepDiff( deepDiffDebug(nextProps, this.props), { filter : /fetchRangeData/ } )
    }
    return true;
  }

  Note that it's restricting the diff to only a particular ID (so we don't dump it out for everything),
  and that it's specifying a matching regex to only print out diffs on the fetchRangeData function.

  Change those values as necessary.

  And figure out what's changed and skip those unnecessary re-render cycles.

*/

/*
  deepDiffDebug( obj1, obj2 )

  returns a data structure with a list of all differences between obj1 and obj2.

  The return is an array of differences:
    {
      key,
      type,
      leftLabel,
      leftValue,
      rightLabel,
      rightValue
    }

  The "key" is an array which contains the key path to reach the diff in the structure.
  So if the difference is at obj["a"]["b"]["c"] the key will be ["a", "b", "c"]

  "type" is either "ref", "val", or "ref/val" so you can filter looking at differences which have
  a value difference or a ref difference.

  "ref" means that the objects are identical, but different references.
  "val" means that the values are different, e.g. 2 !== 3
  "ref/val" means that the objects are not identical AND there are values contained within them
    which do not match.

  leftLabel, leftValue are the pretty display label and actual object in obj1 at the
  given key path.

  rightLabel, rightValue are the pretty display label and actual object in obj2 at the
  given key path.

  Read on to see additional functions to help you deal with this output.
*/

export function deepDiffDebug(a, b, key = []) {
  const output = []
  // the refRow is output if two objects or arrays are not the same ref.
  // if the refs are different but all values the same, it'll be of type ref
  // if the values differ too, it'll be ref/val.
  const refRow = {
    key,
    leftLabel: "left ref",
    leftValue: a,
    rightLabel: "right ref",
    rightValue: b,
    type: "ref"
  }

  if (a === null && b === null) {
    // both nulls? DO NOTHING
  } else if (a === b) {
    // both referentially equal? DO NOTHING
  } else if (Array.isArray(a) && Array.isArray(b)) {
    output.push(refRow)
    a.forEach((e, i) => {
      const subOutput = deepDiffDebug(a[i], b[i], [...key, i])
      output.push(...subOutput)
      if (diffsByTypes(subOutput, ["val", "ref/val"]).length) {
        refRow.type = "ref/val"
      }
    })
    if (b.length > a.length) {
      for (let i = a.length; i < b.length; i = i + 1) {
        const subOutput = deepDiffDebug(undefined, b[i], [...key, i])
        if (diffsByTypes(subOutput, ["val", "ref/val"]).length) {
          refRow.type = "ref/val"
        }
      }
    }
  } else if (
    objectType(a) === "object" &&
    objectType(b) === "object" &&
    a !== null &&
    b !== null
  ) {
    output.push(refRow)
    Object.keys(a)
      .filter(objKey => objKey !== "containerRef")
      .sort()
      .forEach(objKey => {
        const subOutput = deepDiffDebug(a[objKey], b[objKey], [...key, objKey])
        output.push(...subOutput)
        if (diffsByTypes(subOutput, ["val", "ref/val"]).length) {
          refRow.type = "ref/val"
        }
      })
    Object.keys(b)
      .filter(objKey => objKey !== "containerRef" && !(objKey in a))
      .sort()
      .forEach(objKey => {
        const subOutput = deepDiffDebug(undefined, b[objKey], [...key, objKey])
        output.push(...subOutput)
        if (diffsByTypes(subOutput, ["val", "ref/val"]).length) {
          refRow.type = "ref/val"
        }
      })
    // if we have an object type which has no keys (I'm looking at you, Date!), then we must assume that the value is different.
    if (Object.keys(a).length === 0 && Object.keys(b).length === 0) {
      refRow.type = "val"
    }
  } else if (objectType(a) === "date" && objectType(b) === "date") {
    // dates are a special case. Inevitably the first of many. We look up the "real" type of the object
    // (type of just reports "object"), and if it's a date then we note that the ref is different and compare
    // the time values. If those differ, it's a value difference. If not, it's a ref difference.
    output.push(refRow)
    if (a.getTime() !== b.getTime()) {
      refRow.type = "val"
    }
  } else {
    output.push({
      key,
      leftLabel: "left val",
      leftValue: a,
      rightLabel: "right val",
      rightValue: b,
      type: "val"
    })
  }

  return output
}

/*
  internal function - given an object, returns its "real" type. since typeof will happily say
  "object" no matter what. Right now it only handles dates, but inevitably will need to handle more.
*/
function objectType(obj) {
  const reportedType = typeof obj
  if (reportedType !== "object") {
    return reportedType
  } else if (Object.prototype.toString.call(obj) === "[object Date]") {
    return "date"
  } else {
    return reportedType
  }
}

/*
  call it on the result of deepDiffDebug with an array of flags of either "ref", "val", or "ref/val" to filter
  on only diffs of that type.

  diffsByTypes( deepDiffDebug( obj1, obj2 ), ["ref"] )
*/

export function diffsByTypes(diff, types) {
  return diff.filter(row =>
    types.reduce((match, type) => match || row.type === type, false)
  )
}

/*
  call on the result of deepDiffDebug to see if the two objects are deep equal.

  isEqual( deepDiffDebug( obj1, obj2 ) )

  PLEASE NOTE - there are other deep equality libraries such as
  import deepEquals from "fast-deep-equal"

  that are going to be faster/better. You should only use this isEqual if you want
  the deepDiffDebug output anyway, and still want to check a boolean value at the end.
*/

export function isEqual(diff) {
  return diffsByTypes(diff, ["val"]).length === 0
}

/*
  a deepDiff will potentially include many useless keys you don't need to check. Let's say you're diffing
  two objects:
    const a = {a : 1, b : { c : 3} }
    const b = {a : 1, b : { c : 3} }

  These two objects are obviously the same. the deepDiff will contain (as output via outputDeeDiff):

  / : [ref] left ref !== right ref
  b : [ref] left ref !== right ref

  Showing that the root object is different AND the "b" key object is different. But you don't care about "b"
  being a different ref - if we sanitize the objects together at the root, that'll automatically bring along the "b"
  key.

  The filter reduces it so the diff only includes the highest "ref" key in a path:

  outputDeepDiff ( filterRedundantRows( deepDiffDebug( a, b) ) )
    / : [ref] left ref !== right ref

  So you can only deal with sanitizing objects once, instead of redundantly checking to sanitize other keys.

*/

export function filterRedundantRows(diff) {
  const priorKeys = []

  return diff.filter(row => {
    // if the diff is not ref, then we have to included it no matter what.
    if (row.type !== "ref") {
      return true
    }

    const rowKey = row.key.join("/")
    for (const key of priorKeys) {
      // check all known prior keys. And if any of them match, then we're already going
      // to get caught by that parent key. We can fail out.
      if (rowKey.match(key)) {
        return false
      }
    }
    // if we've reached this point, then it's a ref diff AND it's not filtered by a parent
    // so we need to included it AND we want to add its key as a prior key.

    priorKeys.push(new RegExp(`^${rowKey}`))
    return true
  })
}

/*
  outputDeepDiff takes a diff and an optional object of values. It will spit out the diff
  to your console.

  outputDeepDiff( deepDiffDebug( obj1, obj2 ) , options )

  options may contain the following keys:
    filter = a regex to filter the key paths.
    withValues = true/false - print out the value of the diff in addition to the label
    groupName = console statements will be grouped. This is the group name. defaults to
                "Deep Diff Output"
*/

export function outputDeepDiff(
  res,
  { filter = /.*/, withValues = false, groupName = "Deep Diff Output" } = {}
) {
  /* eslint-disable-next-line no-console */ /* tslint:disable-next-line:no-console */
  console.groupCollapsed(groupName)
  if (res.length === 0) {
    /* eslint-disable-next-line no-console */ /* tslint:disable-next-line:no-console */
    console.log("Objects are the same or differences are filtered out")
  } else {
    res.forEach(row => {
      const key = row.key.length
        ? (row.key.join("/") || "/")
        : "(root object)"
      if (key.match(filter)) {
        // tslint:disable""""
        /* eslint-disable-next-line no-console */
        console.log(
          "%s : [%s] %s !== %s",
          key,
          row.type,
          row.leftLabel,
          row.rightLabel,
          withValues ? row.leftValue : "",
          withValues ? row.rightValue : ""
        )
        // tslint:enable
      }
    })
  } /* eslint-disable-next-line no-console */
  /* tslint:disable-next-line:no-console */ console.groupEnd(groupName)
}
