-- Increase all VIP ticket prices for 'Bali Music Fest' (EventID 2)
UPDATE Ticket
SET Price = Price * 1.20
WHERE EventID = 2 AND TicketType = 'VIP';

-- Revert the prices back to their original values
UPDATE Ticket
SET Price = Price / 1.20
WHERE EventID = 2 AND TicketType = 'VIP';
