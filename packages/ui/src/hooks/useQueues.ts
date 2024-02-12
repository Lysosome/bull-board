import { JobCleanStatus, JobRetryStatus } from '@lysosome/bull-board-api/dist/typings/app';
import { GetQueuesResponse } from '@lysosome/bull-board-api/dist/typings/responses';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { create } from 'zustand';
import { QueueActions } from '../../typings/app';
import { getConfirmFor } from '../utils/getConfirmFor';
import { useActiveQueueName } from './useActiveQueueName';
import { useApi } from './useApi';
import { useConfirm } from './useConfirm';
import { useInterval } from './useInterval';
import { useQuery } from './useQuery';
import { useSelectedStatuses } from './useSelectedStatuses';
import { useSettingsStore } from './useSettings';
import { usePageMarkersStore } from './usePageMarkers';

export type QueuesState = {
  queues: null | GetQueuesResponse['queues'];
  loading: boolean;
  updateQueues(queues: GetQueuesResponse['queues']): void;
};

const useQueuesStore = create<QueuesState>((set) => ({
  queues: [],
  loading: true,
  updateQueues: (queues: GetQueuesResponse['queues']) => set(() => ({ queues, loading: false })),
}));

export function useQueues(): Omit<QueuesState, 'updateQueues'> & { actions: QueueActions } {
  const query = useQuery();
  const { t } = useTranslation();
  const api = useApi();
  const activeQueueName = useActiveQueueName();
  const selectedStatuses = useSelectedStatuses();
  const {
    pollingInterval,
    jobsPerPage,
    confirmQueueActions,
    collapseSameNameJobs,
    filterJobName,
    beforeDatetime,
  } = useSettingsStore(
    ({
      pollingInterval,
      jobsPerPage,
      confirmQueueActions,
      collapseSameNameJobs,
      filterJobName,
      beforeDatetime,
    }) => ({
      pollingInterval,
      jobsPerPage,
      confirmQueueActions,
      collapseSameNameJobs,
      filterJobName,
      beforeDatetime,
    })
  );
  const { pageMarkers } = usePageMarkersStore(({ pageMarkers }) => ({ pageMarkers }));
  const page = query.get('page') || 1;

  const { queues, loading, updateQueues: setState } = useQueuesStore((state) => state);
  const { openConfirm } = useConfirm();

  const updateQueues = useCallback(
    () =>
      api
        .getQueues({
          activeQueue: activeQueueName || undefined,
          status: activeQueueName ? selectedStatuses[activeQueueName] : undefined,
          page: String(page),
          after: (pageMarkers && pageMarkers[+page]) || undefined,
          jobsPerPage,
          collapseSameNameJobs,
          filterJobName: filterJobName || undefined,
          beforeDatetime: beforeDatetime || undefined,
        })
        .then((data) => {
          setState(data.queues);
        })
        // eslint-disable-next-line no-console
        .catch((error) => console.error('Failed to poll', error)),
    [activeQueueName, jobsPerPage, selectedStatuses, filterJobName, beforeDatetime]
  );

  const pollQueues = () =>
    useInterval(updateQueues, pollingInterval > 0 ? pollingInterval * 1000 : null, [
      selectedStatuses,
    ]);

  const withConfirmAndUpdate = getConfirmFor(updateQueues, openConfirm);

  const retryAll = (queueName: string, status: JobRetryStatus) =>
    withConfirmAndUpdate(
      () => api.retryAll(queueName, status),
      t('QUEUE.ACTIONS.RETRY_ALL_CONFIRM_MSG', { status }),
      confirmQueueActions
    );

  const promoteAll = (queueName: string) =>
    withConfirmAndUpdate(
      () => api.promoteAll(queueName),
      t('QUEUE.ACTIONS.PROMOTE_ALL_CONFIRM_MSG'),
      confirmQueueActions
    );

  const cleanAll = (queueName: string, status: JobCleanStatus) =>
    withConfirmAndUpdate(
      () => api.cleanAll(queueName, status),
      t('QUEUE.ACTIONS.CLEAN_ALL_CONFIRM_MSG', { status }),
      confirmQueueActions
    );

  const pauseQueue = (queueName: string) =>
    withConfirmAndUpdate(
      () => api.pauseQueue(queueName),
      t('QUEUE.ACTIONS.PAUSE_QUEUE_CONFIRM_MSG'),
      confirmQueueActions
    );

  const resumeQueue = (queueName: string) =>
    withConfirmAndUpdate(
      () => api.resumeQueue(queueName),
      t('QUEUE.ACTIONS.RESUME_QUEUE_CONFIRM_MSG'),
      confirmQueueActions
    );

  const emptyQueue = (queueName: string) =>
    withConfirmAndUpdate(
      () => api.emptyQueue(queueName),
      t('QUEUE.ACTIONS.EMPTY_QUEUE_CONFIRM_MSG'),
      confirmQueueActions
    );

  return {
    queues,
    loading,
    actions: {
      updateQueues,
      pollQueues,
      retryAll,
      promoteAll,
      cleanAll,
      pauseQueue,
      resumeQueue,
      emptyQueue,
    },
  };
}
