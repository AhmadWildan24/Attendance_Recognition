
import { NavLink } from "react-router-dom";

function Sidebar() {
  const menuItems = [
    { name: "Dashboard", path: "/" },
    { name: "Absensi", path: "/absensi" }
  ];

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-white p-6">

      <h1 className="text-xl font-bold mb-10">
        PU Attendance
      </h1>

      <nav className="space-y-3">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              `block p-3 rounded-lg transition ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-slate-800"
              }`
            }
          >
            {item.name}
          </NavLink>
        ))}
      </nav>

    </aside>
  );
}

export default Sidebar;
