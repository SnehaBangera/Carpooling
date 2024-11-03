# app.py
from flask import Flask, render_template, request, redirect, url_for
import sqlite3

app = Flask(__name__)

# Database connection function
def get_db_connection():
    conn = sqlite3.connect('carpool.db')
    conn.row_factory = sqlite3.Row
    return conn

# Home route
@app.route('/')
def index():
    return render_template('index.html')

# Route to display user data
@app.route('/users')
def users():
    conn = get_db_connection()
    users = conn.execute('SELECT * FROM User').fetchall()
    conn.close()
    return render_template('users.html', users=users)

# Route to add a user
@app.route('/add_user', methods=['POST'])
def add_user():
    name = request.form['name']
    email = request.form['email']
    phone_number = request.form['phone_number']
    password = request.form['password']
    address = request.form['address']

    conn = get_db_connection()
    conn.execute("INSERT INTO User (name, email, phone_number, password, address) VALUES (?, ?, ?, ?, ?)",
                 (name, email, phone_number, password, address))
    conn.commit()
    conn.close()
    return redirect(url_for('users'))

if __name__ == '__main__':
    app.run(debug=True)
