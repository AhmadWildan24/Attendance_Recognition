
function Dashboard() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        Dashboard
      </h2>

      <p className="text-gray-500 mb-8">
        Selamat datang, Administrator
      </p>

      <div className="grid grid-cols-3 gap-6">

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <p className="text-gray-500">Total Dosen</p>
          <h3 className="text-3xl font-bold mt-2">48</h3>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <p className="text-gray-500">Hadir Hari Ini</p>
          <h3 className="text-3xl font-bold text-green-600 mt-2">
            36
          </h3>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <p className="text-gray-500">Belum Hadir</p>
          <h3 className="text-3xl font-bold text-red-500 mt-2">
            12
          </h3>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;
