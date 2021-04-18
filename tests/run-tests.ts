import { ChildProcessWithoutNullStreams, spawn, execSync } from 'child_process';
import kill from 'tree-kill';

let serverProcess: ChildProcessWithoutNullStreams;

const sleep = async (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const startSLSOffline = (): Promise<unknown> =>
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  new Promise<void>((resolve, _reject) => {
    serverProcess = spawn('yarn', ['start:test'], {
      cwd: '../server',
    });

    console.log(`Serverless: Offline started with PID : ${serverProcess.pid}`);

    serverProcess.stdout.on('data', (data) => {
      if (data.includes('Offline [http for websocket] listening on')) {
        console.log('Serverless: Offline ready');
        serverProcess.stdout.removeAllListeners();
        resolve();
      }
    });

    serverProcess.stderr.on('data', (errData: Buffer) => {
      console.error(errData.toString());
    });
  });

const killSLSOffline = (): void => {
  if (serverProcess) {
    serverProcess.stdout.pause();
    serverProcess.stderr.pause();
    kill(serverProcess.pid);
    console.log('Serverless: Offline stopped');
  } else {
    throw new Error(`Could not kill Serverless Offline`);
  }
};

const runTest = async (): Promise<void> => {
  await startSLSOffline();

  let status = 0;
  try {
    let args = '';
    if (process.argv.length > 2) {
      args = process.argv.slice(2).join(' ');
    }

    execSync(`yarn jest ${args}`, { stdio: 'inherit' });
  } catch (err) {
    console.error(err);
    status = err.status ?? 1;
  }

  await sleep(1000);
  killSLSOffline();

  await sleep(1000);
  process.exit(status);
};

runTest();
