SELECT
    a.FullName,
    a.Email,
    t.TicketType,
    t.Price,
    t.PurchaseDate
FROM Attendee a
JOIN Ticket t ON a.AttendeeID = t.AttendeeID
JOIN Event e ON t.EventID = e.EventID
WHERE e.EventName = 'Bali Music Fest';