import React from "react";
import { useSidebar } from "../context/SidebarContext";
import { Link, useLocation } from "react-router-dom";

  const navItems = [
    { label: "Dashboard", path: "/" },
    { label: "Charts", path: "/charts" },
  ];


export default function SidebarMicro({ nightMode }) {
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const location = useLocation();

  return (
    <div
      className={`w-64 sm:w-80 bg-zinc-800/30 p-4 pt-28 sm:pt-24 flex flex-col justify-between items-center shadow-lg backdrop-blur-lg transform transition-transform duration-300 fixed top-0 h-full z-[9999] ${
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      } ${nightMode ? "text-amber-500" : "text-white"}`}
    >
      {/* Top: Title + Nav */}
      <div className="w-full flex flex-col space-y-10 items-center sm:space-y-14">

        <nav className="w-full flex flex-col space-y-6 sm:space-y-10">
          {navItems.map((item, index) => (
            <Link
              key={index}
              to={item.path}
              className={`flex items-center px-4 py-6 sm:px-6 sm:py-10 rounded-2xl w-full text-left text-2xl sm:text-3xl hover:bg-zinc-600 active:scale-95 transition-transform duration-100 ${
                location.pathname === item.path ? "bg-zinc-700" : "bg-zinc-800"
              }`}
            >
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Bottom: Close Button */}
      <button
        onClick={toggleSidebar}
        className="w-full mt-6 sm:mt-10 px-4 py-6 sm:px-6 sm:py-10 rounded-2xl text-left text-xl sm:text-2xl hover:bg-zinc-600 bg-zinc-700 active:scale-95 transition-transform duration-100"
        aria-label="Hide Sidebar"
      >
        ← Close
      </button>
    </div>
  );
}
