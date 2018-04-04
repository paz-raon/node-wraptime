node-wraptime
============

This package measures the execution time of a function.

Usage
-----

```javascript
const wrapAsync = require('node-wraptime').wrapAsync;

async function f() { return 1; }

wrapAsync(null, f)();

or

class Klass {
    constructor() {
        this.f = wrapAsync(this, this.f);
    }

    async f() { return 1; };
}

var k = new Klass();
k.f();
```

> # wrapAsync(thisArg, func, [customLoggingFunc])

## Parameters

    thisArg
        The value of this provided for the call to func.

    func
        The function you want to measure.

    customLoggingFunc

        ** example **
        ({ thisArg, func, result, args, time }) => {
            // thisArgs: arguments[0] of wrapAsync
            // func: arguments[1] of wrapAsync
            // result: return value of func
            // args: arguments of func
            // time: execution time
        }

    Return value
        return value of func