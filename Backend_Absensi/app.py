from flask import Flask, jsonify
from flask_cors import CORS

from config import Config
from database import get_db_connection
from routes.absensi_routes import absensi_bp

app = Flask(__name__)

# Mengizinkan frontend mengakses API
CORS(app)

# Registrasi endpoint absensi
app.register_blueprint(
    absensi_bp,
    url_prefix="/api/absensi"
)


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "success": True,
        "message": "API Absensi Dosen berjalan."
    })


@app.route("/api/health", methods=["GET"])
def health():

    conn = get_db_connection()

    if conn is None:
        return jsonify({
            "success": False,
            "message": "Database tidak terhubung."
        }), 503

    conn.close()

    return jsonify({
        "success": True,
        "message": "Backend dan database terhubung."
    })


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=Config.FLASK_PORT,
        debug=True
    )