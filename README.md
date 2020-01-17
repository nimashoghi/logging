# Logging

#### A simple logging package for TypeScript

## Getting Started

### Installation

```
yarn add @nimashoghi/logging
```

### Usage

In the first file that gets executed, write the following at the top:

```ts
import {Logging} from "@nimsahoghi/logging"
Logging.init() // you can also pass pino options to `init`

// ... other code here
```

Then, in any file you want to use logging in, you can do the following:

```ts
import {Logging} from "@nimashoghi/logging"
const logger = Logging.logger({__filename}) // setting filename here shows the source of your logs

// Template string logging: This logs the interpolated string that you give it. It uses node's `inspect` utility to pretty print objects.
const world = {name: "World"}
logger.debug`Hello ${world}`

// Function logging: This logs all the calls and returns of this function
const myFunction = logger.debug(() => {}, "myFunction)
```
