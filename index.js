'use strict';

const prettyHrtime = require('pretty-hrtime');

function resolve(thisArg, func, args, elapsed, result, callback) {
    if (callback == undefined) {
        console.log(`>> resolve, ${(thisArg && thisArg.constructor) ? thisArg.constructor.name : 'null'}#${func.name}: ${prettyHrtime(elapsed)} elapsed.`);
    } else {
        callback({ thisArg: thisArg, func: func, args: args, time: prettyHrtime(elapsed), result: result });
    }
}

function reject(thisArg, func, args, elapsed, error, callback) {
    if (callback == undefined) {
        console.log(`>> reject, ${(thisArg && thisArg.constructor) ? thisArg.constructor.name : 'null'}#${func.name}: ${prettyHrtime(elapsed)} elapsed.`);
    } else {
        callback({ thisArg: thisArg, func: func, args: args, time: prettyHrtime(elapsed), error: error });
    }
}

module.exports = {
    wrapAsync: function(thisArg, func, resolveCallback) {
        let asyncF = async function() {
            let start = process.hrtime();
            let r = await func.apply(thisArg, arguments);
            let elapsed = process.hrtime(start);

            resolve(thisArg, func,
                (arguments.length === 1) ? [arguments[0]] : Array.apply(null, arguments),
                elapsed, r,
                resolveCallback);

            return r;
        };

        return asyncF;
    },

    wrapAsyncWithErr: function(thisArg, func, resolveCallback, rejectCallback) {
        let asyncF = async function() {
            let start = process.hrtime(), isResolve = true;
            let r, elapsed;

            try {
                r = await func.apply(thisArg, arguments);
            } catch (e) {
                r = e;
                isResolve = false
            } finally {
                elapsed = process.hrtime(start);
            }

            if (isResolve) {
                resolve(thisArg, func,
                    (arguments.length === 1) ? [arguments[0]] : Array.apply(null, arguments),
                    elapsed, r,
                    resolveCallback);

                return r;
            }

            reject(thisArg, func,
                (arguments.length === 1) ? [arguments[0]] : Array.apply(null, arguments),
                elapsed, r,
                rejectCallback);

            throw r;
        };

        return asyncF;
    }
};