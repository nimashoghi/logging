/* eslint-disable @typescript-eslint/no-explicit-any */

import pino from "pino"
import {functionLogMethod} from "./function"
import {templateLogMethod} from "./template"
import {LogMethodFunction} from "./util"

const logMethod = (
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

let _logger: pino.Logger | undefined = undefined
const initialize = (options: pino.LoggerOptions = {}) => {
    _logger = pino({
        ...options,
    })
}

const logger = ({
    __filename: file,
    ...data
}: {
    __filename: string
} & pino.Bindings): Record<
    "debug" | "error" | "info" | "warn",
    LogMethodFunction
> => {
    if (!_logger) {
        throw new Error(
            `Logger was not initialized. Make sure to call initializeLogger!`,
        )
    }

    const child = _logger.child({file, ...data})
    return {
        debug: logMethod(child, "debug"),
        error: logMethod(child, "error"),
        info: logMethod(child, "info"),
        warn: logMethod(child, "warn"),
    }
}

export class Logging {
    static init(options?: pino.LoggerOptions) {
        return initialize(options)
    }

    static logger(
        data: {
            __filename: string
        } & pino.Bindings,
    ) {
        if (_logger === undefined) {
            Logging.init({level: process.env.LOG_LEVEL || "info"})
        }

        return logger(data)
    }
}
