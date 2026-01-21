import { NavLink } from "react-router";
import { LayoutDashboard, TrendingUp, TrendingDown, Car } from "lucide-react";

export function MobileNav() {
  const menuItems = [
    { label: "Visão", href: "/", icon: LayoutDashboard },
    { label: "Ganhos", href: "/ganhos", icon: TrendingUp },
    { label: "Saídas", href: "/despesas", icon: TrendingDown },
    { label: "Carros", href: "/veiculos", icon: Car },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 pb-safe pt-2 px-6 flex justify-between items-center z-50 h-16 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]">
      {menuItems.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 transition-all duration-200 ${
              isActive
                ? "text-emerald-400 scale-110"
                : "text-gray-500 hover:text-gray-300"
            }`
          }
        >
          <item.icon size={22} strokeWidth={2.5} />
          <span className="text-[10px] font-medium">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}