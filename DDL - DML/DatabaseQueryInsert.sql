-- Insert into Venue
INSERT INTO Venue (VenueID, VenueName, Address, City, Capacity) VALUES
(1, 'Grand Convention Hall', '123 Main Street', 'Jakarta', 1000),
(2, 'Sunset Arena', '45 Ocean Drive', 'Bali', 5000),
(3, 'Green Garden Hall', '77 Central Ave', 'Bandung', 800);

-- Insert into Organizer
INSERT INTO Organizer (OrganizerID, OrganizerName, ContactEmail, ContactPhone) VALUES
(1, 'EventPro Management', 'contact@eventpro.id', '0812-3456-7890'),
(2, 'Global Events Co.', 'info@globalevents.com', '0813-2233-4455'),
(3, 'Stellar Productions', 'support@stellar.id', '0812-7788-9900');

-- Insert into Attendee
INSERT INTO Attendee (AttendeeID, FullName, Email, Phone, RegistrationDate) VALUES
(1, 'Michael Arianno', 'michael@example.com', '0812-1111-2222', '2025-03-01'),
(2, 'Sarah Lim', 'sarah.lim@gmail.com', '0813-5555-6666', '2025-06-30'),
(3, 'Kevin Pratama', 'kevinp@yahoo.com', '0812-7777-8888', '2025-08-10'),
(4, 'Aisha Rahman', 'aisha.rahman@outlook.cc', '0813-9999-0000', '2025-03-05');

-- Insert into Event
INSERT INTO Event (EventID, EventName, EventType, StartDate, EndDate, VenueID, OrganizerID) VALUES
(1, 'Tech Innovators Summit', 'Conference', '2025-04-12', '2025-04-14', 1, 1),
(2, 'Bali Music Fest', 'Concert', '2025-07-20', '2025-07-22', 2, 2),
(3, 'Startup Networking Night', 'Meetup', '2025-09-05', '2025-09-05', 3, 3);

-- Insert into Schedule
INSERT INTO Schedule (ScheduleID, EventID, ActivityName, Speaker, StartTime, EndTime) VALUES
(1, 1, 'Opening Keynote', 'Dr. Andi Susanto', '2025-04-12 9:00:00', '2025-04-12 10:00:00'),
(2, 1, 'AI & Robotics Panel', 'Sarah Tan', '2025-04-12 13:00:00', '2025-04-12 15:00:00'),
(3, 2, 'Opening Concert', 'DJ Nova', '2025-07-20 18:00:00', '2025-07-20 20:00:00'),
(4, 2, 'Acoustic Night', 'Raisa', '2025-07-21 19:00:00', '2025-07-21 21:00:00'),
(5, 3, 'Networking Session', 'Jane Doe', '2025-09-05 18:00:00', '2025-09-05 20:00:00');

-- Insert into Ticket
INSERT INTO Ticket (TicketID, EventID, AttendeeID, TicketType, Price, PurchaseDate) VALUES
(1, 1, 1, 'VIP', 1000000.00, '2025-03-10'),
(2, 1, 4, 'Regular', 500000.00, '2025-03-11'),
(3, 2, 2, 'VIP', 750000.00, '2025-07-05'),
(4, 2, 3, 'Regular', 400000.00, '2025-07-06'),
(5, 3, 1, 'Regular', 300000.00, '2025-08-20');