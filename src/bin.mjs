import { env, isDebug } from './env.mjs';
import * as cmds from './cmds.mjs';

if (isDebug()) {
  console.debug = () => {
    // noop
  };
}

const [, , arg0, ...args] = process.argv;
if (!(arg0 in cmds)) {
  if (arg0 !== '' && arg0 !== 'help') {
    console.log(`Unrecognized command "${arg0}"`);
    console.log();
  }

  console.log('Environment variables:');
  for (const name of Object.keys(env)) {
    console.log(`\t${name}`);
  }
  console.log();
  console.log('Available commands:');
  for (const cmd in cmds) {
    console.log(
      `\t${cmd} ${
        // get function source code
        String(
          // @ts-expect-error
          cmds[cmd],
        )
          // match first arguments text "(arg0, arg1)"
          .match(/\(([\w\s\,]*)\)/)?.[1]
          // get arguments and wrap each with "<" and ">"
          .trim()
          .split(/,\s*/)
          .filter(Boolean)
          .map((arg) => `<${arg}>`)
          .join(' ')
      }`,
    );
  }

  process.exit(1);
}

(async () => {
  // @ts-expect-error
  const res = await cmds[arg0](...args);
  console.log(
    typeof res === 'object' ? JSON.stringify(res, undefined, ' ') : String(res),
  );
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
