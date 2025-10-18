# Event Management System

A complete, full-stack web application for managing events, venues, organizers, and attendees. This project is built with a Python and Flask backend, a MySQL database, and a vanilla HTML, CSS, and JavaScript frontend.

The application is designed to be a comprehensive solution for event administrators, providing full CRUD (Create, Read, Update, Delete) functionality for all major components of an event lifecycle.

### Core Features

- Full CRUD Operations: Create, read, update, and delete Events, Venues, Organizers, and Attendees.
- Relational Management: Manage complex relationships, such as event schedules and attendee registrations for specific events.
- Dynamic Ticketing: A dynamic pricing system where ticket prices can be set for events, with different tiers (e.g., Regular, VIP). Updating an event's price automatically recalculates the price for existing tickets.
- Data Exploration: View detailed pages for attendees and organizers to see all events they are associated with.
- Search Functionality: Easily find events by name/city and attendees by name/email.
- Responsive Design: A clean, modern UI that is fully responsive and functional on desktop, tablet, and mobile devices.

### Technology Stack

Backend: Python 3 with the Flask web framework.
Database: MySQL 8.0.
Frontend: Vanilla HTML5, CSS3, and modern JavaScript (ES6+).
Python Libraries: Flask, Flask-Cors, PyMySQL.

# Getting Started

Follow these instructions to set up and run the project on your local machine.

### 1. Prerequisites

Before you begin, ensure you have the following installed on your system:

Python 3: You can download it from python.org.
MySQL Server & Workbench: The application is built using MySQL 8.0. You can download it from the official MySQL website.
A code editor like Visual Studio Code.

### 2. Dependencies

The Python backend requires the following libraries:

```Flask```
```Flask-Cors```
```PyMySQL```

These will be installed in a later step.

## 3. Initialization and Setup

### Step 1: Clone the Repository
Clone this project to your local machine using Git.

```
git clone <your-repository-url>
cd EventManagerPro
```

### Step 2: Set Up the Database

1. Open MySQL Workbench and connect to your local MySQL server.

2. Create a new database schema. You can do this by running the first two lines from your original SQL script:
```
CREATE DATABASE EventManagementSystem;
USE EventManagementSystem;
```
3. Run the rest of the SQL script you have to create all the tables (Venue, Organizer, Event, etc.) and insert the initial sample data.

### Step 3: Configure the Backend

1. Navigate to the project's root directory (EventManagerPro) in your terminal.
2. Create and activate a Python virtual environment. This is highly recommended to keep dependencies isolated.

#### For macOS/Linux
```
python3 -m venv venv
source venv/bin/activate
```
#### For Windows
```
python -m venv venv
.\venv\Scripts\activate
```
3. Install the required Python packages:
```
pip install Flask Flask-Cors PyMySQL
```
4. Open the app.py file in your code editor.
5. Find the db_config dictionary at the top and update it with your personal MySQL credentials (username, password, and port).

### Step 4: Run the Application

You will need to run two servers in two separate terminals.

1. Terminal 1: Start the Backend Server

- Make sure you are in the project's root directory (EventManagerPro) and your virtual environment is activated.

- Run the Flask application:

```
python app.py
```
- The backend will start running on http://127.0.0.1:5000.

2. Terminal 2: Start the Frontend Server

- Navigate into the frontend directory:
```
cd frontend
```
- Use Python's built-in web server to serve the HTML, CSS, and JS files:
```
python -m http.server 8000
```
- The frontend will start running on http://localhost:8000.

### Step 5: Access the Application
Open your web browser and navigate to:

```http://localhost:8000```

You should now see the Event Management System homepage, fully functional and connected to your database.

# Team
- Catherine Isabelle Ong
- Michael Arianno Chandrarieta
- Farrell Raffelino Sunarman
- Yiyang Liu
