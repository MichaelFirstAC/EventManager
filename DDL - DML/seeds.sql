USE eventmanagementsystem;

-- 1. Insert Venues
INSERT INTO Venue (VenueID, VenueName, Address, City, Capacity) VALUES
(1, 'Grand Convention Hall', '123 Main Street', 'Jakarta', 1000),
(2, 'Sunset Arena', '45 Ocean Drive', 'Bali', 5000),
(3, 'Green Garden Hall', '77 Central Ave', 'Bandung', 800);

-- 2. Insert Organizers (Added Default Passwords/Roles)
INSERT INTO Organizer (OrganizerID, OrganizerName, ContactEmail, ContactPhone, Password, Role) VALUES
(1, 'EventPro Management', 'contact@eventpro.id', '0812-3456-7890', 'hashed_pass_1', 'ORGANIZER'),
(2, 'Global Events Co.', 'info@globalevents.com', '0813-2233-4455', 'hashed_pass_2', 'ORGANIZER'),
(3, 'Stellar Productions', 'support@stellar.id', '0812-7788-9900', 'hashed_pass_3', 'ORGANIZER'),
(4, 'Super Admin', 'admin@eventmanager.com', '000-0000', 'admin_hash_123', 'ADMIN');

-- 3. Insert Events (Added Prices)
INSERT INTO Event (EventID, EventName, EventType, StartDate, EndDate, VenueID, OrganizerID, Price) VALUES
(1, 'Tech Innovators Summit', 'Conference', '2025-04-12', '2025-04-14', 1, 1, 15.00),
(2, 'Bali Music Fest', 'Concert', '2025-07-20', '2025-07-22', 2, 2, 75.00),
(3, 'Startup Networking Night', 'Meetup', '2025-09-05', '2025-09-05', 3, 3, 20.00);

-- 4. Insert Schedule
INSERT INTO Schedule (EventID, ActivityName, Speaker, StartTime, EndTime) VALUES
(1, 'Opening Keynote', 'Dr. Andi Susanto', '2025-04-12 09:00:00', '2025-04-12 10:00:00'),
(1, 'AI & Robotics Panel', 'Sarah Tan', '2025-04-12 13:00:00', '2025-04-12 15:00:00'),
(2, 'Opening Concert', 'DJ Nova', '2025-07-20 18:00:00', '2025-07-20 20:00:00'),
(2, 'Acoustic Night', 'Raisa', '2025-07-21 19:00:00', '2025-07-21 21:00:00'),
(3, 'Networking Session', 'Jane Doe', '2025-09-05 18:00:00', '2025-09-05 20:00:00');
