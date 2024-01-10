/* eslint-disable no-console */
import { ExpressAdapter } from '@lysosome/bull-board-express';
import { Queue as QueueMQ, Worker } from 'bullmq';
import express from 'express';
import { createBullBoard } from './packages/api/src';
import { BullMQAdapter } from './packages/api/src/queueAdapters/bullMQ';

const redisOptions = {
  port: 6379,
  host: 'localhost',
  password: '',
};

const sleep = (t: number) => new Promise((resolve) => setTimeout(resolve, t * 1000));

const createQueueMQ = (name: string) => new QueueMQ(name, { connection: redisOptions });

async function setupBullMQProcessor(queueName: string) {
  new Worker(
    queueName,
    async (job) => {
      for (let i = 0; i <= 100; i++) {
        await sleep(Math.random() / 10);
        await job.updateProgress(i);
        await job.log(`Processing job at interval ${i}`);

        if (Math.random() * 500 < 1) throw new Error(`Random error ${i}`);
      }

      return { jobId: `This is the return value of job (${job.id})` };
    },
    { connection: redisOptions }
  );
}

const run = async () => {
  const app = express();

  const exampleBullMq = createQueueMQ('ExampleBullMQ');

  await setupBullMQProcessor(exampleBullMq.name); // needed only for example proposes

  app.use('/add', (req, res) => {
    const opts = req.query.opts || ({} as any);

    if (opts.delay) {
      opts.delay = +opts.delay * 1000; // delay must be a number
    }

    if (opts.priority) {
      opts.priority = +opts.priority;
    }

    exampleBullMq.add(`${req.query.title}`, { title: req.query.title }, opts);

    res.json({
      ok: true,
    });
  });

  const serverAdapter: any = new ExpressAdapter();
  serverAdapter.setBasePath('/ui');

  createBullBoard({
    queues: [new BullMQAdapter(exampleBullMq)],
    serverAdapter,
  });

  app.use('/ui', serverAdapter.getRouter());

  app.listen(3000, () => {
    console.log('Running on 3000...');
    console.log('For the UI, open http://localhost:3000/ui');
    console.log('Make sure Redis is running on port 6379 by default');
    console.log('To populate the queue, run:');
    console.log('  curl http://localhost:3000/add?title=Example');
    console.log('To populate the queue with custom options (opts), run:');
    console.log('  curl http://localhost:3000/add?title=Test&opts[delay]=10');
  });
};

run().catch((e) => console.error(e));
