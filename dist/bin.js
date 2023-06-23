#!/usr/bin/env node
import { env } from './env.js';
import * as commands from './commands.js';
const [, , arg0, ...args] = process.argv;
if (!(arg0 in commands)) {
    if (arg0 && arg0 !== 'help') {
        console.log(`Unrecognized command "${arg0}"`);
        console.log();
    }
    console.log('Environment variables:');
    for (const [name, value] of Object.entries(env)) {
        console.log(`\t${name}=${value ? '✅' : '❌'}`);
    }
    console.log();
    console.log('Available commands:');
    for (const cmd in commands) {
        console.log(`\t${cmd} ${
        // get function source code
        String(
        // @ts-expect-error
        commands[cmd])
            // match first arguments text "(arg0, arg1)"
            .match(/\(([\w\s\,]*)\)/)?.[1]
            // get arguments and wrap each with "<" and ">"
            .trim()
            .split(/,\s*/)
            .filter(Boolean)
            .map((arg) => `<${arg}>`)
            .join(' ')}`);
    }
    console.log();
    process.exit(1);
}
try {
    // @ts-expect-error
    const res = await commands[arg0](...args);
    if (res != null) {
        console.log(typeof res === 'object' ? JSON.stringify(res, null, ' ') : String(res));
    }
}
catch (err) {
    console.error(err);
    process.exit(1);
}
