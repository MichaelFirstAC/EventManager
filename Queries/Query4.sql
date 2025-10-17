SELECT
    e.EventName,
    e.EventType,
    e.StartDate
FROM Event e
JOIN Venue v ON e.VenueID = v.VenueID
WHERE v.VenueName = 'Grand Convention Hall';
