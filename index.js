const prettyHrtime = require('pretty-hrtime');

function logging(thisArg, func, args, result, elapsed, logger) {
    if (logger == undefined) {
        console.log(`>> ${(thisArg && thisArg.constructor) ? thisArg.constructor.name : 'null'}#${func.name}: ${prettyHrtime(elapsed)} elapsed.`);
    } else {
        logger({ thisArg: thisArg, func: func, args: args, result: result, time: prettyHrtime(elapsed) });
    }
}

module.exports = {
    wrapAsync: function(thisArg, func, logger) {
        let asyncF = async function() {
            let start = process.hrtime();
            let result = await func.apply(thisArg, arguments);
            let elapsed = process.hrtime(start);

            logging(thisArg, 
                func, 
                (arguments.length === 1) ? [arguments[0]] : Array.apply(null, arguments), 
                result, 
                elapsed, 
                logger);

            return result;
        };

        return asyncF;
    }
};