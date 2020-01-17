/* eslint-disable @typescript-eslint/no-explicit-any */

import {templateLogMethod} from "./template"
import {LogFunction} from "./util"

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

export const functionLogMethod = (
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
