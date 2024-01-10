import { getYear, isToday } from 'date-fns';
import React from 'react';
import { useTranslation } from 'react-i18next';
import s from './Timeline.module.css';

type TimeStamp = number | Date;

const formatDate = (ts: TimeStamp, locale: string) => {
  let options: Intl.DateTimeFormatOptions;
  if (isToday(ts)) {
    options = {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    };
  } else if (getYear(ts) === getYear(new Date())) {
    options = {
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    };
  } else {
    options = {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    };
  }

  return new Intl.DateTimeFormat(locale, options).format(ts);
};

export const CollapsibleCardTimeline = function Timeline({
  firstAddedTime,
  latestFinishedTime,
}: {
  firstAddedTime: TimeStamp;
  latestFinishedTime?: TimeStamp;
}) {
  const { t, i18n } = useTranslation();
  return (
    <div className={s.timelineWrapper}>
      <ul className={s.timeline}>
        <li>
          <small>{t('JOB.ADDED_AT')}</small>
          <time>{formatDate(firstAddedTime, i18n.language)}</time>
        </li>
        {!!latestFinishedTime && (
          <li>
            <small>{t('JOB.FINISHED_AT')}</small>
            <time>{formatDate(latestFinishedTime, i18n.language)}</time>
          </li>
        )}
      </ul>
    </div>
  );
};
