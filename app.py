"""Event Manager Pro API.

This Flask app exposes authentication, event/venue/organizer CRUD, ticketing,
and payment-confirmation endpoints. Sessions are stored server-side to avoid
client tampering.
"""
# File: EventManagerPro/app.py
# Event Management System API - Flask Backend with Authentication

from flask import Flask, jsonify, request, session
from flask_cors import CORS
from flask_session import Session as FlaskSession
import pymysql
from pymysql.cursors import DictCursor
from werkzeug.security import generate_password_hash, check_password_hash
import secrets
from datetime import datetime, timedelta
import os

# --- DATABASE CONFIGURATION ---
db_config = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': 'michael4291',
    'database': 'eventmanagementsystem',
    'cursorclass': DictCursor
}

# --- FLASK APP INITIALIZATION ---
app = Flask(__name__)
CORS(app, supports_credentials=True)

# Configure Flask session
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)
FlaskSession(app)

# --- HELPER FUNCTIONS ---
def get_db_connection():
    """Establishes and returns a connection to the MySQL database."""
    try:
        conn = pymysql.connect(**db_config)
        return conn
    except pymysql.Error as err:
        print(f"Error connecting to database: {err}")
        return None

def create_session_token(user_id, user_type):
    """Creates and stores a session token for the given user."""
    conn = get_db_connection()
    if not conn:
        return None
    try:
        with conn.cursor() as cursor:
            token = secrets.token_urlsafe(32)
            expires_at = datetime.now() + timedelta(days=7)
            query = "INSERT INTO Session (UserID, UserType, SessionToken, ExpiresAt) VALUES (%s, %s, %s, %s)"
            cursor.execute(query, (user_id, user_type, token, expires_at))
            conn.commit()
            return token
    except pymysql.Error as err:
        print(f"Error creating session: {err}")
        return None
    finally:
        if conn:
            conn.close()

def verify_session_token(token):
    """Looks up a session token and ensures it is still valid."""
    conn = get_db_connection()
    if not conn:
        return None
    try:
        with conn.cursor() as cursor:
            query = """SELECT * FROM Session 
                      WHERE SessionToken = %s AND ExpiresAt > NOW()"""
            cursor.execute(query, (token,))
            session_record = cursor.fetchone()
            if not session_record:
                return None
            return session_record
    except pymysql.Error as err:
        print(f"Error verifying session: {err}")
        return None
    finally:
        if conn:
            conn.close()

def get_current_user():
    """Resolves the current user from the bearer token and loads their record."""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return None
    
    session_record = verify_session_token(token)
    if not session_record:
        return None
    
    user_id = session_record['UserID']
    user_type = session_record['UserType']
    
    conn = get_db_connection()
    if not conn:
        return None
    try:
        with conn.cursor() as cursor:
            if user_type == 'ORGANIZER':
                cursor.execute("SELECT * FROM Organizer WHERE OrganizerID = %s", (user_id,))
            else:
                cursor.execute("SELECT * FROM Attendee WHERE AttendeeID = %s", (user_id,))
            user = cursor.fetchone()
            if user:
                user['UserType'] = user_type
            return user
    except pymysql.Error as err:
        print(f"Error getting user: {err}")
        return None
    finally:
        if conn:
            conn.close()

def require_login(f):
    """Decorator: block access unless a valid session is present."""
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Unauthorized. Please log in."}), 401
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

def require_admin(f):
    """Decorator: block access unless current user is an organizer/admin."""
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user or user.get('UserType') != 'ORGANIZER':
            return jsonify({"error": "Unauthorized. Admin access required."}), 403
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

# --- [AUTHENTICATION ENDPOINTS] ---
@app.route('/api/login', methods=['POST'])
def login():
    """Authenticate organizer/attendee, verify password, and mint a session token."""
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    user_type = data.get('userType')  # 'ORGANIZER' or 'ATTENDEE'
    
    if not email or not password or not user_type:
        return jsonify({"error": "Email, password, and userType are required."}), 400
    
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        with conn.cursor() as cursor:
            if user_type == 'ORGANIZER':
                cursor.execute("SELECT * FROM Organizer WHERE ContactEmail = %s", (email,))
            elif user_type == 'ATTENDEE':
                cursor.execute("SELECT * FROM Attendee WHERE Email = %s", (email,))
            else:
                return jsonify({"error": "Invalid userType."}), 400
            
            user = cursor.fetchone()
            if not user:
                return jsonify({"error": "Invalid email or password."}), 401
            
            # Verify password
            if not check_password_hash(user['Password'], password):
                return jsonify({"error": "Invalid email or password."}), 401
            
            # Create session token once credentials are valid
            user_id = user['OrganizerID'] if user_type == 'ORGANIZER' else user['AttendeeID']
            token = create_session_token(user_id, user_type)
            
            if not token:
                return jsonify({"error": "Failed to create session."}), 500
            
            return jsonify({
                "message": "Login successful",
                "token": token,
                "userType": user_type,
                "userName": user.get('OrganizerName') or user.get('FullName')
            }), 200
    except pymysql.Error as err:
        return jsonify({"error": str(err)}), 400
    finally:
        if conn:
            conn.close()

@app.route('/api/register', methods=['POST'])
def register():
    """Register a new attendee account (public endpoint)."""
    data = request.get_json()
    full_name = data.get('fullName')
    email = data.get('email')
    phone = data.get('phone', '')
    password = data.get('password')
    
    if not full_name or not email or not password:
        return jsonify({"error": "Full name, email, and password are required."}), 400
    
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        with conn.cursor() as cursor:
            # Check if email already exists
            cursor.execute("SELECT AttendeeID FROM Attendee WHERE Email = %s", (email,))
            if cursor.fetchone():
                return jsonify({"error": "Email already registered."}), 409
            
            # Hash password before storing
            hashed_password = generate_password_hash(password)
            
            # Insert new attendee
            query = "INSERT INTO Attendee (FullName, Email, Phone, Password, Role, RegistrationDate) VALUES (%s, %s, %s, %s, %s, CURDATE())"
            cursor.execute(query, (full_name, email, phone, hashed_password, 'PARTICIPANT'))
            conn.commit()
            
            return jsonify({"message": "Registration successful. Please log in."}), 201
    except pymysql.Error as err:
        conn.rollback()
        return jsonify({"error": str(err)}), 400
    finally:
        if conn:
            conn.close()

@app.route('/api/logout', methods=['POST'])
@require_login
def logout():
    """Logs out the current user by invalidating their session."""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM Session WHERE SessionToken = %s", (token,))
            conn.commit()
            return jsonify({"message": "Logout successful"}), 200
    except pymysql.Error as err:
        return jsonify({"error": str(err)}), 400
    finally:
        if conn:
            conn.close()

@app.route('/api/me', methods=['GET'])
@require_login
def get_current_user_info():
    """Returns information about the currently logged-in user."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({
        "userType": user.get('UserType'),
        "userName": user.get('OrganizerName') or user.get('FullName'),
        "email": user.get('ContactEmail') or user.get('Email'),
        "userId": user.get('OrganizerID') or user.get('AttendeeID')
    }), 200

# --- [EVENT ENDPOINTS] ---
@app.route('/api/events', methods=['GET', 'POST'])
def manage_events():
    """
    GET: Returns list of all events (accessible to all users).
    POST: Creates a new event (admin only).
    """
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor() as cursor:
            if request.method == 'GET':
                search_term = request.args.get('search', '')
                params = []
                # Basic listing with optional fuzzy search over name/city
                query = "SELECT e.EventID, e.EventName, e.StartDate, v.City FROM Event e JOIN Venue v ON e.VenueID = v.VenueID"
                if search_term:
                    query += " WHERE e.EventName LIKE %s OR v.City LIKE %s"
                    params.extend([f"%{search_term}%", f"%{search_term}%"])
                query += " ORDER BY e.StartDate"
                cursor.execute(query, params)
                return jsonify(cursor.fetchall())
            
            if request.method == 'POST':
                # Admin only
                user = get_current_user()
                if not user or user.get('UserType') != 'ORGANIZER':
                    return jsonify({"error": "Unauthorized. Admin access required."}), 403
                
                data = request.get_json()
                # Store base ticket price on the event; VIP math happens on update too
                query = "INSERT INTO Event (EventName, EventType, StartDate, EndDate, VenueID, OrganizerID, Price) VALUES (%s, %s, %s, %s, %s, %s, %s)"
                cursor.execute(query, (data['EventName'], data['EventType'], data['StartDate'], data['EndDate'], data['VenueID'], data['OrganizerID'], data.get('Price', 0.00)))
                conn.commit()
                return jsonify({"message": "Event added successfully", "id": cursor.lastrowid}), 201
    except pymysql.Error as err:
        conn.rollback()
        return jsonify({"error": str(err)}), 400
    finally:
        if conn:
            conn.close()

@app.route('/api/events/<int:event_id>', methods=['GET', 'DELETE', 'PUT'])
def manage_single_event(event_id):
    """
    GET: Returns event details (accessible to all).
    PUT: Updates event (admin only).
    DELETE: Deletes event (admin only).
    """
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor() as cursor:
            if request.method == 'GET':
                # Pull full event with venue/organizer details
                event_query = "SELECT e.*, v.VenueName, v.Address, v.City, o.OrganizerName, o.OrganizerID, o.ContactEmail FROM Event e JOIN Venue v ON e.VenueID = v.VenueID JOIN Organizer o ON e.OrganizerID = o.OrganizerID WHERE e.EventID = %s"
                cursor.execute(event_query, (event_id,))
                event_details = cursor.fetchone()
                if not event_details:
                    return jsonify({"error": "Event not found"}), 404
                
                schedule_query = "SELECT * FROM Schedule WHERE EventID = %s ORDER BY StartTime"
                cursor.execute(schedule_query, (event_id,))
                schedule = cursor.fetchall()
                
                # Show only confirmed (or legacy null) registrations; hide pending
                attendee_query = "SELECT a.*, t.TicketType, t.TicketID, t.Price, t.PurchaseDate FROM Ticket t JOIN Attendee a ON t.AttendeeID = a.AttendeeID WHERE t.EventID = %s AND (t.RegistrationStatus = 'CONFIRMED' OR t.RegistrationStatus IS NULL) ORDER BY a.FullName"
                cursor.execute(attendee_query, (event_id,))
                attendees = cursor.fetchall()
                
                return jsonify({"details": event_details, "schedule": schedule, "attendees": attendees})

            if request.method == 'DELETE':
                user = get_current_user()
                if not user or user.get('UserType') != 'ORGANIZER':
                    return jsonify({"error": "Unauthorized"}), 403
                
                # Cascade delete schedule/tickets before removing event
                cursor.execute("DELETE FROM Ticket WHERE EventID = %s", (event_id,))
                cursor.execute("DELETE FROM Schedule WHERE EventID = %s", (event_id,))
                cursor.execute("DELETE FROM Event WHERE EventID = %s", (event_id,))
                conn.commit()
                return jsonify({"message": "Event deleted successfully"})
            
            if request.method == 'PUT':
                user = get_current_user()
                if not user or user.get('UserType') != 'ORGANIZER':
                    return jsonify({"error": "Unauthorized"}), 403
                
                data = request.get_json()
                new_base_price = float(data.get('Price', 0.00))
                
                # Update base event info
                event_update_query = "UPDATE Event SET EventName=%s, EventType=%s, StartDate=%s, EndDate=%s, VenueID=%s, OrganizerID=%s, Price=%s WHERE EventID=%s"
                cursor.execute(event_update_query, (data['EventName'], data['EventType'], data['StartDate'], data['EndDate'], data['VenueID'], data['OrganizerID'], new_base_price, event_id))
                
                # Recompute ticket prices based on updated base price
                ticket_update_query = "UPDATE Ticket SET Price = CASE WHEN TicketType = 'VIP' THEN %s * 1.5 ELSE %s END WHERE EventID = %s"
                cursor.execute(ticket_update_query, (new_base_price, new_base_price, event_id))
                
                conn.commit()
                return jsonify({"message": "Event and all associated ticket prices updated successfully"})
    except pymysql.Error as err:
        conn.rollback()
        return jsonify({"error": str(err)}), 400
    finally:
        if conn:
            conn.close()

# --- [VENUE ENDPOINTS] ---
@app.route('/api/venues', methods=['GET', 'POST'])
def manage_venues():
    """GET: All users. POST: Admin only."""
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor() as cursor:
            if request.method == 'GET':
                # List all venues for dropdowns/admin listing
                cursor.execute("SELECT * FROM Venue ORDER BY VenueName")
                return jsonify(cursor.fetchall())
            if request.method == 'POST':
                user = get_current_user()
                if not user or user.get('UserType') != 'ORGANIZER':
                    return jsonify({"error": "Unauthorized"}), 403
                
                data = request.get_json()
                # Add new venue record
                query = "INSERT INTO Venue (VenueName, Address, City, Capacity) VALUES (%s, %s, %s, %s)"
                cursor.execute(query, (data['VenueName'], data['Address'], data['City'], data['Capacity']))
                conn.commit()
                return jsonify({"message": "Venue added successfully", "id": cursor.lastrowid}), 201
    except pymysql.Error as err:
        conn.rollback()
        return jsonify({"error": str(err)}), 400
    finally:
        if conn:
            conn.close()

@app.route('/api/venues/<int:venue_id>', methods=['GET', 'DELETE', 'PUT'])
def manage_single_venue(venue_id):
    """GET: All users. PUT/DELETE: Admin only."""
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor() as cursor:
            if request.method == 'GET':
                cursor.execute("SELECT * FROM Venue WHERE VenueID = %s", (venue_id,))
                venue = cursor.fetchone()
                if not venue:
                    return jsonify({"error": "Venue not found"}), 404
                return jsonify(venue)
            if request.method == 'DELETE':
                user = get_current_user()
                if not user or user.get('UserType') != 'ORGANIZER':
                    return jsonify({"error": "Unauthorized"}), 403
                
                # Prevent deleting venues that are still referenced by events
                cursor.execute("SELECT COUNT(*) as count FROM Event WHERE VenueID = %s", (venue_id,))
                if cursor.fetchone()['count'] > 0:
                    return jsonify({"error": "Cannot delete: Venue is in use by an event."}), 409
                cursor.execute("DELETE FROM Venue WHERE VenueID = %s", (venue_id,))
                conn.commit()
                return jsonify({"message": "Venue deleted successfully"})
            if request.method == 'PUT':
                user = get_current_user()
                if not user or user.get('UserType') != 'ORGANIZER':
                    return jsonify({"error": "Unauthorized"}), 403
                
                data = request.get_json()
                query = "UPDATE Venue SET VenueName=%s, Address=%s, City=%s, Capacity=%s WHERE VenueID=%s"
                cursor.execute(query, (data['VenueName'], data['Address'], data['City'], data['Capacity'], venue_id))
                conn.commit()
                return jsonify({"message": "Venue updated successfully"})
    except pymysql.Error as err:
        conn.rollback()
        return jsonify({"error": str(err)}), 400
    finally:
        if conn:
            conn.close()

# --- [ORGANIZER ENDPOINTS] ---
@app.route('/api/organizers', methods=['GET', 'POST'])
def manage_organizers():
    """GET: Admin only. POST: Admin only."""
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor() as cursor:
            if request.method == 'GET':
                user = get_current_user()
                if not user or user.get('UserType') != 'ORGANIZER':
                    return jsonify({"error": "Unauthorized"}), 403
                
                # Hide the bootstrap super-admin from listings
                cursor.execute("SELECT OrganizerID, OrganizerName, ContactEmail, ContactPhone FROM Organizer WHERE ContactEmail != 'admin@eventmanager.com' ORDER BY OrganizerName")
                return jsonify(cursor.fetchall())
            if request.method == 'POST':
                user = get_current_user()
                if not user or user.get('UserType') != 'ORGANIZER':
                    return jsonify({"error": "Unauthorized"}), 403
                
                data = request.get_json()
                hashed_password = generate_password_hash(data.get('Password', 'temp123'))
                query = "INSERT INTO Organizer (OrganizerName, ContactEmail, ContactPhone, Password, Role) VALUES (%s, %s, %s, %s, %s)"
                cursor.execute(query, (data['OrganizerName'], data['ContactEmail'], data.get('ContactPhone'), hashed_password, 'ADMIN'))
                conn.commit()
                return jsonify({"message": "Organizer added successfully", "id": cursor.lastrowid}), 201
    except pymysql.Error as err:
        conn.rollback()
        return jsonify({"error": str(err)}), 400
    finally:
        if conn:
            conn.close()

@app.route('/api/organizers/<int:organizer_id>', methods=['GET', 'DELETE', 'PUT'])
def manage_single_organizer(organizer_id):
    """Admin only."""
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor() as cursor:
            if request.method == 'GET':
                user = get_current_user()
                if not user or user.get('UserType') != 'ORGANIZER':
                    return jsonify({"error": "Unauthorized"}), 403
                
                cursor.execute("SELECT OrganizerID, OrganizerName, ContactEmail, ContactPhone FROM Organizer WHERE OrganizerID = %s", (organizer_id,))
                details = cursor.fetchone()
                if not details:
                    return jsonify({"error": "Organizer not found"}), 404
                
                event_query = "SELECT e.EventID, e.EventName, e.StartDate, v.City FROM Event e JOIN Venue v ON e.VenueID = v.VenueID WHERE e.OrganizerID = %s ORDER BY e.StartDate"
                cursor.execute(event_query, (organizer_id,))
                events = cursor.fetchall()
                return jsonify({"details": details, "events": events})
            if request.method == 'DELETE':
                user = get_current_user()
                if not user or user.get('UserType') != 'ORGANIZER':
                    return jsonify({"error": "Unauthorized"}), 403
                
                # Prevent deletion when organizer still owns events
                cursor.execute("SELECT COUNT(*) as count FROM Event WHERE OrganizerID = %s", (organizer_id,))
                if cursor.fetchone()['count'] > 0:
                    return jsonify({"error": "Cannot delete: Organizer is in use by an event."}), 409
                cursor.execute("DELETE FROM Organizer WHERE OrganizerID = %s", (organizer_id,))
                conn.commit()
                return jsonify({"message": "Organizer deleted successfully"})
            if request.method == 'PUT':
                user = get_current_user()
                if not user or user.get('UserType') != 'ORGANIZER':
                    return jsonify({"error": "Unauthorized"}), 403
                
                data = request.get_json()
                query = "UPDATE Organizer SET OrganizerName=%s, ContactEmail=%s, ContactPhone=%s WHERE OrganizerID=%s"
                cursor.execute(query, (data['OrganizerName'], data['ContactEmail'], data.get('ContactPhone'), organizer_id))
                conn.commit()
                return jsonify({"message": "Organizer updated successfully"})
    except pymysql.Error as err:
        conn.rollback()
        return jsonify({"error": str(err)}), 400
    finally:
        if conn:
            conn.close()

# --- [ATTENDEE ENDPOINTS] ---
@app.route('/api/attendees', methods=['GET', 'POST'])
def manage_attendees():
    """GET: Admin only. POST: Admin only (participant registration is via /api/register)."""
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor() as cursor:
            if request.method == 'GET':
                user = get_current_user()
                if not user or user.get('UserType') != 'ORGANIZER':
                    return jsonify({"error": "Unauthorized"}), 403
                
                search_term = request.args.get('search', '')
                params = []
                query = "SELECT AttendeeID, FullName, Email, Phone, RegistrationDate FROM Attendee"
                if search_term:
                    query += " WHERE FullName LIKE %s OR Email LIKE %s"
                    params.extend([f"%{search_term}%", f"%{search_term}%"])
                query += " ORDER BY FullName"
                cursor.execute(query, params)
                return jsonify(cursor.fetchall())
    except pymysql.Error as err:
        return jsonify({"error": str(err)}), 400
    finally:
        if conn:
            conn.close()

@app.route('/api/attendees/<int:attendee_id>', methods=['GET', 'DELETE', 'PUT'])
def manage_single_attendee(attendee_id):
    """Admin only, with participant self-view capability."""
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor() as cursor:
            user = get_current_user()
            
            if request.method == 'GET':
                cursor.execute("SELECT AttendeeID, FullName, Email, Phone, RegistrationDate FROM Attendee WHERE AttendeeID = %s", (attendee_id,))
                details = cursor.fetchone()
                if not details:
                    return jsonify({"error": "Attendee not found"}), 404
                
                # Participants can only view their own info
                if user and user.get('UserType') == 'ATTENDEE' and user.get('AttendeeID') != attendee_id:
                    return jsonify({"error": "Unauthorized"}), 403
                
                # Show CONFIRMED and legacy NULL registrations, hide PENDING from admin view
                event_query = "SELECT e.EventID, e.EventName, e.StartDate, t.TicketType FROM Event e JOIN Ticket t ON e.EventID = t.EventID WHERE t.AttendeeID = %s AND (t.RegistrationStatus = 'CONFIRMED' OR t.RegistrationStatus IS NULL) ORDER BY e.StartDate"
                cursor.execute(event_query, (attendee_id,))
                events = cursor.fetchall()
                return jsonify({"details": details, "events": events})
            if request.method == 'DELETE':
                if not user or user.get('UserType') != 'ORGANIZER':
                    return jsonify({"error": "Unauthorized"}), 403
                
                cursor.execute("SELECT COUNT(*) as count FROM Ticket WHERE AttendeeID = %s", (attendee_id,))
                if cursor.fetchone()['count'] > 0:
                    return jsonify({"error": "Cannot delete: Attendee has tickets for an event."}), 409
                cursor.execute("DELETE FROM Attendee WHERE AttendeeID = %s", (attendee_id,))
                conn.commit()
                return jsonify({"message": "Attendee deleted successfully"})
            if request.method == 'PUT':
                # Only the attendee themselves can update their profile (admins cannot edit attendees)
                if not user or user.get('UserType') != 'ATTENDEE' or user.get('AttendeeID') != attendee_id:
                    return jsonify({"error": "Unauthorized"}), 403

                data = request.get_json()
                query = "UPDATE Attendee SET FullName=%s, Email=%s, Phone=%s WHERE AttendeeID=%s"
                cursor.execute(query, (data['FullName'], data['Email'], data.get('Phone'), attendee_id))
                conn.commit()
                return jsonify({"message": "Attendee updated successfully"})
    except pymysql.Error as err:
        conn.rollback()
        return jsonify({"error": str(err)}), 400
    finally:
        if conn:
            conn.close()

# --- [SCHEDULE & TICKET ENDPOINTS] ---
@app.route('/api/events/<int:event_id>/schedule', methods=['POST'])
def add_schedule_item(event_id):
    """Admin only."""
    user = get_current_user()
    if not user or user.get('UserType') != 'ORGANIZER':
        return jsonify({"error": "Unauthorized"}), 403
    
    data = request.get_json()
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
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
        if conn:
            conn.close()

@app.route('/api/schedule/<int:schedule_id>', methods=['DELETE'])
def delete_schedule_item(schedule_id):
    """Admin only."""
    user = get_current_user()
    if not user or user.get('UserType') != 'ORGANIZER':
        return jsonify({"error": "Unauthorized"}), 403
    
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM Schedule WHERE ScheduleID = %s", (schedule_id,))
            conn.commit()
            return jsonify({"message": "Schedule item deleted successfully"})
    except pymysql.Error as err:
        conn.rollback()
        return jsonify({"error": str(err)}), 400
    finally:
        if conn:
            conn.close()

@app.route('/api/tickets/register', methods=['POST'])
def register_for_event():
    """Register for an event (available to all users)."""
    data = request.get_json()
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT AttendeeID FROM Attendee WHERE Email = %s", (data['Email'],))
            attendee = cursor.fetchone()
            if attendee:
                attendee_id = attendee['AttendeeID']
            else:
                # Auto-provision attendee if not yet registered (temp password)
                query = "INSERT INTO Attendee (FullName, Email, Phone, Password, Role, RegistrationDate) VALUES (%s, %s, %s, %s, %s, CURDATE())"
                cursor.execute(query, (data['FullName'], data['Email'], data.get('Phone'), generate_password_hash('temp123'), 'PARTICIPANT'))
                attendee_id = cursor.lastrowid
            
            # Check if already registered for this event
            cursor.execute("SELECT TicketID FROM Ticket WHERE EventID = %s AND AttendeeID = %s AND RegistrationStatus != 'CANCELLED'", 
                          (data['EventID'], attendee_id))
            existing_ticket = cursor.fetchone()
            if existing_ticket:
                return jsonify({"error": "You are already registered for this event."}), 409
            
            # Insert ticket as PENDING until payment confirmation
            ticket_query = "INSERT INTO Ticket (EventID, AttendeeID, TicketType, Price, PurchaseDate, RegistrationStatus) VALUES (%s, %s, %s, %s, CURDATE(), 'PENDING')"
            cursor.execute(ticket_query, (data['EventID'], attendee_id, data['TicketType'], data['Price']))
            ticket_id = cursor.lastrowid
            
            # Payment record is automatically created by after_ticket_insert trigger
            
            conn.commit()
            return jsonify({"message": "Registration initiated. Please complete payment to confirm.", "ticketId": ticket_id}), 201
    except pymysql.Error as err:
        conn.rollback()
        return jsonify({"error": str(err)}), 400
    finally:
        if conn:
            conn.close()

@app.route('/api/tickets/<int:ticket_id>', methods=['DELETE'])
def delete_ticket(ticket_id):
    """Cancel registration."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor() as cursor:
            # Verify ownership if participant
            if user.get('UserType') == 'ATTENDEE':
                cursor.execute("SELECT AttendeeID FROM Ticket WHERE TicketID = %s", (ticket_id,))
                ticket = cursor.fetchone()
                if not ticket or ticket['AttendeeID'] != user.get('AttendeeID'):
                    return jsonify({"error": "Unauthorized"}), 403
            
            cursor.execute("DELETE FROM Ticket WHERE TicketID = %s", (ticket_id,))
            conn.commit()
            return jsonify({"message": "Registration successfully cancelled."})
    except pymysql.Error as err:
        conn.rollback()
        return jsonify({"error": str(err)}), 400
    finally:
        if conn:
            conn.close()

# --- [PARTICIPANT-SPECIFIC ENDPOINTS] ---
@app.route('/api/my-events', methods=['GET'])
@require_login
def get_my_events():
    """Returns events registered by the current participant."""
    user = get_current_user()
    if not user or user.get('UserType') != 'ATTENDEE':
        return jsonify({"error": "Only participants can access this."}), 403
    
    attendee_id = user.get('AttendeeID')
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        with conn.cursor() as cursor:
            query = """SELECT e.EventID, e.EventName, e.StartDate, e.EndDate, v.City, t.TicketType, t.TicketID, t.Price,
                              t.RegistrationStatus, p.PaymentID, p.PaymentStatus
                      FROM Event e
                      JOIN Ticket t ON e.EventID = t.EventID
                      JOIN Venue v ON e.VenueID = v.VenueID
                      LEFT JOIN Payment p ON t.TicketID = p.TicketID
                      WHERE t.AttendeeID = %s
                      ORDER BY e.StartDate"""
            cursor.execute(query, (attendee_id,))
            return jsonify(cursor.fetchall())
    except pymysql.Error as err:
        return jsonify({"error": str(err)}), 400
    finally:
        if conn:
            conn.close()

# --- [PAYMENT ENDPOINTS] ---
@app.route('/api/payments/<int:ticket_id>', methods=['GET'])
@require_login
def get_payment_details(ticket_id):
    """Get payment details for a ticket."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        with conn.cursor() as cursor:
            # Verify ownership for participants
            if user.get('UserType') == 'ATTENDEE':
                cursor.execute("SELECT AttendeeID FROM Ticket WHERE TicketID = %s", (ticket_id,))
                ticket = cursor.fetchone()
                if not ticket or ticket['AttendeeID'] != user.get('AttendeeID'):
                    return jsonify({"error": "Unauthorized"}), 403
            
            # Enrich ticket with event, venue, attendee, and payment info
            query = """SELECT t.TicketID, t.EventID, e.EventName, e.StartDate, e.EndDate,
                              v.VenueName, v.Address, v.City,
                              a.FullName, a.Email, a.Phone,
                              t.TicketType, t.Price, t.PurchaseDate, t.RegistrationStatus,
                              p.PaymentID, p.PaymentStatus, p.PaymentDate, p.PaymentMethod
                      FROM Ticket t
                      JOIN Event e ON t.EventID = e.EventID
                      JOIN Venue v ON e.VenueID = v.VenueID
                      JOIN Attendee a ON t.AttendeeID = a.AttendeeID
                      LEFT JOIN Payment p ON t.TicketID = p.TicketID
                      WHERE t.TicketID = %s"""
            cursor.execute(query, (ticket_id,))
            payment_details = cursor.fetchone()
            
            if not payment_details:
                return jsonify({"error": "Payment details not found"}), 404
            
            return jsonify(payment_details), 200
    except pymysql.Error as err:
        return jsonify({"error": str(err)}), 400
    finally:
        if conn:
            conn.close()

@app.route('/api/payments/<int:ticket_id>/confirm', methods=['POST'])
@require_login
def confirm_payment(ticket_id):
    """Confirm payment for a ticket."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        with conn.cursor() as cursor:
            # Verify ownership for participants
            if user.get('UserType') == 'ATTENDEE':
                cursor.execute("SELECT AttendeeID FROM Ticket WHERE TicketID = %s", (ticket_id,))
                ticket = cursor.fetchone()
                if not ticket or ticket['AttendeeID'] != user.get('AttendeeID'):
                    return jsonify({"error": "Unauthorized"}), 403
            
            # Update ticket status to CONFIRMED
            cursor.execute("UPDATE Ticket SET RegistrationStatus = 'CONFIRMED' WHERE TicketID = %s", (ticket_id,))
            
            # Update payment status to COMPLETED with timestamp/method
            cursor.execute("""UPDATE Payment 
                             SET PaymentStatus = 'COMPLETED', PaymentDate = NOW(), PaymentMethod = 'Manual'
                             WHERE TicketID = %s""", (ticket_id,))
            
            conn.commit()
            return jsonify({"message": "Payment confirmed! Your registration is now complete."}), 200
    except pymysql.Error as err:
        conn.rollback()
        return jsonify({"error": str(err)}), 400
    finally:
        if conn:
            conn.close()

# --- MAIN EXECUTION ---
if __name__ == '__main__':
    app.run(debug=True, port=5000)