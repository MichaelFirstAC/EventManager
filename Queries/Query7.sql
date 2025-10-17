-- Update the event name
UPDATE Event
SET EventName = 'TEMPORARY Global Tech Summit'
WHERE EventID = 1;

-- Revert the name back to the original
UPDATE Event
SET EventName = 'Tech Innovators Summit'
WHERE EventID = 1;
