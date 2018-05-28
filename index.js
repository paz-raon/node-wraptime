'use strict';

const prettyHrtime = require('pretty-hrtime');
const NS_PER_SEC = 1e9;

function resolve(thisArg, func, args, elapsed, ms_elapsed, result, callback) {
    if (callback == undefined) {
        console.log(`>> resolve, ${(thisArg && thisArg.constructor) ? thisArg.constructor.name : 'null'}#${func.name}: ${prettyHrtime(elapsed)} elapsed.`);
    } else {
        callback({ thisArg: thisArg, func: func, args: args, time: prettyHrtime(elapsed), ms_time: ms_elapsed, result: result });
    }
}

function reject(thisArg, func, args, elapsed, ms_elapsed, error, callback) {
    if (callback == undefined) {
        console.log(`>> reject, ${(thisArg && thisArg.constructor) ? thisArg.constructor.name : 'null'}#${func.name}: ${prettyHrtime(elapsed)} elapsed.`);
    } else {
        callback({ thisArg: thisArg, func: func, args: args, time: prettyHrtime(elapsed), ms_time: ms_elapsed, error: error });
    }
}

module.exports = {
    wrapAsync: function(thisArg, func, resolveCallback) {
        let asyncF = async function() {
            let start = process.hrtime();
            let r = await func.apply(thisArg, arguments);
            let elapsed = process.hrtime(start);
            let ms_elapsed = ((elapsed[0] * NS_PER_SEC) + elapsed[1]) / 1e6;

            resolve(thisArg, func,
                (arguments.length === 1) ? [arguments[0]] : Array.apply(null, arguments),
                elapsed, ms_elapsed, r,
                resolveCallback);

            return r;
        };

        return asyncF;
    },

    wrapAsyncWithErr: function(thisArg, func, resolveCallback, rejectCallback) {
        let asyncF = async function() {
            let start = process.hrtime(), isResolve = true;
            let r, elapsed, ms_elapsed;

            try {
                r = await func.apply(thisArg, arguments);
            } catch (e) {
                r = e;
                isResolve = false
            } finally {
                elapsed = process.hrtime(start);
                ms_elapsed = ((elapsed[0] * NS_PER_SEC) + elapsed[1]) / 1e6;
            }

            if (isResolve) {
                resolve(thisArg, func,
                    (arguments.length === 1) ? [arguments[0]] : Array.apply(null, arguments),
                    elapsed, ms_elapsed, r,
                    resolveCallback);

                return r;
            }

            reject(thisArg, func,
                (arguments.length === 1) ? [arguments[0]] : Array.apply(null, arguments),
                elapsed, ms_elapsed, r,
                rejectCallback);

            throw r;
        };

        return asyncF;
    }
};