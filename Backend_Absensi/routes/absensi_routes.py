from flask import Blueprint, request, jsonify

from services.absensi_service import (
    check_in_dosen,
    check_out_dosen
)

absensi_bp = Blueprint("absensi", __name__)


def validate_payload(data):
    if not isinstance(data, dict):
        return None

    id_dosen = data.get("id_dosen")
    id_jadwal = data.get("id_jadwal")

    # ID harus berupa bilangan bulat positif
    if (
        isinstance(id_dosen, bool)
        or isinstance(id_jadwal, bool)
    ):
        return None

    try:
        id_dosen = int(id_dosen)
        id_jadwal = int(id_jadwal)
    except (ValueError, TypeError):
        return None

    if id_dosen <= 0 or id_jadwal <= 0:
        return None

    return id_dosen, id_jadwal


@absensi_bp.route("/check-in", methods=["POST"])
def check_in():

    data = request.get_json(silent=True)
    payload = validate_payload(data)

    if payload is None:
        return jsonify({
            "success": False,
            "message": "id_dosen dan id_jadwal harus berupa angka positif."
        }), 400

    id_dosen, id_jadwal = payload

    result, status_code = check_in_dosen(
        id_dosen,
        id_jadwal
    )

    return jsonify(result), status_code


@absensi_bp.route("/check-out", methods=["POST"])
def check_out():

    data = request.get_json(silent=True)
    payload = validate_payload(data)

    if payload is None:
        return jsonify({
            "success": False,
            "message": "id_dosen dan id_jadwal harus berupa angka positif."
        }), 400

    id_dosen, id_jadwal = payload

    result, status_code = check_out_dosen(
        id_dosen,
        id_jadwal
    )

    return jsonify(result), status_code