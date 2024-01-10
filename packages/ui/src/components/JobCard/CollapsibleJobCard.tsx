/*
Special job card header that represents multiple collapsed job cards.
In the header itself, shows the name of the job, the number of jobs collapsed,
and statistics on the min, max, and average runtime of the collapsed jobs.
*/

import React from 'react';
import { AppJob } from '@lysosome/bull-board-api/dist/typings/app';
import s from './JobCard.module.css';
import { Card } from '../Card/Card';
import { Button } from '../Button/Button';
import { CollapsibleCardTimeline } from './Timeline/CollapsibleCardTimeline';

interface CollapsibleJobCardProps {
  jobs: AppJob[];
  isExpanded: boolean;
  setExpanded: (expanded: boolean) => void;
}

// nice formatting function, given a number of milliseconds, returns a string
// with the number of hours, minutes, and seconds. If the number of hours or minutes
// is 0, they are not included in the string.
const formatRuntime = (runtime: number) => {
  const hours = Math.floor(runtime / (60 * 60 * 1000));
  const minutes = Math.floor((runtime % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((runtime % (60 * 1000)) / 1000);
  const ms = Math.round(runtime % 1000);
  const parts = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (seconds > 0 && hours === 0) {
    parts.push(`${seconds}s`);
  }
  if (ms > 0 && minutes === 0 && hours === 0) {
    parts.push(`${ms}ms`);
  }
  return parts.join(', ');
};

export const CollapsibleJobCard = ({ jobs, isExpanded, setExpanded }: CollapsibleJobCardProps) => {
  const numJobs = jobs.length;
  const jobName = jobs[0].name;
  const jobRuntimes = jobs
    .filter((job) => job.finishedOn && job.processedOn)
    .map((job) => (job.finishedOn || 0) - (job.processedOn || 0));
  const minRuntime = Math.min(...jobRuntimes);
  const maxRuntime = Math.max(...jobRuntimes);
  const avgRuntime = jobRuntimes.reduce((a, b) => a + b, 0) / jobRuntimes.length;
  const firstAddedTime = jobs[0].timestamp;
  const latestFinishedTime = jobs.reduce((a, b) => Math.max(a, b.finishedOn || 0), 0);

  return (
    <Card className={s.collapsibleCard}>
      <div className={s.sideInfo}>
        <span>{numJobs} jobs</span>
        <CollapsibleCardTimeline
          firstAddedTime={firstAddedTime}
          latestFinishedTime={latestFinishedTime}
        />
      </div>
      <div className={s.contentWrapper}>
        <div className={s.title}>
          <h4>{jobName}</h4>
          <Button className={s.expandButton} onClick={() => setExpanded(!isExpanded)}>
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
        <div className={s.collapsibleContent}>
          <div>
            <b>Min:</b> {formatRuntime(minRuntime)}
          </div>
          <div>
            <b>Avg:</b> {formatRuntime(avgRuntime)}
          </div>
          <div>
            <b>Max:</b> {formatRuntime(maxRuntime)}
          </div>
        </div>
      </div>
    </Card>
  );
};
