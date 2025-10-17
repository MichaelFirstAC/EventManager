-- Insert a new temporary venue
INSERT INTO Venue (VenueID, VenueName, Address, City, Capacity)
VALUES (99, 'Temporary Test Venue', '123 Delete Me Lane', 'Nowhere', 100);

-- Delete the temporary venue we just added
DELETE FROM Venue
WHERE VenueID = 99;
