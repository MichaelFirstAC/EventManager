USE eventmanagementsystem;

-- DML QUERIES: SELECT, INSERT, UPDATE, DELETE (10 Examples)
-- The INSERT/UPDATE/DELETE queries are paired with a revert action to keep the database state clean.

----------------------------------------------------
-- 1-4. SELECT QUERIES (Data Retrieval and Reporting)
----------------------------------------------------

-- 1. SELECT: Retrieve all CONFIRMED attendees for the 'Bali Music Fest'
-- Uses: JOIN, WHERE, ENUM field (RegistrationStatus)
SELECT 
    a.FullName,
    a.Email,
    t.TicketType,
    t.Price
FROM Attendee a
JOIN Ticket t ON a.AttendeeID = t.AttendeeID
JOIN Event e ON t.EventID = e.EventID
WHERE e.EventName = 'Bali Music Fest' AND t.RegistrationStatus = 'CONFIRMED';


-- 2. SELECT: List all PENDING registrations with payment status details (using the PendingRegistrations VIEW)
-- Uses: VIEW (PendingRegistrations), JOIN
SELECT
    pr.FullName,
    pr.EventName,
    pr.TicketType,
    pr.Price,
    pr.PaymentStatus
FROM PendingRegistrations pr;


-- 3. SELECT: Find all active Admin users (Organizers with 'ADMIN' role)
-- Uses: ENUM field (Role) for access control
SELECT
    OrganizerID,
    OrganizerName,
    ContactEmail
FROM Organizer
WHERE Role = 'ADMIN';


-- 4. SELECT: List all event schedules and order them chronologically
-- Uses: JOIN, ORDER BY
SELECT
    e.EventName,
    s.ActivityName,
    s.Speaker,
    s.StartTime
FROM Schedule s
JOIN Event e ON s.EventID = e.EventID
ORDER BY s.StartTime ASC;


----------------------------------------------------
-- 5-10. INSERT, UPDATE, DELETE QUERIES (With Reversions)
----------------------------------------------------

-- 5. INSERT & DELETE: Add a new temporary venue and immediately remove it
-- Demonstrates creation and deletion of a core entity.
INSERT INTO Venue (VenueName, Address, City, Capacity) 
VALUES ('Test Conference Room', '50 Temporary Lane', 'TestCity', 50);

DELETE FROM Venue 
WHERE VenueName = 'Test Conference Room';


-- 6. INSERT & DELETE: Create a test registration (Ticket) and immediately cancel it
-- Demonstrates the full registration workflow (The INSERT will also create a PENDING payment record via the TRIGGER).
-- Assumes AttendeeID 2 (Sarah Lim) and EventID 3 (Startup Networking Night) exist.
SET @attendee_id = 2;
SET @event_id = 3;

-- Step A: Insert test ticket (Trigger auto-creates a PENDING payment)
INSERT INTO Ticket (EventID, AttendeeID, TicketType, Price, RegistrationStatus)
VALUES (@event_id, @attendee_id, 'Regular', 20.00, 'PENDING');

-- Get the ID of the ticket just created
SET @new_ticket_id = LAST_INSERT_ID();

-- Step B: Delete the test ticket (This DELETEs the ticket AND the associated Payment record via ON DELETE CASCADE)
DELETE FROM Ticket 
WHERE TicketID = @new_ticket_id;


-- 7. UPDATE: Temporarily change the registration status and revert
-- Simulates the action of an admin manually confirming a payment.
-- Assumes TicketID 1 exists.
SET @target_ticket_id = 1;
SET @original_status = (SELECT RegistrationStatus FROM Ticket WHERE TicketID = @target_ticket_id);

-- Step A: Mark ticket as CONFIRMED
UPDATE Ticket
SET RegistrationStatus = 'CONFIRMED'
WHERE TicketID = @target_ticket_id;

-- Step B: Revert ticket status back to its original status (or PENDING if original was not found)
UPDATE Ticket
SET RegistrationStatus = @original_status
WHERE TicketID = @target_ticket_id;


-- 8. UPDATE: Temporarily update an Organizer's contact email and revert
-- Demonstrates updating user/admin profile information.
SET @target_organizer_id = 1;
SET @original_email = (SELECT ContactEmail FROM Organizer WHERE OrganizerID = @target_organizer_id);

-- Step A: Update the email to a temporary value
UPDATE Organizer
SET ContactEmail = 'temp_update@eventpro.id'
WHERE OrganizerID = @target_organizer_id;

-- Step B: Revert the email back to the original value
UPDATE Organizer
SET ContactEmail = @original_email
WHERE OrganizerID = @target_organizer_id;


-- 9. INSERT & DELETE: Temporarily add a new Schedule item and remove it
-- Demonstrates managing event content.
SET @target_event_id = 1;

-- Step A: Insert a new schedule item
INSERT INTO Schedule (EventID, ActivityName, Speaker, StartTime, EndTime)
VALUES (@target_event_id, 'Temporary Breakout Session', 'Temp Speaker', '2025-04-14 10:30:00', '2025-04-14 11:30:00');

-- Step B: Delete the temporary schedule item
DELETE FROM Schedule 
WHERE ActivityName = 'Temporary Breakout Session';


-- 10. UPDATE: Temporarily mark a Payment as COMPLETED and revert
-- Directly updates the payment record created by the ticket trigger (for testing purposes).
-- Assumes TicketID 1 exists and a Payment record was auto-created for it.
SET @target_ticket_id_2 = 1;
SET @original_payment_status = (SELECT PaymentStatus FROM Payment WHERE TicketID = @target_ticket_id_2);

-- Step A: Mark the payment as COMPLETED
UPDATE Payment
SET PaymentStatus = 'COMPLETED', PaymentDate = NOW()
WHERE TicketID = @target_ticket_id_2;

-- Step B: Revert the payment status back to its original state (e.g., PENDING) and clear the date
UPDATE Payment
SET PaymentStatus = @original_payment_status, PaymentDate = NULL
WHERE TicketID = @target_ticket_id_2;