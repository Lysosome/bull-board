import {
  BullBoardRequest,
  ControllerHandlerReturnType,
  JobCounts,
  JobStatus,
} from '../../typings/app';
import { BaseAdapter } from '../queueAdapters/base';

async function getPageForDatetime(
  _req: BullBoardRequest,
  queue: BaseAdapter,
  statuses: JobStatus[],
  datetime: number,
  counts: JobCounts,
  jobsPerPage: number
): Promise<ControllerHandlerReturnType> {
  const pageNumber = await queue.getPageForDatetime(statuses, datetime, counts, jobsPerPage);

  return {
    status: 200,
    body: {
      pageNumber,
    },
  };
}

function customQueueProvider(
  next: (
    req: BullBoardRequest,
    queue: BaseAdapter,
    statuses: JobStatus[],
    datetime: number,
    counts: JobCounts,
    jobsPerPage: number
  ) => Promise<ControllerHandlerReturnType>,
  {
    skipReadOnlyModeCheck = false,
  }: {
    skipReadOnlyModeCheck?: boolean;
  } = {}
) {
  return async (req: BullBoardRequest): Promise<ControllerHandlerReturnType> => {
    const { queueName, statuses, datetime, counts, jobsPerPage } = req.query;

    const queue = req.queues.get(queueName);
    if (!queue || !statuses || !datetime || !counts || !jobsPerPage) {
      return { status: 404, body: { error: 'Not all required params provided' } };
    } else if (queue.readOnlyMode && !skipReadOnlyModeCheck) {
      return {
        status: 405,
        body: { error: 'Method not allowed on read only queue' },
      };
    }

    return next(req, queue, statuses, datetime, counts, jobsPerPage);
  };
}

export const getPageForDatetimeHandler = customQueueProvider(getPageForDatetime);
