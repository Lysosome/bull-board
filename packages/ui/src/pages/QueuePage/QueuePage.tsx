import { STATUSES } from '@lysosome/bull-board-api/dist/src/constants/statuses';
import { AppQueue, JobRetryStatus } from '@lysosome/bull-board-api/dist/typings/app';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { JobCard } from '../../components/JobCard/JobCard';
import { Pagination } from '../../components/Pagination/Pagination';
import { QueueActions } from '../../components/QueueActions/QueueActions';
import { StatusMenu } from '../../components/StatusMenu/StatusMenu';
import { StickyHeader } from '../../components/StickyHeader/StickyHeader';
import { useActiveQueue } from '../../hooks/useActiveQueue';
import { useJob } from '../../hooks/useJob';
import { useQueues } from '../../hooks/useQueues';
import { useSelectedStatuses } from '../../hooks/useSelectedStatuses';
import { links } from '../../utils/links';
import { useSettingsStore } from '../../hooks/useSettings';
import { SelectedStatuses } from '../../../typings/app';
import { CollapsibleJobCard } from '../../components/JobCard/CollapsibleJobCard';
import { usePageMarkersStore } from '../../hooks/usePageMarkers';
import { useLocation } from 'react-router-dom';

export const QueuePage = () => {
  const { t } = useTranslation();
  const selectedStatus = useSelectedStatuses();
  const { actions, queues } = useQueues();
  const { actions: jobActions } = useJob();
  const queue = useActiveQueue({ queues });
  actions.pollQueues();
  const { collapseSameNameJobs } = useSettingsStore((state) => state);
  const { setPageMarker } = usePageMarkersStore((state) => state);

  // useEffect whenever we get queue data; this will set the page marker for the queue
  const location = useLocation();
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const pageIdx = Number(query.get('page')) || 1;
    if (queue?.pagination.range?.start) setPageMarker(pageIdx, queue.pagination.range.start);
    if (queue?.pagination.range?.end) setPageMarker(pageIdx + 1, queue.pagination.range.end);
  }, [queue]);

  if (!queue) {
    return <section>{t('QUEUE.NOT_FOUND')}</section>;
  }

  const status = selectedStatus[queue.name];
  const isLatest = status === STATUSES.latest;

  return (
    <section>
      <StickyHeader
        actions={
          <>
            <div>
              {queue.jobs.length > 0 && !queue.readOnlyMode && (
                <QueueActions
                  queue={queue}
                  actions={actions}
                  status={selectedStatus[queue.name]}
                  allowRetries={
                    (selectedStatus[queue.name] == 'failed' || queue.allowCompletedRetries) &&
                    queue.allowRetries
                  }
                />
              )}
            </div>
            <Pagination pageCount={queue.pagination.pageCount} />
          </>
        }
      >
        <StatusMenu queue={queue} actions={actions} />
      </StickyHeader>
      {collapseSameNameJobs ? (
        <CollapsedNameJobCards queue={queue} selectedStatus={selectedStatus} isLatest={isLatest} />
      ) : (
        queue.jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            jobUrl={links.jobPage(queue.name, `${job.id}`, selectedStatus)}
            status={isLatest && job.isFailed ? STATUSES.failed : status}
            actions={{
              cleanJob: jobActions.cleanJob(queue.name)(job),
              promoteJob: jobActions.promoteJob(queue.name)(job),
              retryJob: jobActions.retryJob(queue.name, status as JobRetryStatus)(job),
              getJobLogs: jobActions.getJobLogs(queue.name)(job),
            }}
            readOnlyMode={queue?.readOnlyMode}
            allowRetries={(job.isFailed || queue.allowCompletedRetries) && queue.allowRetries}
          />
        ))
      )}
    </section>
  );
};

/*
Component that collapses consecutive jobs with the same name into a single card
*/
interface CollapsedNameJobCardsProps {
  queue: AppQueue;
  selectedStatus: SelectedStatuses;
  isLatest: boolean;
}
const CollapsedNameJobCards = ({ queue, selectedStatus, isLatest }: CollapsedNameJobCardsProps) => {
  const { actions: jobActions } = useJob();
  const status = selectedStatus[queue.name];

  // States to hold the lists of jobs to be collapsed and their expanded state
  const [jobLists, setJobLists] = React.useState<AppQueue['jobs'][]>([]);
  const [expanded, setExpanded] = React.useState<boolean[]>([]);

  // Separate the jobs into lists of consecutive jobs with the same name
  useEffect(() => {
    const lists: AppQueue['jobs'][] = [];
    let currentList: AppQueue['jobs'] = [];
    let currentName = '';
    for (const job of queue.jobs) {
      if (job.name !== currentName) {
        currentName = job.name;
        if (currentList.length > 0) {
          lists.push(currentList);
          currentList = [];
        }
      }
      currentList.push(job);
    }
    if (currentList.length > 0) {
      lists.push(currentList);
    }
    setJobLists(lists);
    // setExpanded(lists.map(() => false));
  }, [queue.jobs]);

  return (
    <div>
      {jobLists.map((jobs, i) => (
        <div key={jobs[0].id}>
          <div style={{ paddingBottom: '10px', paddingTop: '10px' }}>
            <CollapsibleJobCard
              jobs={jobs}
              isExpanded={expanded[i]}
              setExpanded={(_expanded) => {
                const newExpanded = [...expanded];
                newExpanded[i] = _expanded;
                setExpanded(newExpanded);
              }}
            />
          </div>
          {expanded[i] &&
            jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                jobUrl={links.jobPage(queue.name, `${job.id}`, selectedStatus)}
                status={isLatest && job.isFailed ? STATUSES.failed : status}
                actions={{
                  cleanJob: jobActions.cleanJob(queue.name)(job),
                  promoteJob: jobActions.promoteJob(queue.name)(job),
                  retryJob: jobActions.retryJob(queue.name, status as JobRetryStatus)(job),
                  getJobLogs: jobActions.getJobLogs(queue.name)(job),
                }}
                readOnlyMode={queue?.readOnlyMode}
                allowRetries={(job.isFailed || queue.allowCompletedRetries) && queue.allowRetries}
              />
            ))}
        </div>
      ))}
    </div>
  );
};
