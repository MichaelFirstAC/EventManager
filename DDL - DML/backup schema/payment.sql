-- Payment Schema for Event Management System
-- Add payment tracking and registration status functionality

-- 1. Add RegistrationStatus column to Ticket table
ALTER TABLE Ticket 
ADD COLUMN RegistrationStatus ENUM('PENDING', 'CONFIRMED', 'CANCELLED') DEFAULT 'PENDING' AFTER Price;

-- 2. Create Payment table to track payment details
CREATE TABLE IF NOT EXISTS Payment (
    PaymentID INT AUTO_INCREMENT PRIMARY KEY,
    TicketID INT NOT NULL,
    PaymentMethod VARCHAR(50) DEFAULT 'Manual',
    PaymentDate DATETIME DEFAULT NULL,
    PaymentStatus ENUM('PENDING', 'COMPLETED', 'FAILED') DEFAULT 'PENDING',
    TransactionReference VARCHAR(100) DEFAULT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (TicketID) REFERENCES Ticket(TicketID) ON DELETE CASCADE
);

-- 3. Create index for faster queries
CREATE INDEX idx_ticket_status ON Ticket(RegistrationStatus);
CREATE INDEX idx_payment_status ON Payment(PaymentStatus);
CREATE INDEX idx_ticket_payment ON Payment(TicketID);

-- 4. Add notes/comments column for additional payment information
ALTER TABLE Payment
ADD COLUMN PaymentNotes TEXT DEFAULT NULL AFTER TransactionReference;

-- View to see pending registrations with payment info
CREATE OR REPLACE VIEW PendingRegistrations AS
SELECT 
    t.TicketID,
    t.EventID,
    t.AttendeeID,
    a.FullName,
    a.Email,
    e.EventName,
    t.TicketType,
    t.Price,
    t.PurchaseDate,
    t.RegistrationStatus,
    p.PaymentID,
    p.PaymentStatus,
    p.PaymentDate
FROM Ticket t
JOIN Attendee a ON t.AttendeeID = a.AttendeeID
JOIN Event e ON t.EventID = e.EventID
LEFT JOIN Payment p ON t.TicketID = p.TicketID
WHERE t.RegistrationStatus = 'PENDING';

-- Sample trigger to automatically create payment record when ticket is created
DELIMITER $$

CREATE TRIGGER after_ticket_insert
AFTER INSERT ON Ticket
FOR EACH ROW
BEGIN
    INSERT INTO Payment (TicketID, PaymentStatus)
    VALUES (NEW.TicketID, 'PENDING');
END$$

DELIMITER ;
