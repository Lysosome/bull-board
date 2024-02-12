import React, { ChangeEvent, useState } from 'react';

const JumpToTime = () => {
  const [time, setTime] = useState('');

  const handleTimeChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTime(e.target.value);
  };

  const handleJumpToTime = () => {
    // do something with time
  };

  return (
    <div>
      <div>
        <input type="datetime-local" value={time} onChange={handleTimeChange} />
      </div>
      <div>
        <button onClick={handleJumpToTime}>Jump to time</button>
      </div>
    </div>
  );
};

export default JumpToTime;
