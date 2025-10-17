-- 1. CREATE THE DATABASE
CREATE DATABASE eventmanagementsystem;

-- 2. USE THE NEWLY CREATED DATABASE
USE eventmanagementsystem;

-- 3. CREATE TABLES (3NF Schema)

-- Table: Venue
CREATE TABLE Venue (
    VenueID INT PRIMARY KEY,
    VenueName VARCHAR(255) NOT NULL,
    Address VARCHAR(255) NOT NULL,
    City VARCHAR(100) NOT NULL,
    Capacity INT
);

-- Table: Organizer
CREATE TABLE Organizer (
    OrganizerID INT PRIMARY KEY,
    OrganizerName VARCHAR(255) NOT NULL,
    ContactEmail VARCHAR(255) UNIQUE NOT NULL,
    ContactPhone VARCHAR(50)
);

-- Table: Attendee
CREATE TABLE Attendee (
    AttendeeID INT PRIMARY KEY,
    FullName VARCHAR(255) NOT NULL,
    Email VARCHAR(255) UNIQUE NOT NULL,
    Phone VARCHAR(50),
    RegistrationDate DATE
);

-- Table: Event (References Venue and Organizer)
CREATE TABLE Event (
    EventID INT PRIMARY KEY,
    EventName VARCHAR(255) NOT NULL,
    EventType VARCHAR(100),
    StartDate DATE,
    EndDate DATE,
    VenueID INT,
    OrganizerID INT,
    FOREIGN KEY (VenueID) REFERENCES Venue(VenueID),
    FOREIGN KEY (OrganizerID) REFERENCES Organizer(OrganizerID)
);

-- Table: Schedule (References Event)
CREATE TABLE Schedule (
    ScheduleID INT PRIMARY KEY,
    EventID INT,
    ActivityName VARCHAR(255) NOT NULL,
    Speaker VARCHAR(255),
    StartTime DATETIME,
    EndTime DATETIME,
    FOREIGN KEY (EventID) REFERENCES Event(EventID)
);

-- Table: Ticket (References Event and Attendee)
CREATE TABLE Ticket (
    TicketID INT PRIMARY KEY,
    EventID INT,
    AttendeeID INT,
    TicketType VARCHAR(50),
    Price DECIMAL(10, 2),
    PurchaseDate DATE,
    FOREIGN KEY (EventID) REFERENCES Event(EventID),
    FOREIGN KEY (AttendeeID) REFERENCES Attendee(AttendeeID)
);