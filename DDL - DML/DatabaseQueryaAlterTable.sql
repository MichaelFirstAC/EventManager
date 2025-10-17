USE eventmanagementsystem; -- Select the database

-- Temporarily disable foreign key checks to allow modifications
SET FOREIGN_KEY_CHECKS=0;

-- Apply AUTO_INCREMENT to all primary key columns
-- This version only adds the AUTO_INCREMENT property, which is all we need.
ALTER TABLE Event MODIFY EventID INT AUTO_INCREMENT;
ALTER TABLE Venue MODIFY VenueID INT AUTO_INCREMENT;
ALTER TABLE Organizer MODIFY OrganizerID INT AUTO_INCREMENT;
ALTER TABLE Attendee MODIFY AttendeeID INT AUTO_INCREMENT;
ALTER TABLE Schedule MODIFY ScheduleID INT AUTO_INCREMENT;
ALTER TABLE Ticket MODIFY TicketID INT AUTO_INCREMENT;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS=1;
