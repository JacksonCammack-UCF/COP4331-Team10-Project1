-- seed.sql
USE COP4331;

-- Sample Users
INSERT INTO Users (FirstName, LastName, Login, Password) VALUES
('Jackson', 'Cammack', 'JacksonC', 'pass123'),
('Emily', 'Watson', 'EmilyW', 'mypassword'),
('Liam', 'Smith', 'LiamS', 'abc123'),
('Sophia', 'Johnson', 'SophiaJ', 'pw2025'),
('Noah', 'Brown', 'NoahB', 'securepass'),
('Olivia', 'Davis', 'OliviaD', '1234abcd');

-- Sample Contacts
INSERT INTO Contacts (FirstName, LastName, Phone, Email, UserID) VALUES
('Aiden', 'Lee', '555-1234', 'aiden.lee@example.com', 1),
('Mia', 'Garcia', '555-5678', 'mia.garcia@example.com', 2),
('Ethan', 'Martinez', '555-8765', 'ethan.martinez@example.com', 3),
('Isabella', 'Rodriguez', '555-4321', 'isabella.rodriguez@example.com', 4),
('Lucas', 'Hernandez', '555-2468', 'lucas.hernandez@example.com', 5),
('Charlotte', 'Lopez', '555-1357', 'charlotte.lopez@example.com', 6);
