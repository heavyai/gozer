import deepEquals from 'fast-deep-equal';
import React, { useRef } from 'react';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};

var _extends = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();

var toConsumableArray = function (arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

    return arr2;
  } else {
    return Array.from(arr);
  }
};

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

function deepDiffDebug(a, b) {
  var key = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

  var output = [];
  // the refRow is output if two objects or arrays are not the same ref.
  // if the refs are different but all values the same, it'll be of type ref
  // if the values differ too, it'll be ref/val.
  var refRow = {
    key: key,
    leftLabel: "left ref",
    leftValue: a,
    rightLabel: "right ref",
    rightValue: b,
    type: "ref"
  };

  if (a === null && b === null) ; else if (a === b) ; else if (Array.isArray(a) && Array.isArray(b)) {
    output.push(refRow);
    a.forEach(function (e, i) {
      var subOutput = deepDiffDebug(a[i], b[i], [].concat(toConsumableArray(key), [i]));
      output.push.apply(output, toConsumableArray(subOutput));
      if (diffsByTypes(subOutput, ["val", "ref/val"]).length) {
        refRow.type = "ref/val";
      }
    });
    if (b.length > a.length) {
      for (var i = a.length; i < b.length; i = i + 1) {
        var subOutput = deepDiffDebug(undefined, b[i], [].concat(toConsumableArray(key), [i]));
        if (diffsByTypes(subOutput, ["val", "ref/val"]).length) {
          refRow.type = "ref/val";
        }
      }
    }
  } else if (objectType(a) === "object" && objectType(b) === "object" && a !== null && b !== null) {
    output.push(refRow);
    Object.keys(a).filter(function (objKey) {
      return objKey !== "containerRef";
    }).sort().forEach(function (objKey) {
      var subOutput = deepDiffDebug(a[objKey], b[objKey], [].concat(toConsumableArray(key), [objKey]));
      output.push.apply(output, toConsumableArray(subOutput));
      if (diffsByTypes(subOutput, ["val", "ref/val"]).length) {
        refRow.type = "ref/val";
      }
    });
    Object.keys(b).filter(function (objKey) {
      return objKey !== "containerRef" && !(objKey in a);
    }).sort().forEach(function (objKey) {
      var subOutput = deepDiffDebug(undefined, b[objKey], [].concat(toConsumableArray(key), [objKey]));
      output.push.apply(output, toConsumableArray(subOutput));
      if (diffsByTypes(subOutput, ["val", "ref/val"]).length) {
        refRow.type = "ref/val";
      }
    });
    // if we have an object type which has no keys (I'm looking at you, Date!), then we must assume that the value is different.
    if (Object.keys(a).length === 0 && Object.keys(b).length === 0) {
      refRow.type = "val";
    }
  } else if (objectType(a) === "date" && objectType(b) === "date") {
    // dates are a special case. Inevitably the first of many. We look up the "real" type of the object
    // (type of just reports "object"), and if it's a date then we note that the ref is different and compare
    // the time values. If those differ, it's a value difference. If not, it's a ref difference.
    output.push(refRow);
    if (a.getTime() !== b.getTime()) {
      refRow.type = "val";
    }
  } else {
    output.push({
      key: key,
      leftLabel: "left val",
      leftValue: a,
      rightLabel: "right val",
      rightValue: b,
      type: "val"
    });
  }

  return output;
}

/*
  internal function - given an object, returns its "real" type. since typeof will happily say
  "object" no matter what. Right now it only handles dates, but inevitably will need to handle more.
*/
function objectType(obj) {
  var reportedType = typeof obj === "undefined" ? "undefined" : _typeof(obj);
  if (reportedType !== "object") {
    return reportedType;
  } else if (Object.prototype.toString.call(obj) === "[object Date]") {
    return "date";
  } else {
    return reportedType;
  }
}

/*
  call it on the result of deepDiffDebug with an array of flags of either "ref", "val", or "ref/val" to filter
  on only diffs of that type.

  diffsByTypes( deepDiffDebug( obj1, obj2 ), ["ref"] )
*/

function diffsByTypes(diff, types) {
  return diff.filter(function (row) {
    return types.reduce(function (match, type) {
      return match || row.type === type;
    }, false);
  });
}

/*
  call on the result of deepDiffDebug to see if the two objects are deep equal.

  isEqual( deepDiffDebug( obj1, obj2 ) )

  PLEASE NOTE - there are other deep equality libraries such as
  import deepEquals from "fast-deep-equal"

  that are going to be faster/better. You should only use this isEqual if you want
  the deepDiffDebug output anyway, and still want to check a boolean value at the end.
*/

function isEqual(diff) {
  return diffsByTypes(diff, ["val"]).length === 0;
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

function filterRedundantRows(diff) {
  var priorKeys = [];

  return diff.filter(function (row) {
    // if the diff is not ref, then we have to included it no matter what.
    if (row.type !== "ref") {
      return true;
    }

    var rowKey = row.key.join("/");
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = priorKeys[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var key = _step.value;

        // check all known prior keys. And if any of them match, then we're already going
        // to get caught by that parent key. We can fail out.
        if (rowKey.match(key)) {
          return false;
        }
      }
      // if we've reached this point, then it's a ref diff AND it's not filtered by a parent
      // so we need to included it AND we want to add its key as a prior key.
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    priorKeys.push(new RegExp("^" + rowKey));
    return true;
  });
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

function outputDeepDiff(res) {
  var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      _ref$filter = _ref.filter,
      filter = _ref$filter === undefined ? /.*/ : _ref$filter,
      _ref$withValues = _ref.withValues,
      withValues = _ref$withValues === undefined ? false : _ref$withValues,
      _ref$groupName = _ref.groupName,
      groupName = _ref$groupName === undefined ? "Deep Diff Output" : _ref$groupName;

  /* eslint-disable-next-line no-console */ /* tslint:disable-next-line:no-console */
  console.groupCollapsed(groupName);
  if (res.length === 0) {
    /* eslint-disable-next-line no-console */ /* tslint:disable-next-line:no-console */
    console.log("Objects are the same or differences are filtered out");
  } else {
    res.forEach(function (row) {
      var key = row.key.join("/") || "/";
      if (key.match(filter)) {
        // tslint:disable""""
        /* eslint-disable-next-line no-console */
        console.log("%s : [%s] %s !== %s", key, row.type, row.leftLabel, row.rightLabel, withValues ? row.leftValue : "", withValues ? row.rightValue : "");
        // tslint:enable
      }
    });
  } /* eslint-disable-next-line no-console */
  /* tslint:disable-next-line:no-console */console.groupEnd(groupName);
}

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

var getValueAtPath = function getValueAtPath(obj, path) {
  var subObj = obj;
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = path[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var segment = _step.value;

      if (segment in subObj) {
        subObj = subObj[segment];
      } else {
        return undefined;
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return subObj;
};

var setValueAtPath = function setValueAtPath(obj, path, val) {
  if (!path.length) {
    return val;
  }

  var reducedPath = [].concat(toConsumableArray(path));
  var masterKey = reducedPath.pop();

  var parent = getValueAtPath(obj, reducedPath);
  parent[masterKey] = val;

  return obj;
};

var shouldSanitize = function shouldSanitize(objA, objB, needsDeepCheck) {
  // if the objects are referentially equal, we don't need to santize
  if (objA === objB) {
    return false;
  } else if (needsDeepCheck) {
    // otherwise, they're not equal. If we have not performed a deep equality check,
    // then do so now
    return deepEquals(objA, objB);
  } else {
    // otherwise, they're not equal AND we have performed a deep equality check.
    // we know it needs to be sanitized.
    return true;
  }
};

var defaultOptions = {
  troubleMakers: [],
  outputSanitizedProps: true,
  formatSanitizedProp: function formatSanitizedProp(props, path) {
    return path.join("/");
  }
};

var sanitize = function sanitize(props, currentProps, givenOptions) {
  var options = _extends({}, defaultOptions, givenOptions);
  var sanitizedProps = _extends({}, props);

  var _ref = options.troubleMakers.length ? [options.troubleMakers.map(function (path) {
    return path.split("/");
  }), true] : [filterRedundantRows(diffsByTypes(deepDiffDebug(props, currentProps), ["ref"]).map(function (row) {
    return row.key;
  })), false],
      _ref2 = slicedToArray(_ref, 2),
      pathsToCheck = _ref2[0],
      needsDeepCheck = _ref2[1];

  if (Object.keys(currentProps).length) {
    pathsToCheck.forEach(function (path) {
      var newProp = getValueAtPath(sanitizedProps, path);
      var oldProp = getValueAtPath(currentProps, path);
      if (shouldSanitize(newProp, oldProp, needsDeepCheck)) {
        if (options.outputSanitizedProps) {
          // eslint-disable-next-line
          console.log("sanitizes ", options.formatSanitizedProp(props, path));
        }
        sanitizedProps = setValueAtPath(sanitizedProps, path, oldProp);
      }
    });
  }

  return sanitizedProps;
};

/* Zuul is the GateKeeper. https://ghostbusters.fandom.com/wiki/Zuul

   Why is this component so whimsically named? Why not just go with its original name of "GateKeeper"?
   Because it shouldn't exist. I don't want it to blend into the background and people gloss over it
   and think, "GateKeeper. Yeah, sure. Probably a security thing." I *want* people to say "WTF is that?"

   Because it should not exist.

   Zuul will monitor your incoming props and sanitize them if they have value but not referential equality.

   So this:

   export SomeComponent

   becomes:

   export Zuul(SomeComponent, options)

   Zuul is great to wedge between a managed container and an unmanaged component.

   mapStateToProps( state, actions)( Zuul(SomeComponent, options) )

   The second arg to Zuul is an options hash:

   enabled : true/false - whether Zuul is enabled for this component. You should -never- pass true, since that's
   the default and we want to use that to globally turn Zuul off. But you can hand in false to turn off on an individual
   basis. If enabled is false, Zuul will hand back the original component.

   troubleMakers : an array of paths to check. If this is handed in, you can use it to reduce the comparisons by not
   doing a full deepDiffDebug on the props and instead only target the things you know to be problematic. Should be
   an array of path strings (not arrays)

   outputSanitizedProps : boolean which'll determine if we console.log() out the props getting sanitized.

   formatSanitizedProp : you probably don't need to override this, but it's a function call to provide prettier info on the
   prop being sanitized.

   deepDiffOutputCnditional : function which'll be given the props which you can use to determin if you want to output
   the deep diff. Useful with something like (props) => props.id === "1" to only output a deep diff on a single component.

   A good set of options to give to Zuul is...nothing. Just use the defaults.

   If your props are re-factored nicely so they are only handing in new objects if some of the value has changed, then you
   don't need to use Zuul and it will provide no benefit to you. What a wonderful world that will be.

*/

var defaultOptions$1 = {
  enabled: true,
  troubleMakers: [],
  outputSanitizedProps: false,
  deepDiffOutputConditional: function deepDiffOutputConditional() {
    return false;
  },
  formatSanitizedProp: function formatSanitizedProp(Component, props, path) {
    return displayName(Component, props) + " : " + path.join("/") + " ";
  }
};

var componentName = function componentName(Component) {
  return Component.displayName || Component.name || "Unknown Component";
};

var displayName = function displayName(Component, props) {
  return componentName(Component) + " [" + (props.id || "no id") + "]";
};

var Zuul = (function (Component, givenOptions) {
  var options = _extends({}, defaultOptions$1, givenOptions);
  var sanitizedFormatter = options.formatSanitizedProp;
  options.formatSanitizedProp = function (props, path) {
    return sanitizedFormatter(Component, props, path);
  };

  // if we're not enabled, we can safely just return the original component.
  if (!options.enabled) {
    return Component;
  }

  return function Zuul(props) {
    var lastProps = useRef({});
    var currentProps = lastProps.current;
    var sanitizedProps = sanitize(props, currentProps, options, Component);

    if (options.deepDiffOutputConditional(props)) {
      outputDeepDiff(filterRedundantRows(deepDiffDebug(props, currentProps), ["ref"]), {
        groupName: "deep diff props vs old props - " + displayName(Component, props),
        withValues: true
      });
      outputDeepDiff(filterRedundantRows(deepDiffDebug(sanitizedProps, currentProps)), {
        groupName: "deep diff sanitized props vs old props - " + displayName(Component, props),
        withValues: true
      });
    }

    lastProps.current = sanitizedProps;
    return React.createElement(Component, sanitizedProps);
  };
});

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

function deepPathWalk(obj) {
  var key = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  var seen = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : new Set();

  var output = [];

  var refRow = {
    key: key,
    value: obj
  };

  output.push(refRow);

  if (seen.has(obj)) {
    // already seen? bomb out early.
    return output;
  }

  seen.add(obj);

  if (obj === null) ; else if (Array.isArray(obj)) {
    obj.forEach(function (e, i) {
      var subOutput = deepPathWalk(e, [].concat(toConsumableArray(key), [i]), seen);
      output.push.apply(output, toConsumableArray(subOutput));
    });
  } else if ((typeof obj === "undefined" ? "undefined" : _typeof(obj)) === "object") {
    Object.keys(obj).sort().forEach(function (objKey) {
      var subOutput = deepPathWalk(obj[objKey], [].concat(toConsumableArray(key), [objKey]), seen);
      output.push.apply(output, toConsumableArray(subOutput));
    });
  } else {
    output.push(refRow);
  }

  return output;
}

/*
  This takes a deepWalk result and collapses it into an object instead of a list.
*/

function collapseDeepWalk(res) {
  return res.reduce(function (collapsed, row) {
    collapsed[row.key.join("/")] = row.value;
    return collapsed;
  }, {});
}

/*
  given a res list, this'll filter out duplicate keypaths.

  ["c", "d"] and ["c/d"] are the same key, and should point to the same value.
*/

function filterDuplicates(res) {
  var seen = new Set();
  return res.filter(function (row) {
    var key = row.key.join("/") || "/";
    if (seen.has(key)) {
      return false;
    } else {
      seen.add(key);
      return true;
    }
  });
}

/*
  given a collapsed deep walk, this'll peel out only the key/value pairs with scalar values.
  Basically, it gets you the leaves of your walk.
*/

function pickScalars(obj) {
  return Object.keys(obj).reduce(function (picked, objKey) {
    var value = obj[objKey];
    if (value === null || !Array.isArray(value) && (typeof value === "undefined" ? "undefined" : _typeof(value)) !== "object") {
      picked[objKey] = value;
    }
    return picked;
  }, {});
}

/*
  much like outputDeepDiff from deepDiffDebug, this'll output your deepWalk in a pretty format
*/

function outputDeepWalk(res) {
  var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      _ref$filter = _ref.filter,
      filter = _ref$filter === undefined ? /.*/ : _ref$filter,
      _ref$withValues = _ref.withValues,
      withValues = _ref$withValues === undefined ? false : _ref$withValues,
      _ref$groupName = _ref.groupName,
      groupName = _ref$groupName === undefined ? "Deep Walk Output" : _ref$groupName;

  /* eslint-disable-next-line no-console */
  console.groupCollapsed(groupName);
  res.forEach(function (row) {
    var key = row.key.join("/") || "/";
    if (key.match(filter)) {
      /* eslint-disable-next-line no-console */
      console.log("%s : %s", key, row.value, withValues ? row.value : "");
    }
  });
  /* eslint-disable-next-line no-console */
  console.groupEnd(groupName);
}

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

var defaultOptions$2 = {
  logMutations: true,
  logRepackaging: false,
  debugMutations: false,
  debugRepackaging: false
};

var vinzclortho = (function (givenOptions) {
  var options = _extends({}, defaultOptions$2, givenOptions);

  // tslint-disable
  // eslint-disable-next-line
  console.info("VINZ CLORTHO HAS BEEN SUMMONED. YOU HAD ~BETTER~ BE IN A DEV ENVIRONMENT!");
  // tslint-enable

  return function (store) {
    return function (next) {
      return function (action) {
        // okay, here's where the magic happens. First things first - we do a deep walk of the
        // current state and collapse it into a single object. This gives us a record of every
        // value at every keypath - AND it maintains the original object references.
        var oldState = collapseDeepWalk(filterDuplicates(deepPathWalk(store.getState()))); /* tslint:disable-next-line */

        // next, we just dispatch our current action.
        /* eslint-disable-next-line */
        var result = next(action);

        // Now we do a deep walk of the new state after the action was fired. Same deal - we
        // get a listing of every object at every keypath, with the original object references.
        var newState = collapseDeepWalk(filterDuplicates(deepPathWalk(store.getState())));

        // now, we have two objects so we can just do a standard deepDiffDebug on them to find
        // the differences.
        //
        // We care about paths that differ by "ref", meaning that they are object containers, but
        // are logically equal (though not referentially equal) That indicates a re-packaging error
        //
        // We also care about paths that differ by "val", meaning that they're a scalar value that
        // has changed. In that case, we want to look through all of their parents and see if any of
        // those objects appear in both states - because if they do that indicates a mutation.
        var deepDiffs = diffsByTypes(deepDiffDebug(oldState, newState), ["val", "ref"]);

        var seen = new Set();

        // now we're going to iterate over the diffs.
        deepDiffs.forEach(function (row) {
          // because of the deepPathWalk output, we may have duplicate keys - ["foo/bar"] and ["foo", "bar"] are
          // identical paths. So we join all subpaths and check for duplication. If nothing, we continue on and
          // re-split to get all sub-paths.
          var keyStr = row.key.join("/");

          if (seen.has(keyStr)) {
            return;
          }
          seen.add(keyStr);
          var key = keyStr.split("/");

          // if it's a value change and we're logging mutations, we need to look at all parent containers and see if
          // any of them have referential equality, but not value.
          if (options.logMutations && row.type === "val") {
            var subKeyRing = [];
            key.forEach(function (piece) {
              subKeyRing.push(piece);
              var subKey = subKeyRing.join("/");
              if (seen.has(subKey)) {
                return;
              }

              // if we're in here, we know a value has changed. So if the parent containers match in both states, we know that it
              // must have been a mutation.
              if (oldState[subKey] !== undefined && newState[subKey] !== undefined) {
                if (oldState[subKey] === newState[subKey]) {
                  seen.add(subKey);
                  // tslint-disable
                  // eslint-disable-next-line
                  console.error("VINZ CLORTHO SAYS YOUR REDUX STORE WILL PERISH IN FLAMES. MUTATION @ ", subKey || "/", action, row);
                  // ts-lint-enable
                  if (options.debugMutations) {
                    /* eslint-disable-next-line no-debugger */ /* tslint:disable-next-line:no-debugger */
                    debugger;
                  }
                }
              }
            });
          }

          // if we're logging repackaging, then look to see if this is a "ref" change. That means the two objects are identical, but
          // different refs.
          if (options.logRepackaging) {
            if (oldState[keyStr] !== undefined && newState[keyStr] !== undefined && row.type === "ref") {
              // tslint-disable
              // eslint-disable-next-line
              console.warn("VINZ CLORTHO SAYS YOUR REDUX STORE IS NOT IN ONE OF THE PRE-CHOSEN FORMS. UNNECESSARY RE-PACKAGING @ ", keyStr, action);
              // tslint-enable
            }
            if (options.debugRepackaging) {
              /* eslint-disable-next-line no-debugger */ /* tslint:disable-next-line:no-debugger */
              debugger;
            }
          }
        });

        return result;
      };
    };
  };
});

export { Zuul, vinzclortho, deepDiffDebug, diffsByTypes, isEqual, filterRedundantRows, outputDeepDiff, deepPathWalk, collapseDeepWalk, filterDuplicates, pickScalars, outputDeepWalk, sanitize };
//# sourceMappingURL=index.es.js.map
