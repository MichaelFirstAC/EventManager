SELECT
    EventName,
    StartDate,
    EventType
FROM Event
WHERE StartDate >= CURDATE()
ORDER BY StartDate ASC;
