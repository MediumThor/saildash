import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Music() {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-8">
      <button
        className="w-72 h-40 text-4xl bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition"
      >
        Offline Music
      </button>
    </div>
  );
}
