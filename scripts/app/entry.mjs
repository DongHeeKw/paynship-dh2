export function appCommand(args, platform = process.platform) {
  if (args[0] !== 'app') return { mode: 'production', script: 'node_modules/next/dist/bin/next', args: ['start', ...args] };
  if (args.length !== 1) throw new Error('The local app command does not accept additional options.');
  if (platform !== 'linux') throw new Error('The isolated sample app uses Linux user services. Use npm run dev for other platforms.');
  return { mode: 'sample', script: 'scripts/preview/start-retailer-preview.mjs', args: [], url: 'http://127.0.0.1:3002' };
}
