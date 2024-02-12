import { Job, Queue } from 'bullmq';
import {
  JobCleanStatus,
  JobCounts,
  JobStatus,
  QueueAdapterOptions,
  Status,
} from '../../typings/app';
import { STATUSES } from '../constants/statuses';
import { BaseAdapter } from './base';
import { getPagination } from '../handlers/queues';

export class BullMQAdapter extends BaseAdapter {
  constructor(private queue: Queue, options: Partial<QueueAdapterOptions> = {}) {
    super(options);
  }

  public async getRedisInfo(): Promise<string> {
    const client = await this.queue.client;
    return client.info();
  }

  public getName(): string {
    return `${this.prefix}${this.queue.name}`;
  }

  public async clean(jobStatus: JobCleanStatus, graceTimeMs: number): Promise<void> {
    await this.queue.clean(graceTimeMs, 1000, jobStatus);
  }

  public getJob(id: string): Promise<Job | undefined> {
    return this.queue.getJob(id);
  }

  public getJobs(jobStatuses: JobStatus[], start?: number, end?: number): Promise<Job[]> {
    return this.queue.getJobs(jobStatuses, start, end);
  }

  /*
  Custom handler that handles the following potential special settings for the queue:
  1) collapse consecutive jobs with same name
  2) filter by job name (exact match) - incompatible with 1)
  3) filter before certain datetime
  */
  public async getJobsCustom({
    statuses,
    counts,
    currentPage,
    jobsPerPage,
    after,
    collapseSameNameJobs = false,
    filterJobName,
  }: {
    statuses: JobStatus[];
    counts: JobCounts;
    currentPage: number;
    jobsPerPage: number;
    after?: number;
    collapseSameNameJobs: boolean;
    filterJobName?: string;
  }): Promise<{
    jobs: Job[];
    pagination: { pageCount: number; range: { start: number; end: number } };
  }> {
    // vanilla case: no special settings
    if (!collapseSameNameJobs && !filterJobName) {
      const pagination = getPagination(statuses, counts, currentPage, jobsPerPage);
      return {
        jobs: await this.queue.getJobs(statuses, pagination.range.start, pagination.range.end),
        pagination,
      };
    }
    // filterJobName takes precedence over collapseSameNameJobs
    if (filterJobName) {
      return await this.getFilteredJobs(
        statuses,
        counts,
        currentPage,
        jobsPerPage,
        filterJobName,
        after
      );
    }
    // collapseSameNameJobs
    if (collapseSameNameJobs) {
      return await this.getCollapsedJobs(statuses, counts, currentPage, jobsPerPage, after);
    }

    throw new Error('Invalid settings');
  }

  /*
  Sometimes we want to jump to a specific page for a specific datetime, but we don't know the page
  that would correspond to that datetime. This function will return the first page that would contain 
  a job with a timestamp equal to or less than the given datetime.
  */
  public async getPageForDatetime(
    statuses: JobStatus[],
    datetime: number,
    counts: JobCounts,
    jobsPerPage: number
  ): Promise<number> {
    const isLatestStatus = statuses.length > 1;
    const total = isLatestStatus
      ? statuses.reduce((total, status) => total + Math.min(counts[status], jobsPerPage), 0)
      : counts[statuses[0]];

    // determine end by iterating over jobs
    const jobsPerIteration = 1024;
    let end = 0;

    while (end < total) {
      const jobsToFetch = Math.min(total - end, jobsPerIteration);
      const fetchedJobs = await this.getJobs(statuses, end, end + jobsToFetch);
      // check fetchedJobs for timestamp
      for (const [index, job] of fetchedJobs.entries()) {
        if (job.timestamp <= datetime) {
          return Math.ceil((end + index + 1) / jobsPerPage);
        }
      }
      end += fetchedJobs.length;
    }

    return end;
  }

  /*
  Seek out jobs with the exact name as the filter, discarding all others. We pull jobs, starting from the
  currentPage, until we reach the end or we have reached jobsPerPage jobs.
  */
  private async getFilteredJobs(
    statuses: JobStatus[],
    counts: JobCounts,
    currentPage: number,
    jobsPerPage: number,
    filterJobName: string,
    after?: number
  ): Promise<{
    jobs: Job[];
    pagination: { pageCount: number; range: { start: number; end: number } };
  }> {
    const isLatestStatus = statuses.length > 1;
    const total = isLatestStatus
      ? statuses.reduce((total, status) => total + Math.min(counts[status], jobsPerPage), 0)
      : counts[statuses[0]];
    const start = after || (isLatestStatus ? 0 : (currentPage - 1) * jobsPerPage);

    // determine end by iterating over jobs
    const jobsPerIteration = 1024;
    const maxJobsToSearch = 1024 * 20; // upper limit of jobs to search through
    let end = start;
    const jobs: Job[] = [];

    while (jobs.length < jobsPerPage && end < total && end - start < maxJobsToSearch) {
      const jobsToFetch = Math.min(total - end, jobsPerIteration);
      const fetchedJobs = await this.getJobs(statuses, end, end + jobsToFetch);
      // Add jobsToFetch until we have reached jobsPerPage jobs
      let jobsSeen = 0;
      fetchedJobs.forEach((job) => {
        if (jobs.length >= jobsPerPage) return; // we're done
        jobsSeen++;
        if (job.name === filterJobName) {
          jobs.push(job);
        }
      });
      end += jobsSeen;
    }

    return {
      jobs,
      pagination: {
        pageCount: end === total ? currentPage : Math.ceil(total / jobsPerPage), // we only know when we're finished
        range: { start, end },
      },
    };
  }

  /*
  We often get large amounts of consecutive jobs with the same name, so this allows you to collapse
  all consecutive jobs with the same name into a single row. We pull jobs, starting from the currentPage,
  until we reach the end or we have reached jobsPerPage non-consecutive different names.
  */
  private async getCollapsedJobs(
    statuses: JobStatus[],
    counts: JobCounts,
    currentPage: number,
    jobsPerPage: number,
    after?: number
  ): Promise<{
    jobs: Job[];
    pagination: { pageCount: number; range: { start: number; end: number } };
  }> {
    const isLatestStatus = statuses.length > 1;
    const total = isLatestStatus
      ? statuses.reduce((total, status) => total + Math.min(counts[status], jobsPerPage), 0)
      : counts[statuses[0]];

    const start = after || (isLatestStatus ? 0 : (currentPage - 1) * jobsPerPage);
    const pageCount = isLatestStatus ? 1 : Math.ceil(total / jobsPerPage); // upper limit (we don't really know)

    // determine end by iterating over jobs
    // use exponential search to find end, number of jobs starts at 1 and doubles each iteration, max 1024
    const maxJobsPerIteration = 1024;
    let end = start;
    const jobs: Job[] = [];
    let currentConsecutiveJobName = '';
    let jobsFound = 0;

    while (jobsFound < jobsPerPage && end < total) {
      const jobsToFetch = Math.min(total - end, jobsFound + maxJobsPerIteration - jobsPerPage);
      const fetchedJobs = await this.getJobs(statuses, end, end + jobsToFetch);
      // Add jobsToFetch until we have reached jobsPerPage non-consecutive different names
      let jobsAddedInBatch = 0;
      fetchedJobs.forEach((job) => {
        if (job.name !== currentConsecutiveJobName) {
          // new name
          if (jobsFound >= jobsPerPage) return; // we're done
          jobs.push(job);
          jobsAddedInBatch++;
          currentConsecutiveJobName = job.name;
          jobsFound++;
        } else {
          // continuation of the same name
          jobs.push(job);
          jobsAddedInBatch++;
        }
      });
      end += jobsAddedInBatch;
    }

    return {
      jobs,
      pagination: {
        pageCount: end === total ? currentPage : pageCount, // we only know when we're finished
        range: { start, end },
      },
    };
  }

  public getJobCounts(...jobStatuses: JobStatus[]): Promise<JobCounts> {
    return this.queue.getJobCounts(...jobStatuses) as unknown as Promise<JobCounts>;
  }

  public getJobLogs(id: string): Promise<string[]> {
    return this.queue.getJobLogs(id).then(({ logs }) => logs);
  }

  public isPaused(): Promise<boolean> {
    return this.queue.isPaused();
  }

  public pause(): Promise<void> {
    return this.queue.pause();
  }

  public resume(): Promise<void> {
    return this.queue.resume();
  }

  public empty(): Promise<void> {
    return this.queue.drain();
  }

  public async promoteAll(): Promise<void> {
    // since bullmq 4.6.0
    if (typeof this.queue.promoteJobs === 'function') {
      await this.queue.promoteJobs();
    } else {
      const jobs = await this.getJobs([STATUSES.delayed]);
      await Promise.all(jobs.map((job) => job.promote()));
    }
  }

  public getStatuses(): Status[] {
    return [
      STATUSES.latest,
      STATUSES.active,
      STATUSES.waiting,
      STATUSES.waitingChildren,
      STATUSES.prioritized,
      STATUSES.completed,
      STATUSES.failed,
      STATUSES.delayed,
      STATUSES.paused,
    ];
  }

  public getJobStatuses(): JobStatus[] {
    return [
      STATUSES.active,
      STATUSES.waiting,
      STATUSES.waitingChildren,
      STATUSES.prioritized,
      STATUSES.completed,
      STATUSES.failed,
      STATUSES.delayed,
      STATUSES.paused,
    ];
  }
}
