/* eslint-disable @typescript-eslint/no-explicit-any */

import {FunctionLoggingOptions} from "./function"

export const zip = <A, B>(a: A[], b: B[]): [A, B][] =>
    a.map((element, i) => [element, b[i]])
export const isTesting = () =>
    !!process.env.JEST_WORKER_ID || !!process.env.WALLABY_PRODUCTION

export type LogFunction = (message: string) => void

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
