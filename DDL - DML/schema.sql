-- 1. SETUP DATABASE
DROP DATABASE IF EXISTS eventmanagementsystem;
CREATE DATABASE eventmanagementsystem;
USE eventmanagementsystem;

-- 2. CREATE TABLES

-- Table: Venue
CREATE TABLE Venue (
    VenueID INT AUTO_INCREMENT PRIMARY KEY,
    VenueName VARCHAR(255) NOT NULL,
    Address VARCHAR(255) NOT NULL,
    City VARCHAR(100) NOT NULL,
    Capacity INT
);

-- Table: Organizer
-- Integrated 'Password' and 'Role' from your Admin script directly here
CREATE TABLE Organizer (
    OrganizerID INT AUTO_INCREMENT PRIMARY KEY,
    OrganizerName VARCHAR(255) NOT NULL,
    ContactEmail VARCHAR(255) UNIQUE NOT NULL,
    ContactPhone VARCHAR(50),
    Password VARCHAR(255) NOT NULL DEFAULT '', -- Store hashed passwords here
    Role ENUM('ADMIN', 'ORGANIZER') DEFAULT 'ORGANIZER'
);

-- Table: Attendee
-- Integrated 'Password' and 'Role' here as well
CREATE TABLE Attendee (
    AttendeeID INT AUTO_INCREMENT PRIMARY KEY,
    FullName VARCHAR(255) NOT NULL,
    Email VARCHAR(255) UNIQUE NOT NULL,
    Phone VARCHAR(50),
    RegistrationDate DATE DEFAULT (CURRENT_DATE),
    Password VARCHAR(255) NOT NULL DEFAULT '',
    Role ENUM('PARTICIPANT') DEFAULT 'PARTICIPANT'
);

-- Table: Event
-- Integrated 'Price' from your Ticket script directly here
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

-- Table: Ticket
CREATE TABLE Ticket (
    TicketID INT AUTO_INCREMENT PRIMARY KEY,
    EventID INT,
    AttendeeID INT,
    TicketType VARCHAR(50),
    Price DECIMAL(10, 2),
    PurchaseDate DATE DEFAULT (CURRENT_DATE),
    FOREIGN KEY (EventID) REFERENCES Event(EventID) ON DELETE CASCADE,
    FOREIGN KEY (AttendeeID) REFERENCES Attendee(AttendeeID) ON DELETE CASCADE
);

-- Table: Session (For Authentication)
CREATE TABLE Session (
    SessionID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    UserType ENUM('ORGANIZER', 'ATTENDEE') NOT NULL,
    SessionToken VARCHAR(255) UNIQUE NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ExpiresAt TIMESTAMP,
    INDEX(SessionToken)
);