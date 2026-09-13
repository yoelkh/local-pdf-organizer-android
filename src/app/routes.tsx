import { Navigate, Route, Routes } from "react-router-dom";
import { tools } from "@/features/registry";
import { HomePage } from "@/features/home/HomePage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      {tools.map((tool) => (
        <Route key={tool.id} path={tool.route} element={<tool.Page />} />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
