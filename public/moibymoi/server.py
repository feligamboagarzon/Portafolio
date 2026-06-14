import http.server
import socketserver
import json
import sqlite3
import os
import urllib.parse

PORT = 8000
DB_FILE = "database.sqlite"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            passcode TEXT NOT NULL,
            is_admin INTEGER DEFAULT 0
        )
    ''')
    
    # Seed admin user
    try:
        c.execute("INSERT INTO users (username, passcode, is_admin) VALUES (?, ?, ?)", ("000", "000", 1))
        conn.commit()
    except sqlite3.IntegrityError:
        pass # Admin already exists
        
    conn.close()

class APITaskHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path.startswith('/api/admin/users'):
            # Basic validation
            # In a real app we'd use a token, but for this demo let's assume they pass ?token=000
            query = urllib.parse.urlparse(self.path).query
            params = urllib.parse.parse_qs(query)
            
            if 'token' not in params or params['token'][0] != '000':
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Unauthorized"}).encode())
                return
                
            conn = sqlite3.connect(DB_FILE)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute("SELECT id, username, is_admin FROM users")
            users = [dict(row) for row in c.fetchall()]
            conn.close()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(users).encode())
            return
            
        return super().do_GET()

    def do_POST(self):
        if self.path == '/api/register':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            username = data.get('username')
            passcode = data.get('passcode')
            
            if not username or not passcode:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Missing fields"}).encode())
                return
                
            try:
                conn = sqlite3.connect(DB_FILE)
                c = conn.cursor()
                c.execute("INSERT INTO users (username, passcode) VALUES (?, ?)", (username, passcode))
                conn.commit()
                conn.close()
                
                self.send_response(201)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"message": "User registered"}).encode())
            except sqlite3.IntegrityError:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Username already exists"}).encode())
            return
            
        elif self.path == '/api/login':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            username = data.get('username')
            passcode = data.get('passcode')
            
            conn = sqlite3.connect(DB_FILE)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute("SELECT * FROM users WHERE username=? AND passcode=?", (username, passcode))
            user = c.fetchone()
            conn.close()
            
            if user:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "message": "Login successful",
                    "user": {"id": user['id'], "username": user['username'], "is_admin": user['is_admin']}
                }).encode())
            else:
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Invalid credentials"}).encode())
            return
            
        self.send_response(404)
        self.end_headers()

if __name__ == '__main__':
    init_db()
    with socketserver.TCPServer(("", PORT), APITaskHandler) as httpd:
        print(f"Serving at port {PORT}")
        httpd.serve_forever()
