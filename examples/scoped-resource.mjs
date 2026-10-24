import net from 'node:net';
import { withOwnedResource } from '../skills/task-resource-guard/scripts/owned-resource.mjs';

// Synthetic demonstration: creates a new private loopback listener, does no
// external networking, awaits the work, then awaits its supported close method.
await withOwnedResource({
  create: async () => {
    const server = net.createServer(socket => socket.end());
    try {
      await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
      return server;
    } catch (error) {
      if (server.listening) await new Promise(resolve => server.close(resolve));
      throw error;
    }
  },
  close: server => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())),
}, async server => {
  if (!server.listening) throw Error('Private example resource is not ready');
  await new Promise(resolve => setImmediate(resolve));
});
console.log('Private example resource closed normally.');
