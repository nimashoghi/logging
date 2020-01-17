/* eslint-disable @typescript-eslint/no-explicit-any */

import {inspect} from "util"
import {isTesting, LogFunction} from "./util"

const zip = <A, B>(a: A[], b: B[]): [A, B][] =>
    a.map((element, i) => [element, b[i]])

const processPlaceholder = (placeholder: any) => {
    if (typeof placeholder === "object") {
        // instead of calling .toString() on objects (which'd result in [object Object]), we use util.inspect instead
        return inspect(placeholder)
    }
    try {
        return `${placeholder}`
    } catch (toStringError) {
        try {
            return inspect(placeholder)
        } catch (inspectError) {
            const e: any = new Error(
                `Could not serialize the object using toString or inspect. Please check toStringError and inspectError properties for more info.`,
            )
            e.inspectError = inspectError
            e.toStringError = toStringError
            throw e
        }
    }
}

// creates a custom literal so we can use logger.info
const processLogString = (
    [...literals]: TemplateStringsArray,
    [...placeholders]: any[],
) =>
    zip(literals, [
        ...placeholders.map(placeholder => processPlaceholder(placeholder)),
        "",
    ])
        .map(([literal, placeholder]) => `${literal}${placeholder}`)
        .join("")

type TemplateLoggingMethod = (
    literals: TemplateStringsArray,
    ...placeholders: any[]
) => string

export const templateLogMethod = (
    method: LogFunction,
    shouldIgnore: boolean | (() => boolean),
): TemplateLoggingMethod => (
    literals: TemplateStringsArray,
    ...placeholders: any[]
) => {
    const shouldIgnoreValue =
        typeof shouldIgnore === "boolean" ? shouldIgnore : shouldIgnore()
    if (shouldIgnoreValue) {
        return ""
    }

    const str = processLogString(literals, placeholders)
    if (isTesting()) {
        console.log(str)
    } else {
        method(str)
    }
    return str
}
