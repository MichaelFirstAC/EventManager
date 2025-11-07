# File: EventManagerPro/app.py

from flask import Flask, jsonify, request
from flask_cors import CORS
import pymysql
from pymysql.cursors import DictCursor

# --- DATABASE CONFIGURATION ---
db_config = {
    'host': 'localhost',
    'port': 3305,
    'user': 'root',
    'password': 'michael4291',
    'database': 'eventmanagementsystem',
    'cursorclass': DictCursor
}

# --- FLASK APP INITIALIZATION ---
app = Flask(__name__)
CORS(app)

# --- HELPER FUNCTION ---
def get_db_connection():
    try:
        conn = pymysql.connect(**db_config)
        return conn
    except pymysql.Error as err:
        print(f"Error connecting to database: {err}")
        return None

# --- [EVENT ENDPOINTS] ---
@app.route('/api/events', methods=['GET', 'POST'])
def manage_events():
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor() as cursor:
            if request.method == 'GET':
                search_term = request.args.get('search', '')
                params = []
                query = "SELECT e.EventID, e.EventName, e.StartDate, v.City FROM Event e JOIN Venue v ON e.VenueID = v.VenueID"
                if search_term:
                    query += " WHERE e.EventName LIKE %s OR v.City LIKE %s"
                    params.extend([f"%{search_term}%", f"%{search_term}%"])
                query += " ORDER BY e.StartDate"
                cursor.execute(query, params)
                return jsonify(cursor.fetchall())
            
            if request.method == 'POST':
                data = request.get_json()
                query = "INSERT INTO Event (EventName, EventType, StartDate, EndDate, VenueID, OrganizerID, Price) VALUES (%s, %s, %s, %s, %s, %s, %s)"
                cursor.execute(query, (data['EventName'], data['EventType'], data['StartDate'], data['EndDate'], data['VenueID'], data['OrganizerID'], data.get('Price', 0.00)))
                conn.commit()
                return jsonify({"message": "Event added successfully", "id": cursor.lastrowid}), 201
    except pymysql.Error as err:
        conn.rollback()
        return jsonify({"error": str(err)}), 400
    finally:
        if conn: conn.close()

@app.route('/api/events/<int:event_id>', methods=['GET', 'DELETE', 'PUT'])
def manage_single_event(event_id):
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor() as cursor:
            if request.method == 'GET':
                event_query = "SELECT e.*, v.VenueName, v.Address, v.City, o.OrganizerName, o.OrganizerID, o.ContactEmail FROM Event e JOIN Venue v ON e.VenueID = v.VenueID JOIN Organizer o ON e.OrganizerID = o.OrganizerID WHERE e.EventID = %s"
                cursor.execute(event_query, (event_id,))
                event_details = cursor.fetchone()
                if not event_details: return jsonify({"error": "Event not found"}), 404
                schedule_query = "SELECT * FROM Schedule WHERE EventID = %s ORDER BY StartTime"
                cursor.execute(schedule_query, (event_id,))
                schedule = cursor.fetchall()
                attendee_query = "SELECT a.*, t.TicketType, t.TicketID, t.Price, t.PurchaseDate FROM Ticket t JOIN Attendee a ON t.AttendeeID = a.AttendeeID WHERE t.EventID = %s ORDER BY a.FullName"
                cursor.execute(attendee_query, (event_id,))
                attendees = cursor.fetchall()
                return jsonify({"details": event_details, "schedule": schedule, "attendees": attendees})

            if request.method == 'DELETE':
                cursor.execute("DELETE FROM Ticket WHERE EventID = %s", (event_id,))
                cursor.execute("DELETE FROM Schedule WHERE EventID = %s", (event_id,))
                cursor.execute("DELETE FROM Event WHERE EventID = %s", (event_id,))
                conn.commit()
                return jsonify({"message": "Event deleted successfully"})
            
            if request.method == 'PUT':
                data = request.get_json()
                new_base_price = float(data.get('Price', 0.00))
                event_update_query = "UPDATE Event SET EventName=%s, EventType=%s, StartDate=%s, EndDate=%s, VenueID=%s, OrganizerID=%s, Price=%s WHERE EventID=%s"
                cursor.execute(event_update_query, (data['EventName'], data['EventType'], data['StartDate'], data['EndDate'], data['VenueID'], data['OrganizerID'], new_base_price, event_id))
                ticket_update_query = "UPDATE Ticket SET Price = CASE WHEN TicketType = 'VIP' THEN %s * 1.5 ELSE %s END WHERE EventID = %s"
                cursor.execute(ticket_update_query, (new_base_price, new_base_price, event_id))
                conn.commit()
                return jsonify({"message": "Event and all associated ticket prices updated successfully"})
    except pymysql.Error as err:
        conn.rollback()
        return jsonify({"error": str(err)}), 400
    finally:
        if conn: conn.close()

# --- [VENUE ENDPOINTS] ---
@app.route('/api/venues', methods=['GET', 'POST'])
def manage_venues():
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor() as cursor:
            if request.method == 'GET':
                cursor.execute("SELECT * FROM Venue ORDER BY VenueName")
                return jsonify(cursor.fetchall())
            if request.method == 'POST':
                data = request.get_json()
                query = "INSERT INTO Venue (VenueName, Address, City, Capacity) VALUES (%s, %s, %s, %s)"
                cursor.execute(query, (data['VenueName'], data['Address'], data['City'], data['Capacity']))
                conn.commit()
                return jsonify({"message": "Venue added successfully", "id": cursor.lastrowid}), 201
    except pymysql.Error as err:
        conn.rollback()
        return jsonify({"error": str(err)}), 400
    finally:
        if conn: conn.close()

@app.route('/api/venues/<int:venue_id>', methods=['GET', 'DELETE', 'PUT'])
def manage_single_venue(venue_id):
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor() as cursor:
            if request.method == 'GET':
                cursor.execute("SELECT * FROM Venue WHERE VenueID = %s", (venue_id,))
                venue = cursor.fetchone()
                if not venue: return jsonify({"error": "Venue not found"}), 404
                return jsonify(venue)
            if request.method == 'DELETE':
                cursor.execute("SELECT COUNT(*) as count FROM Event WHERE VenueID = %s", (venue_id,))
                if cursor.fetchone()['count'] > 0:
                    return jsonify({"error": "Cannot delete: Venue is in use by an event."}), 409
                cursor.execute("DELETE FROM Venue WHERE VenueID = %s", (venue_id,))
                conn.commit()
                return jsonify({"message": "Venue deleted successfully"})
            if request.method == 'PUT':
                data = request.get_json()
                query = "UPDATE Venue SET VenueName=%s, Address=%s, City=%s, Capacity=%s WHERE VenueID=%s"
                cursor.execute(query, (data['VenueName'], data['Address'], data['City'], data['Capacity'], venue_id))
                conn.commit()
                return jsonify({"message": "Venue updated successfully"})
    except pymysql.Error as err:
        conn.rollback()
        return jsonify({"error": str(err)}), 400
    finally:
        if conn: conn.close()

# --- [ORGANIZER ENDPOINTS] ---
@app.route('/api/organizers', methods=['GET', 'POST'])
def manage_organizers():
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor() as cursor:
            if request.method == 'GET':
                cursor.execute("SELECT * FROM Organizer ORDER BY OrganizerName")
                return jsonify(cursor.fetchall())
            if request.method == 'POST':
                data = request.get_json()
                query = "INSERT INTO Organizer (OrganizerName, ContactEmail, ContactPhone) VALUES (%s, %s, %s)"
                cursor.execute(query, (data['OrganizerName'], data['ContactEmail'], data['ContactPhone']))
                conn.commit()
                return jsonify({"message": "Organizer added successfully", "id": cursor.lastrowid}), 201
    except pymysql.Error as err:
        conn.rollback()
        return jsonify({"error": str(err)}), 400
    finally:
        if conn: conn.close()

@app.route('/api/organizers/<int:organizer_id>', methods=['GET', 'DELETE', 'PUT'])
def manage_single_organizer(organizer_id):
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor() as cursor:
            if request.method == 'GET':
                cursor.execute("SELECT * FROM Organizer WHERE OrganizerID = %s", (organizer_id,))
                details = cursor.fetchone()
                if not details: return jsonify({"error": "Organizer not found"}), 404
                event_query = "SELECT e.EventID, e.EventName, e.StartDate, v.City FROM Event e JOIN Venue v ON e.VenueID = v.VenueID WHERE e.OrganizerID = %s ORDER BY e.StartDate"
                cursor.execute(event_query, (organizer_id,))
                events = cursor.fetchall()
                return jsonify({"details": details, "events": events})
            if request.method == 'DELETE':
                cursor.execute("SELECT COUNT(*) as count FROM Event WHERE OrganizerID = %s", (organizer_id,))
                if cursor.fetchone()['count'] > 0:
                    return jsonify({"error": "Cannot delete: Organizer is in use by an event."}), 409
                cursor.execute("DELETE FROM Organizer WHERE OrganizerID = %s", (organizer_id,))
                conn.commit()
                return jsonify({"message": "Organizer deleted successfully"})
            if request.method == 'PUT':
                data = request.get_json()
                query = "UPDATE Organizer SET OrganizerName=%s, ContactEmail=%s, ContactPhone=%s WHERE OrganizerID=%s"
                cursor.execute(query, (data['OrganizerName'], data['ContactEmail'], data['ContactPhone'], organizer_id))
                conn.commit()
                return jsonify({"message": "Organizer updated successfully"})
    except pymysql.Error as err:
        conn.rollback()
        return jsonify({"error": str(err)}), 400
    finally:
        if conn: conn.close()

# --- [ATTENDEE ENDPOINTS] ---
@app.route('/api/attendees', methods=['GET', 'POST'])
def manage_attendees():
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor() as cursor:
            if request.method == 'GET':
                search_term = request.args.get('search', '')
                params = []
                query = "SELECT * FROM Attendee"
                if search_term:
                    query += " WHERE FullName LIKE %s OR Email LIKE %s"
                    params.extend([f"%{search_term}%", f"%{search_term}%"])
                query += " ORDER BY FullName"
                cursor.execute(query, params)
                return jsonify(cursor.fetchall())
            if request.method == 'POST':
                data = request.get_json()
                query = "INSERT INTO Attendee (FullName, Email, Phone, RegistrationDate) VALUES (%s, %s, %s, CURDATE())"
                cursor.execute(query, (data['FullName'], data['Email'], data['Phone']))
                conn.commit()
                return jsonify({"message": "Attendee added successfully", "id": cursor.lastrowid}), 201
    except pymysql.Error as err:
        conn.rollback()
        return jsonify({"error": str(err)}), 400
    finally:
        if conn: conn.close()

@app.route('/api/attendees/<int:attendee_id>', methods=['GET', 'DELETE', 'PUT'])
def manage_single_attendee(attendee_id):
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor() as cursor:
            if request.method == 'GET':
                cursor.execute("SELECT * FROM Attendee WHERE AttendeeID = %s", (attendee_id,))
                details = cursor.fetchone()
                if not details: return jsonify({"error": "Attendee not found"}), 404
                event_query = "SELECT e.EventID, e.EventName, e.StartDate, t.TicketType FROM Event e JOIN Ticket t ON e.EventID = t.EventID WHERE t.AttendeeID = %s ORDER BY e.StartDate"
                cursor.execute(event_query, (attendee_id,))
                events = cursor.fetchall()
                return jsonify({"details": details, "events": events})
            if request.method == 'DELETE':
                cursor.execute("SELECT COUNT(*) as count FROM Ticket WHERE AttendeeID = %s", (attendee_id,))
                if cursor.fetchone()['count'] > 0:
                    return jsonify({"error": "Cannot delete: Attendee has tickets for an event. Please cancel registrations first."}), 409
                cursor.execute("DELETE FROM Attendee WHERE AttendeeID = %s", (attendee_id,))
                conn.commit()
                return jsonify({"message": "Attendee deleted successfully"})
            if request.method == 'PUT':
                data = request.get_json()
                query = "UPDATE Attendee SET FullName=%s, Email=%s, Phone=%s WHERE AttendeeID=%s"
                cursor.execute(query, (data['FullName'], data['Email'], data['Phone'], attendee_id))
                conn.commit()
                return jsonify({"message": "Attendee updated successfully"})
    except pymysql.Error as err:
        conn.rollback()
        return jsonify({"error": str(err)}), 400
    finally:
        if conn: conn.close()

# --- [SCHEDULE & TICKET ENDPOINTS] ---
@app.route('/api/events/<int:event_id>/schedule', methods=['POST'])
def add_schedule_item(event_id):
    data = request.get_json()
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor() as cursor:
            query = "INSERT INTO Schedule (EventID, ActivityName, Speaker, StartTime, EndTime) VALUES (%s, %s, %s, %s, %s)"
            cursor.execute(query, (event_id, data['ActivityName'], data.get('Speaker'), data['StartTime'], data['EndTime']))
            conn.commit()
            return jsonify({"message": "Schedule item added successfully", "id": cursor.lastrowid}), 201
    except pymysql.Error as err:
        conn.rollback()
        return jsonify({"error": str(err)}), 400
    finally:
        if conn: conn.close()

@app.route('/api/schedule/<int:schedule_id>', methods=['DELETE'])
def delete_schedule_item(schedule_id):
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM Schedule WHERE ScheduleID = %s", (schedule_id,))
            conn.commit()
            return jsonify({"message": "Schedule item deleted successfully"})
    except pymysql.Error as err:
        conn.rollback()
        return jsonify({"error": str(err)}), 400
    finally:
        if conn: conn.close()

@app.route('/api/tickets/register', methods=['POST'])
def register_for_event():
    data = request.get_json()
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT AttendeeID FROM Attendee WHERE Email = %s", (data['Email'],))
            attendee = cursor.fetchone()
            if attendee:
                attendee_id = attendee['AttendeeID']
            else:
                query = "INSERT INTO Attendee (FullName, Email, Phone, RegistrationDate) VALUES (%s, %s, %s, CURDATE())"
                cursor.execute(query, (data['FullName'], data['Email'], data.get('Phone')))
                attendee_id = cursor.lastrowid
            ticket_query = "INSERT INTO Ticket (EventID, AttendeeID, TicketType, Price, PurchaseDate) VALUES (%s, %s, %s, %s, CURDATE())"
            cursor.execute(ticket_query, (data['EventID'], attendee_id, data['TicketType'], data['Price']))
            conn.commit()
            return jsonify({"message": "Successfully registered for the event!"}), 201
    except pymysql.Error as err:
        conn.rollback()
        return jsonify({"error": str(err)}), 400
    finally:
        if conn: conn.close()

@app.route('/api/tickets/<int:ticket_id>', methods=['DELETE'])
def delete_ticket(ticket_id):
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM Ticket WHERE TicketID = %s", (ticket_id,))
            conn.commit()
            return jsonify({"message": "Registration successfully cancelled."})
    except pymysql.Error as err:
        conn.rollback()
        return jsonify({"error": str(err)}), 400
    finally:
        if conn: conn.close()

# --- MAIN EXECUTION ---
if __name__ == '__main__':
    app.run(debug=True, port=5000)

