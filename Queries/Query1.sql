SELECT
    e.EventName,
    e.StartDate,
    v.VenueName,
    v.City
FROM Event e
JOIN Venue v ON e.VenueID = v.VenueID
WHERE e.EventName LIKE '%Summit%' OR v.City LIKE '%Jakarta%';