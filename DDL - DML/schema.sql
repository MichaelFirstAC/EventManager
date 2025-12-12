-- 1. SETUP DATABASE
DROP DATABASE IF EXISTS eventmanagementsystem;
CREATE DATABASE eventmanagementsystem;
USE eventmanagementsystem;

-- 2. CREATE CORE TABLES

-- Table: Venue
CREATE TABLE Venue (
    VenueID INT AUTO_INCREMENT PRIMARY KEY,
    VenueName VARCHAR(255) NOT NULL,
    Address VARCHAR(255) NOT NULL,
    City VARCHAR(100) NOT NULL,
    Capacity INT
);

-- Table: Organizer (ADMIN User Role)
CREATE TABLE Organizer (
    OrganizerID INT AUTO_INCREMENT PRIMARY KEY,
    OrganizerName VARCHAR(255) NOT NULL,
    ContactEmail VARCHAR(255) UNIQUE NOT NULL,
    ContactPhone VARCHAR(50),
    Password VARCHAR(255) NOT NULL DEFAULT '', -- Stores hashed passwords
    Role ENUM('ADMIN', 'ORGANIZER') DEFAULT 'ORGANIZER'
);

-- Table: Attendee (PARTICIPANT User Role)
CREATE TABLE Attendee (
    AttendeeID INT AUTO_INCREMENT PRIMARY KEY,
    FullName VARCHAR(255) NOT NULL,
    Email VARCHAR(255) UNIQUE NOT NULL,
    Phone VARCHAR(50),
    RegistrationDate DATE DEFAULT (CURRENT_DATE),
    Password VARCHAR(255) NOT NULL DEFAULT '', -- Stores hashed passwords
    Role ENUM('PARTICIPANT') DEFAULT 'PARTICIPANT'
);

-- Table: Event
CREATE TABLE Event (
    EventID INT AUTO_INCREMENT PRIMARY KEY,
    EventName VARCHAR(255) NOT NULL,
    EventType VARCHAR(100),
    StartDate DATE,
    EndDate DATE,
    Price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    VenueID INT,
    OrganizerID INT,
    FOREIGN KEY (VenueID) REFERENCES Venue(VenueID) ON DELETE SET NULL,
    FOREIGN KEY (OrganizerID) REFERENCES Organizer(OrganizerID) ON DELETE CASCADE
);

-- Table: Schedule
CREATE TABLE Schedule (
    ScheduleID INT AUTO_INCREMENT PRIMARY KEY,
    EventID INT,
    ActivityName VARCHAR(255) NOT NULL,
    Speaker VARCHAR(255),
    StartTime DATETIME,
    EndTime DATETIME,
    FOREIGN KEY (EventID) REFERENCES Event(EventID) ON DELETE CASCADE
);

-- Table: Ticket (Added RegistrationStatus)
CREATE TABLE Ticket (
    TicketID INT AUTO_INCREMENT PRIMARY KEY,
    EventID INT,
    AttendeeID INT,
    TicketType VARCHAR(50),
    Price DECIMAL(10, 2),
    PurchaseDate DATE DEFAULT (CURRENT_DATE),
    RegistrationStatus ENUM('PENDING', 'CONFIRMED', 'CANCELLED') DEFAULT 'PENDING',
    FOREIGN KEY (EventID) REFERENCES Event(EventID) ON DELETE CASCADE,
    FOREIGN KEY (AttendeeID) REFERENCES Attendee(AttendeeID) ON DELETE CASCADE
);

-- Table: Session (For User Authentication Management)
CREATE TABLE Session (
    SessionID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    UserType ENUM('ORGANIZER', 'ATTENDEE') NOT NULL,
    SessionToken VARCHAR(255) UNIQUE NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ExpiresAt TIMESTAMP DEFAULT (DATE_ADD(NOW(), INTERVAL 7 DAY)),
    INDEX(SessionToken),
    INDEX(ExpiresAt)
);

-- Table: Payment (Tracking payment records)
CREATE TABLE IF NOT EXISTS Payment (
    PaymentID INT AUTO_INCREMENT PRIMARY KEY,
    TicketID INT NOT NULL,
    PaymentMethod VARCHAR(50) DEFAULT 'Manual',
    PaymentDate DATETIME DEFAULT NULL,
    PaymentStatus ENUM('PENDING', 'COMPLETED', 'FAILED') DEFAULT 'PENDING',
    TransactionReference VARCHAR(100) DEFAULT NULL,
    PaymentNotes TEXT DEFAULT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (TicketID) REFERENCES Ticket(TicketID) ON DELETE CASCADE
);

-- 3. INDEXES
CREATE INDEX idx_ticket_status ON Ticket(RegistrationStatus);
CREATE INDEX idx_payment_status ON Payment(PaymentStatus);
CREATE INDEX idx_ticket_payment ON Payment(TicketID);


-- 4. VIEWS AND TRIGGERS

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
