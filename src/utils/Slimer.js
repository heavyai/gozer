const fetched = new Map();
const promises = new Map();
async function fetchIt(file, line, column) {
  if (!window.sourceMap) {
    throw new Error(
      "Please install source-map and configure it before using traces"
    );
  }

  if (!fetched.has(file)) {
    const mapFile = `${file}.map`;

    if (promises.has(mapFile)) {
      await promises.get(mapFile);
    } else {
      // eslint-disable-next-line no-async-promise-executor
      const promise = new Promise(async (resolve, reject) => {
        try {
          const res = await fetch(mapFile);
          promises.delete(mapFile);

          const mapJSON = await res.json();

          const consumer = await new window.sourceMap.SourceMapConsumer(
            mapJSON
          );
          fetched.set(file, consumer);

          resolve();
        } catch (e) {
          reject(e);
        }
      });

      promises.set(mapFile, promise);
      await promise;
    }
  }

  const pos = fetched.get(file).originalPositionFor({ line, column });

  return pos;
}

const seenCalls = new Set();

async function getTrace(e, label, logExternalTrace, slimeTraceCSS) {
  const stack = e.stack;
  const trace = "";

  for (let i = 0; i < Math.min(40, stack.length); i += 1) {
    const frame = stack[i];
    const func = frame.getFunctionName();
    const file = frame.getFileName();
    if (file === null) {
      break;
    }
    const position = await fetchIt(
      file,
      frame.getLineNumber(),
      frame.getColumnNumber()
    );

    if (
      position === null ||
      position.source === null ||
      position.source.match(/Slimer.js/) ||
      position.source.match(/react-hot-loader/)
      // tack into here the other paths you want to remove, or override it.
      // position.source.match(/my-file-name.js/) ||
    ) {
      // eslint-disable-next-line no-continue
      continue;
    }

    const externalCall = `[${label}] via ${func} IN ${file} (${position.source}, ${position.line})`;
    if (!seenCalls.has(externalCall)) {
      seenCalls.add(externalCall);
      // eslint-disable-next-line no-console
      console.log(
        "%cGetting slimed external trace :",
        slimeTraceCSS,
        externalCall,
        position.column
      );
      // console.log(`${externalCall} (${position.column})`)
    }

    break;
  }

  return trace;
}

export default function Slimer(wrapped, config = {}) {
  const {
    label = "object",
    slimeUndefined = false,
    logSet = false, // true,
    logGet = false, // true,
    logFunction = false, // true,
    logSymbols = false, // true,
    logExternalTrace = false,
    logPromises = false,
    slimeSetCSS = "background-color:#00FF00",
    slimeGetCSS = "background-color:#CCFFCC",
    slimeFunctionCSS = "background-color:#66FF66",
    slimeTraceCSS = "background-color:#BBFF22",
    slimePromiseCSS = "background-color:#22FFBB",
    hideFunctionDefs = true,
    labelBreaks = new Set(),
    enabled = false
  } = config;

  if (!enabled) {
    return wrapped;
  }

  if (logExternalTrace === true) {
    Error.prepareStackTrace = (e, s) => s;
  }

  if (
    (typeof wrapped !== "object" && typeof wrapped !== "function") ||
    wrapped === null ||
    wrapped === undefined
  ) {
    return wrapped;
  }
  // promises are a super special case. We want to wrap the result of the promise.
  if (Promise.resolve(wrapped) === wrapped) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      try {
        const result = await wrapped;
        if (logPromises) {
          // eslint-disable-next-line no-console
          console.log(
            "%cResolved slimed promise: ",
            slimePromiseCSS,
            label,
            result
          );
        }
        resolve(result);
      } catch (e) {
        if (logPromises) {
          // eslint-disable-next-line no-console
          console.log("%cRejected slimed promise: ", slimePromiseCSS, label, e);
        }
        reject(e);
      }
    });
  }

  const proxyFunc = () => wrapped;
  proxyFunc.valueOf = () => wrapped.valueOf();
  proxyFunc.toString = () => wrapped.toString();

  return new Proxy(wrapped, {
    original: () => wrapped,
    construct: (target, args) => {
      return new target(...args);
    },
    set: (obj, prop, value) => {
      if (logSet) {
        // eslint-disable-next-line no-console
        console.log(
          "%cSetting slimed property ",
          slimeSetCSS,
          label,
          prop,
          value
        );
      }
      if (labelBreaks.has(`set/${label}`)) {
        // eslint-disable-next-line no-debugger
        debugger;
      }
      return Reflect.set(wrapped, prop, value);
    },

    get: (obj, prop) => {
      if (
        prop === "constructor" ||
        prop === "prototype" ||
        prop === "inspect" ||
        prop === "call" ||
        prop === "@@toStringTag"
      ) {
        return wrapped[prop];
      }

      if (logGet) {
        // eslint-disable-next-line no-console
        console.log(
          "%cGetting slimed property : ",
          slimeGetCSS,
          label,
          prop,
          typeof wrapped[prop] === "function" && hideFunctionDefs
            ? "function"
            : wrapped[prop]
        );
        // const stackTrace = Error.captureStackTrace(new Error())
        // const stackTrace = new Error().stack
        // console.log("STACK TRACE : ", stackTrace)
        // console.trace()
      }

      if (logExternalTrace && prop !== "then" && prop !== "catch") {
        try {
          throw new Error("Slimer slimed you!");
        } catch (e) {
          getTrace(e, prop, logExternalTrace, slimeTraceCSS); // `[${prop}]`)
        }
      }

      if (labelBreaks.has(`get/${label}`)) {
        // eslint-disable-next-line no-debugger
        debugger;
      }

      if (typeof prop === "string") {
        const sublabel = [label, prop].join("/");
        // objects should be re-slimed
        if (typeof wrapped[prop] === "object") {
          return wrapped[prop] === null
            ? null
            : Slimer(wrapped[prop], { ...config, label: sublabel });
        } else if (typeof wrapped[prop] === "function") {
          // likewise, functions should also be reslimed
          /* if (logFunction) {
          // eslint-disable-next-line no-console
          console.log("%cCalling slimed function : ", slimeCSS, prop, wrapped[prop], typeof wrapped[prop])
        } */

          const boundFunc = wrapped[prop].bind(wrapped);
          return (...args) => {
            const retVal = boundFunc(...args);
            if (logFunction) {
              // eslint-disable-next-line no-console
              console.log(
                "%cCalling slimed function : ",
                slimeFunctionCSS,
                label,
                prop,
                args,
                retVal
              );
            }

            if (logExternalTrace && prop !== "then" && prop !== "catch") {
              try {
                throw new Error("Slimer slimed you!");
              } catch (e) {
                getTrace(e, prop, logExternalTrace, slimeTraceCSS); // `${prop}()`)
              }
            }

            if (labelBreaks.has(`function/${label}`)) {
              // eslint-disable-next-line no-debugger
              debugger;
            }

            return Slimer(retVal, { ...config, label: `${sublabel}[=>]` });
          };
        } else {
          // otherwise, it's a literal value. No sliming necessary. UNLESS we're sliming undefined attributes.
          if (prop === "prototype") {
            return wrapped[prop];
          }
          return wrapped[prop] === undefined && slimeUndefined
            ? Slimer({}, { ...config, label: sublabel })
            : wrapped[prop];
        }
      } else {
        // javascript is freaking bananas. You can call get with a symbol, not just a string. This is for some sort
        // of bullshit attempt at encapsulated methods. But we need to handle it!
        if (logSymbols) {
          // eslint-disable-next-line no-console
          console.log(
            `%caccessing symbol on ${label} : `,
            slimeGetCSS,
            prop,
            wrapped[prop]
          );
        }
        if (labelBreaks.has(`symbol/${label}`)) {
          // eslint-disable-next-line no-debugger
          debugger;
        }

        return wrapped[prop];
      }
    },
    apply: (...args) => {
      // Fun. You'll note that anything slimed is actually wrapped into a FUNCTION, NOT AN OBJECT.
      // This is so we can do this. If we're sliming undefined values, we can't be positive that we're gonna get back
      // something that'd be used as an object or something that'd be used as a function. So we actually shove whatever
      // we're sliming into a function call that returns the wrapped object. This almost very nearly works in all cases.
      //
      if (logFunction) {
        // eslint-disable-next-line no-console
        console.log("%csliming function with args : ", slimeSetCSS, ...args);
      }
      if (labelBreaks.has(`function/${label}`)) {
        // eslint-disable-next-line no-debugger
        debugger;
      }
      return Reflect.apply(...args);
    }
  });
}
