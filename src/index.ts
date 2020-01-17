import pino from "pino"
import {
    checkLogDirectory,
    isNode,
    isTesting,
    logMethod,
    LogMethodFunction,
} from "./util"

export const initialize = () => {
    // best way to check if we're in node
    if (isNode() && !isTesting()) {
        checkLogDirectory()
    }

    // TODO: figure out a proper way to store this
    const logger = pino({
        level: "debug",
        prettyPrint: {
            colorize: true,
            levelFirst: true,
        },
    })
    return logger
}
export const logger = initialize()

export interface Logger {
    debug: LogMethodFunction
    error: LogMethodFunction
    info: LogMethodFunction
    warn: LogMethodFunction
}

export const getLogger = (file: string): Logger => {
    if (!logger) {
        throw new Error(
            `Logger was not initialized. Make sure to call initializeLogger!`,
        )
    }

    const child = logger.child({file})
    return {
        debug: logMethod(child, "debug"),
        error: logMethod(child, "error"),
        info: logMethod(child, "info"),
        warn: logMethod(child, "warn"),
    }
}
