/* @flow */
/* global child_process$spawnOpts */

import * as constants from '../constants.js';
import BlockingQueue from './blocking-queue.js';
import {ProcessSpawnError, ProcessTermError} from '../errors.js';
import {promisify} from './promise.js';

// STEMN import
import {benchmark, debug} from '../cli/logging.js';
var opentracing = require('opentracing');
import {getTracer} from '../cli/tracing.js';

const child = require('child_process');

export const queue = new BlockingQueue('child', constants.CHILD_CONCURRENCY);

// TODO: this uid check is kinda whack
let uid = 0;

export const exec = promisify(child.exec);

export function forkp(program: string, args: Array<string>, opts?: Object): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = child.fork(program, args, opts);

    proc.on('error', error => {
      reject(error);
    });

    proc.on('close', exitCode => {
      resolve(exitCode);
    });
  });
}

export function spawnp(program: string, args: Array<string>, opts?: Object): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = child.spawn(program, args, opts);

    proc.on('error', error => {
      reject(error);
    });

    proc.on('close', exitCode => {
      resolve(exitCode);
    });
  });
}

const spawnedProcesses = {};

export function forwardSignalToSpawnedProcesses(signal: string) {
  for (const key of Object.keys(spawnedProcesses)) {
    spawnedProcesses[key].kill(signal);
  }
}

type ProcessFn = (
  proc: child_process$ChildProcess,
  update: (chunk: string) => void,
  reject: (err: mixed) => void,
  done: () => void,
) => void;

/* [STEMN]: Trace for subprocesses ie. script files */
export function spawn(
  program: string,
  args: Array<string>,
  opts?: child_process$spawnOpts & {detached?: boolean, process?: ProcessFn} = {},
  onData?: (chunk: Buffer | string) => void,
): Promise<string> {
  const key = opts.cwd || String(++uid);
  return queue.push(
    key,
    (): Promise<string> =>
      new Promise((resolve, reject) => {
        const proc = child.spawn(program, args, opts);
        spawnedProcesses[key] = proc;

        console.error("Retrieving carrier: " + program);
        console.error(process.env['YARN_JAEGER_TRACE']);
        const carrier = JSON.parse(process.env['YARN_JAEGER_TRACE']);

        let child_tracer = getTracer();
        console.error("New tracer spawned:\t\t" + child_tracer._process.uuid);

        const context = child_tracer.extract(opentracing.FORMAT_TEXT_MAP, carrier);

        let child_span = child_tracer.startSpan(program, { childOf: context });
        child_span.setTag("cwd", key);

        

        let first_timestamp = (new Date() / 1000);
        let trace = "";
        let duration = "-";
        let cwd = key;

        // if we ever decide to do parent-child relationships
        // trace += `${process.ppid } spawned ${process.pid} spawned ${proc.pid}`

        trace += `[${proc.pid}],`;
        trace += `BEGIN,`;
        trace += `[${program}],`;
        //trace += `[${first_timestamp}],`;
        trace += `[${duration}],`;
        trace += `[${cwd}]\n`;

        // only log it if the subprocess has ".sh"
        if(program.indexOf(".sh") > -1) {
          debug(trace);
        }

        let processingDone = false;
        let processClosed = false;
        let err = null;

        let stdout = '';

        proc.on('error', err => {
          if (err.code === 'ENOENT') {
            reject(new ProcessSpawnError(`Couldn't find the binary ${program}`, err.code, program));
          } else {
            reject(err);
          }
        });

        function updateStdout(chunk: string) {
          stdout += chunk;
          if (onData) {
            onData(chunk);
          }
        }

        function finish() {
          delete spawnedProcesses[key];


          /* [STEMN]: Trace script when finishing execution */
          let final_timestamp = ((new Date() / 1000)).toFixed(3);
          let duration = (final_timestamp - first_timestamp).toFixed(3);
          let trace = "";
          trace += `[${proc.pid}],`;
          trace += `END,`;
          trace += `[${program}],`;
          //trace += `[${final_timestamp}],`;
          trace += `[${duration}],`;
          trace += `[${cwd}]\n`;

        // only log it if the subprocess has ".sh"
        if(program.indexOf(".sh") > -1) {
          debug(trace);

          // Add the finished process to the stack for printing
          let csv_line = "";
          csv_line += `${proc.pid},`;
          csv_line += `\"${program}\",`
          csv_line += `${first_timestamp},`
          csv_line += `${duration},`
          csv_line += `\"${key}\"\n`;

          benchmark(csv_line);

        }

          if (err) {
            reject(err);
          } else {
            resolve(stdout.trim());
          }
        }

        if (typeof opts.process === 'function') {
          opts.process(proc, updateStdout, reject, function() {
            if (processClosed) {
              finish();
            } else {
              processingDone = true;
            }
          });
        } else {
          if (proc.stderr) {
            proc.stderr.on('data', updateStdout);
          }

          if (proc.stdout) {
            proc.stdout.on('data', updateStdout);
          }

          processingDone = true;
        }

        proc.on('close', (code: number, signal: string) => {
          if (signal || code >= 1) {
            err = new ProcessTermError(
              [
                'Command failed.',
                signal ? `Exit signal: ${signal}` : `Exit code: ${code}`,
                `Command: ${program}`,
                `Arguments: ${args.join(' ')}`,
                `Directory: ${opts.cwd || process.cwd()}`,
                `Output:\n${stdout.trim()}`,
              ].join('\n'),
            );
            err.EXIT_SIGNAL = signal;
            err.EXIT_CODE = code;
          }

          /* [STEMN]: Close the tracers here */
          if (processingDone || err) {
            child_span.finish();
            console.error("Closing child tracer:\t\t" + child_tracer._process.uuid);
            child_tracer.close();
            finish();
          } else {
            child_span.finish();
            console.error("Closing child tracer:\t\t" + child_tracer._process.uuid);
            child_tracer.close();
            processClosed = true;
          }
        });

      }),
  );
}
