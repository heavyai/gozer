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

import React, { useRef } from "react"

import { sanitize } from "../utils/sanitizeObject"
import {
  deepDiffDebug,
  outputDeepDiff,
  filterRedundantRows
} from "../utils/deepDiffDebug"

const defaultOptions = {
  enabled: true,
  troubleMakers: [],
  outputSanitizedProps: false,
  deepDiffOutputConditional: () => false,
  formatSanitizedProp: (Component, props, path) =>
    `${displayName(Component, props)} : ${path.join("/")} `
}

export const componentName = Component =>
  Component.displayName || Component.name || "Unknown Component"

export const displayName = (Component, props) =>
  `${componentName(Component)} [${props.id || "no id"}]`

export default (Component, givenOptions) => {
  const options = { ...defaultOptions, ...givenOptions }
  const sanitizedFormatter = options.formatSanitizedProp
  options.formatSanitizedProp = (props, path) =>
    sanitizedFormatter(Component, props, path)

  // if we're not enabled, we can safely just return the original component.
  if (!options.enabled) {
    return Component
  }

  return function Zuul(props) {
    const lastProps = useRef({})
    const currentProps = lastProps.current
    const sanitizedProps = sanitize(props, currentProps, options, Component)

    if (options.deepDiffOutputConditional(props)) {
      outputDeepDiff(
        filterRedundantRows(deepDiffDebug(props, currentProps), ["ref"]),
        {
          groupName: `deep diff props vs old props - ${displayName(
            Component,
            props
          )}`,
          withValues: true
        }
      )
      outputDeepDiff(
        filterRedundantRows(deepDiffDebug(sanitizedProps, currentProps)),
        {
          groupName: `deep diff sanitized props vs old props - ${displayName(
            Component,
            props
          )}`,
          withValues: true
        }
      )
    }

    lastProps.current = sanitizedProps
    return <Component {...sanitizedProps} />
  }
}
