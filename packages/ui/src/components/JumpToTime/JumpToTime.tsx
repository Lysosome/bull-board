import React, { useEffect, useState } from 'react';
import { usePageMarkersStore } from '../../hooks/usePageMarkers';
import { useQueues } from '../../hooks/useQueues';
import { useSettingsStore } from '../../hooks/useSettings';
import { Button } from '../Button/Button';
import { RetryIcon } from '../Icons/Retry';

const JumpToTime = () => {
  const [time, setTime] = useState<number | null>(null);
  const [filterOn, setFilterOn] = useState(false);

  const { beforeDatetime, setSettings } = useSettingsStore((state) => state);
  const {
    actions: { updateQueues },
  } = useQueues();
  const { resetPageMarkers } = usePageMarkersStore((state) => state);

  const handleFilterChange = (beforeDatetime: number | null) => {
    setSettings({ beforeDatetime });
    resetPageMarkers();
    updateQueues();
  };

  useEffect(() => {
    if (beforeDatetime) {
      setTime(beforeDatetime);
      setFilterOn(true);
    }
  }, [beforeDatetime]);

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // eslint-disable-next-line no-console
    console.log('time', e.target.value);
    setTime(new Date(e.target.value).getTime());
  };

  // custom function to convert epoch to datetime-local format with correct timezone
  function epochToDatetimeLocal(epoch: number) {
    const date = new Date(epoch);
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2); // Months are 0-indexed in JavaScript
    const day = ('0' + date.getDate()).slice(-2);
    const hours = ('0' + date.getHours()).slice(-2);
    const minutes = ('0' + date.getMinutes()).slice(-2);
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  const timeString = time ? epochToDatetimeLocal(time) : undefined;

  return (
    <div>
      <div>
        <input type="datetime-local" value={timeString} onChange={handleTimeChange} />
      </div>
      {/* on/off toggle for filtering */}
      <div>
        <input
          type="checkbox"
          checked={filterOn}
          onChange={(e) => {
            setFilterOn(e.target.checked);
            handleFilterChange(e.target.checked ? time : null);
          }}
        />
        <label>Filter before time</label>
        {filterOn && beforeDatetime !== time && (
          <Button onClick={() => handleFilterChange(time)}>
            <RetryIcon />
          </Button>
        )}
      </div>
    </div>
  );
};

export default JumpToTime;
