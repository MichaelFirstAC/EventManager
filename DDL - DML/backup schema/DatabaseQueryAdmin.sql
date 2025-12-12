-- Add password column to Organizer table (for admin login)
ALTER TABLE Organizer ADD COLUMN Password VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE Organizer ADD COLUMN Role ENUM('ADMIN') DEFAULT 'ADMIN';

-- Add password column to Attendee table (for participant login)
ALTER TABLE Attendee ADD COLUMN Password VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE Attendee ADD COLUMN Role ENUM('PARTICIPANT') DEFAULT 'PARTICIPANT';

-- Create a sessions table to track active sessions
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

-- Insert a test admin organizer (password: "admin123" hashed)
-- You'll generate the actual hash in Python, but for now use this placeholder
INSERT INTO Organizer (OrganizerName, ContactEmail, ContactPhone, Password, Role) 
VALUES ('Admin User', 'admin@eventmanager.com', '000-0000', '', 'ADMIN');