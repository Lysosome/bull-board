import React, { useEffect, useState } from 'react';
import { useSettingsStore } from '../../hooks/useSettings';
import { useQueues } from '../../hooks/useQueues';
import { usePageMarkersStore } from '../../hooks/usePageMarkers';
import { RetryIcon } from '../Icons/Retry';
import { Button } from '../Button/Button';

const FilterJobName = () => {
  const [jobName, setJobName] = useState('');
  const [filterOn, setFilterOn] = useState(false);

  const { filterJobName, setSettings } = useSettingsStore((state) => state);
  const {
    actions: { updateQueues },
  } = useQueues();
  const { resetPageMarkers } = usePageMarkersStore((state) => state);

  const handleFilterChange = (filterJobName: string | null) => {
    setSettings({ filterJobName });
    resetPageMarkers();
    updateQueues();
  };

  useEffect(() => {
    if (filterJobName) {
      setJobName(filterJobName);
      setFilterOn(true);
    }
  }, [filterJobName]);

  return (
    <div>
      <div>
        <input
          type="text"
          value={jobName}
          onChange={(e) => {
            setJobName(e.target.value);
          }}
        />
      </div>
      {/* on/off toggle for filtering */}
      <div>
        <input
          type="checkbox"
          checked={filterOn}
          onChange={(e) => {
            setFilterOn(e.target.checked);
            handleFilterChange(e.target.checked ? jobName : null);
          }}
        />
        <label>Filter by name (exact)</label>
        {filterOn && filterJobName !== jobName && (
          <Button onClick={() => handleFilterChange(jobName)}>
            <RetryIcon />
          </Button>
        )}
      </div>
    </div>
  );
};

export default FilterJobName;
