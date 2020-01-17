/* eslint-disable @typescript-eslint/no-explicit-any */

import fs from "fs"
import path from "path"
import pino from "pino"
import {inspect} from "util"

export const existsAndIsDirectory = (directory: string) => {
    try {
        // access will throw error if not exists
        // ENOENT: no such file or directory, access...
        fs.accessSync(directory)
        return fs.lstatSync(directory).isDirectory()
    } catch {
        return false
    }
}

export const checkLogDirectory = (create = true) => {
    // path to /workspace
    const projectRootPath = path.normalize(path.join(__dirname, "../../.."))

    // /workspace/logs
    const directory = path.resolve(path.join(projectRootPath, "logs"))

    if (existsAndIsDirectory(directory)) {
        return
    }

    if (create) {
        console.log(
            `Log directory not found. Attempting to create log directory at ${directory}`,
        )
        fs.mkdirSync(directory)
    }
}

export const zip = <A, B>(a: A[], b: B[]): [A, B][] =>
    a.map((element, i) => [element, b[i]])

export const isNode = () => typeof (global as any)["window"] === "undefined"
export const isTesting = () =>
    Object.keys(process.env).includes("WALLABY_PRODUCTION")

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

type LogFunction = (message: string) => void

export type TemplateLoggingMethod = (
    literals: TemplateStringsArray,
    ...placeholders: any[]
) => string

export interface FunctionLoggingOptions<TArgs extends any[], TReturn> {
    argSelector?: (...args: TArgs) => any[] | readonly any[]
    resultSelector?: (result: TReturn) => any
    showThis?: boolean
    thisSelector?: (_this: any) => any
}

export type FunctionLoggingMethod = <TArgs extends any[], TReturn>(
    f: (...args: TArgs) => TReturn,
    name: string,
    options?: FunctionLoggingOptions<TArgs, TReturn>,
) => typeof f

// TOOO: Don't do all of the work if the log does not actually get printed out

function _typeHelper(
    literals: TemplateStringsArray,
    ...placeholders: any[]
): string

function _typeHelper<TArgs extends any[], TReturn>(
    f: (...args: TArgs) => TReturn,
    name: string,
    options?: FunctionLoggingOptions<TArgs, TReturn>,
): typeof f

function _typeHelper(..._any: any[]): any {
    throw new Error("Unimplemented")
}

export type LogMethodFunction = typeof _typeHelper

const templateLogMethod = (
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
    if (isWallaby()) {
        console.log(str)
    } else {
        method(str)
    }
    return str
}

const functionLogMethod = (
    method: LogFunction,
    shouldIgnore: boolean | (() => boolean),
): FunctionLoggingMethod => <TArgs extends any[], TReturn>(
    f: (...args: TArgs) => TReturn,
    name: string,
    {
        argSelector = (...args) => args,
        thisSelector = (_this: any) => _this,
        resultSelector = (result: any) => result,
        showThis = false,
    }: FunctionLoggingOptions<TArgs, TReturn> = {},
): typeof f => {
    const shouldIgnoreValue =
        typeof shouldIgnore === "boolean" ? shouldIgnore : shouldIgnore()

    const log = shouldIgnoreValue
        ? undefined
        : templateLogMethod(method, shouldIgnoreValue)
    return function(this: unknown, ...args: TArgs): TReturn {
        if (log) {
            const formattedArgs = argSelector(...args)
            if (showThis) {
                const formattedThis = thisSelector(this)
                log`Calling function ${name} with args ${formattedArgs} and this ${formattedThis}`
            } else {
                log`Calling function ${name} with args ${formattedArgs}`
            }
        }

        const returnValue = f.apply(this, args)
        if (log === undefined) {
            return returnValue
        }

        if ((Promise.resolve(returnValue) as unknown) === returnValue) {
            log`Called function ${name} but returned promise return value... resolving`
            const promise = (returnValue as unknown) as Promise<TReturn>
            promise.then(value => {
                const formattedValue = resultSelector(value)
                log`Returned asynchronous return value ${formattedValue} from function ${name}`
            })
        } else {
            const formattedValue = resultSelector(returnValue)
            log`Returned synchronous return value ${formattedValue} from function ${name}`
        }

        return returnValue
    }
}

export const logMethod = (
    logger: pino.Logger,
    method: "debug" | "error" | "info" | "warn",
): LogMethodFunction => (param: any, ...args: any[]) => {
    const shouldIgnore = () => logger.levelVal > pino.levels.values[method]
    const logFn = (message: string) => logger[method](message)

    if (typeof param === "function") {
        return functionLogMethod(logFn, shouldIgnore)(
            param,
            args[0],
            args[1] ?? undefined,
        ) as any
    }
    return templateLogMethod(logFn, shouldIgnore)(param, ...args) as any
}
