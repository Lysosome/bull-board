import { AppQueue } from '@lysosome/bull-board-api/dist/typings/app';
import { Item, Portal, Root, Trigger } from '@radix-ui/react-dropdown-menu';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { QueueActions } from '../../../typings/app';
import { Button } from '../Button/Button';
import { DropdownContent } from '../DropdownContent/DropdownContent';
import { EllipsisVerticalIcon } from '../Icons/EllipsisVertical';
import { PauseIcon } from '../Icons/Pause';
import { PlayIcon } from '../Icons/Play';
import { TrashIcon } from '../Icons/Trash';
import s from './QueueDropdownActions.module.css';

export const QueueDropdownActions = ({
  queue,
  actions,
}: {
  queue: AppQueue;
  actions: QueueActions;
}) => {
  const { t } = useTranslation();
  return (
    <Root>
      <Trigger asChild>
        <Button className={s.trigger}>
          <EllipsisVerticalIcon />
        </Button>
      </Trigger>

      <Portal>
        <DropdownContent align="end">
          <Item
            onSelect={
              queue.isPaused ? actions.resumeQueue(queue.name) : actions.pauseQueue(queue.name)
            }
          >
            {queue.isPaused ? (
              <>
                <PlayIcon />
                {t('QUEUE.ACTIONS.RESUME')}
              </>
            ) : (
              <>
                <PauseIcon />
                {t('QUEUE.ACTIONS.PAUSE')}
              </>
            )}
          </Item>
          <Item onSelect={actions.emptyQueue(queue.name)}>
            <TrashIcon />
            {t('QUEUE.ACTIONS.EMPTY')}
          </Item>
        </DropdownContent>
      </Portal>
    </Root>
  );
};
