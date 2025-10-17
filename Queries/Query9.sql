-- Register Kevin Pratama (AttendeeID 3) for the Tech Summit (EventID 1)
INSERT INTO Ticket (EventID, AttendeeID, TicketType, Price, PurchaseDate)
VALUES (1, 3, 'Regular', 500000.00, CURDATE());

-- Cancel that specific registration
DELETE FROM Ticket
WHERE AttendeeID = 3 AND EventID = 1;
