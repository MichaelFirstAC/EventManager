SELECT
    e.EventName,
    COUNT(t.TicketID) AS NumberOfAttendees
FROM Event e
LEFT JOIN Ticket t ON e.EventID = t.EventID
GROUP BY e.EventName
ORDER BY NumberOfAttendees DESC;
