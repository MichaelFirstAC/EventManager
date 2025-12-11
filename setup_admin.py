# setup_admin.py
# Bootstrap a default organizer/admin account in the database.
import pymysql
from werkzeug.security import generate_password_hash

db_config = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': 'michael4291',
    'database': 'eventmanagementsystem',
}

admin_email = 'admin@eventmanager.com'
admin_password = 'admin123'  # Change this to your desired password

hashed_password = generate_password_hash(admin_password)

conn = pymysql.connect(**db_config)
cursor = conn.cursor()

# Update or insert admin
cursor.execute("""
    INSERT INTO Organizer (OrganizerName, ContactEmail, ContactPhone, Password, Role) 
    VALUES (%s, %s, %s, %s, %s)
    ON DUPLICATE KEY UPDATE Password = VALUES(Password)
""", ('Admin User', admin_email, '000-0000', hashed_password, 'ADMIN'))

conn.commit()
cursor.close()
conn.close()

print(f"Admin user set up!")
print(f"Email: {admin_email}")
print(f"Password: {admin_password}")