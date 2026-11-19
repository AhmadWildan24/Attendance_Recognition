
import { Routes, Route } from "react-router-dom";

import Sidebar from "./Sidebar";
import Dashboard from "./Dashboard";
import Absensi from "./Absen";

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex">

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 p-8">

        {/* Navbar */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-xl font-bold">
            PU Attendance
          </h1>

          <div className="bg-white p-3 rounded-lg shadow-sm">
            Admin Kampus
          </div>
        </div>

        {/* Routing */}
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/absensi" element={<Absensi />} />
        </Routes>

      </main>
    </div>
  );
}

export default App;
