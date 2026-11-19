from datetime import datetime
from zoneinfo import ZoneInfo

from database import get_db_connection

WIB = ZoneInfo("Asia/Jakarta")


def check_in_dosen(id_dosen, id_jadwal):

    conn = get_db_connection()

    if conn is None:
        return {
            "success": False,
            "message": "Database tidak dapat dihubungkan."
        }, 500

    cursor = conn.cursor(dictionary=True)

    try:
        # 1. Periksa apakah dosen terdaftar
        cursor.execute("""
            SELECT id_dosen, nama_dosen
            FROM Dosen
            WHERE id_dosen = %s
        """, (id_dosen,))

        dosen = cursor.fetchone()

        if not dosen:
            return {
                "success": False,
                "message": "ID dosen tidak ditemukan."
            }, 404

        # 2. Periksa apakah jadwal terdaftar
        cursor.execute("""
            SELECT id_jadwal, id_dosen
            FROM Jadwal
            WHERE id_jadwal = %s
        """, (id_jadwal,))

        jadwal = cursor.fetchone()

        if not jadwal:
            return {
                "success": False,
                "message": "ID jadwal tidak ditemukan."
            }, 404

        # 3. Pastikan jadwal milik dosen tersebut
        if jadwal["id_dosen"] != id_dosen:
            return {
                "success": False,
                "message": "Jadwal tersebut bukan milik dosen ini."
            }, 403

        # 4. Ambil tanggal dan waktu server
        now = datetime.now(WIB)
        tanggal = now.date()
        waktu = now.replace(tzinfo=None)

        # 5. Periksa apakah absensi sudah ada
        cursor.execute("""
            SELECT id_absen
            FROM Absensi
            WHERE id_jadwal = %s
            AND tanggal_absen = %s
        """, (id_jadwal, tanggal))

        existing = cursor.fetchone()

        if existing:
            return {
                "success": False,
                "message": "Dosen sudah melakukan check-in untuk jadwal ini hari ini."
            }, 409

        # 6. Simpan absensi
        cursor.execute("""
            INSERT INTO Absensi (
                id_jadwal,
                tanggal_absen,
                check_in,
                status_absen
            )
            VALUES (%s, %s, %s, %s)
        """, (
            id_jadwal,
            tanggal,
            waktu,
            "Hadir"
        ))

        conn.commit()

        return {
            "success": True,
            "message": "Check-in berhasil.",
            "data": {
                "id_absen": cursor.lastrowid,
                "id_dosen": id_dosen,
                "nama_dosen": dosen["nama_dosen"],
                "id_jadwal": id_jadwal,
                "tanggal_absen": tanggal.isoformat(),
                "check_in": waktu.isoformat()
            }
        }, 201

    except Exception as error:
        conn.rollback()

        print(f"Check-in error: {error}")

        return {
            "success": False,
            "message": "Terjadi kesalahan pada server."
        }, 500

    finally:
        cursor.close()
        conn.close()


def check_out_dosen(id_dosen, id_jadwal):

    conn = get_db_connection()

    if conn is None:
        return {
            "success": False,
            "message": "Database tidak dapat dihubungkan."
        }, 500

    cursor = conn.cursor(dictionary=True)

    try:
        # 1. Periksa dosen
        cursor.execute("""
            SELECT id_dosen, nama_dosen
            FROM Dosen
            WHERE id_dosen = %s
        """, (id_dosen,))

        dosen = cursor.fetchone()

        if not dosen:
            return {
                "success": False,
                "message": "ID dosen tidak ditemukan."
            }, 404

        # 2. Periksa jadwal dan kepemilikan dosen
        cursor.execute("""
            SELECT id_jadwal, id_dosen
            FROM Jadwal
            WHERE id_jadwal = %s
        """, (id_jadwal,))

        jadwal = cursor.fetchone()

        if not jadwal:
            return {
                "success": False,
                "message": "ID jadwal tidak ditemukan."
            }, 404

        if jadwal["id_dosen"] != id_dosen:
            return {
                "success": False,
                "message": "Jadwal tersebut bukan milik dosen ini."
            }, 403

        now = datetime.now(WIB)
        tanggal = now.date()
        waktu = now.replace(tzinfo=None)

        # 3. Cari data check-in hari ini
        cursor.execute("""
            SELECT id_absen, check_out
            FROM Absensi
            WHERE id_jadwal = %s
            AND tanggal_absen = %s
        """, (id_jadwal, tanggal))

        absensi = cursor.fetchone()

        if not absensi:
            return {
                "success": False,
                "message": "Data check-in belum ditemukan."
            }, 404

        if absensi["check_out"] is not None:
            return {
                "success": False,
                "message": "Dosen sudah melakukan check-out."
            }, 409

        # 4. Update check-out
        cursor.execute("""
            UPDATE Absensi
            SET check_out = %s
            WHERE id_absen = %s
        """, (waktu, absensi["id_absen"]))

        conn.commit()

        return {
            "success": True,
            "message": "Check-out berhasil.",
            "data": {
                "id_absen": absensi["id_absen"],
                "id_dosen": id_dosen,
                "nama_dosen": dosen["nama_dosen"],
                "id_jadwal": id_jadwal,
                "tanggal_absen": tanggal.isoformat(),
                "check_out": waktu.isoformat()
            }
        }, 200

    except Exception as error:
        conn.rollback()

        print(f"Check-out error: {error}")

        return {
            "success": False,
            "message": "Terjadi kesalahan pada server."
        }, 500

    finally:
        cursor.close()
        conn.close()