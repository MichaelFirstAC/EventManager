SELECT
    e.EventName,
    SUM(t.Price) AS TotalRevenue
FROM Ticket t
JOIN Event e ON t.EventID = e.EventID
WHERE e.EventName = 'Tech Innovators Summit'
GROUP BY e.EventName;
