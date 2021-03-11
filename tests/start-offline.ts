import { ChildProcessWithoutNullStreams, spawn } from 'child_process';

let serverProcess: ChildProcessWithoutNullStreams;

global.beforeAll(async (done) => {
  jest.setTimeout(25000);
  await startSLSOffline();
  done();
}, 40000);

global.afterAll((done) => {
  killSLSOffline();
  done();
}, 40000);

const startSLSOffline = (): Promise<unknown> =>
  new Promise<void>((resolve, reject) => {
    serverProcess = spawn('yarn', ['offline'], { cwd: '../server' });

    console.log(`Serverless: Offline started with PID : ${serverProcess.pid}`);

    serverProcess.stdout.on('data', (data) => {
      if (data.includes('[HTTP] server ready')) {
        console.log(data.toString().trim());
        resolve();
      }
    });

    serverProcess.stderr.on('data', (errData) => {
      console.error(errData);
      reject(`Error starting Serverless Offline:\n${errData}`);
    });
  });

const killSLSOffline = (): void => {
  if (serverProcess) {
    serverProcess.kill();
    console.log('Serverless: Offline stopped');
  } else {
    throw new Error(`Could not kill Serverless Offline`);
  }
};
