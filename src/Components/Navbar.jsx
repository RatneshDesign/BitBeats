import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import React, { useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/browse", label: "Browse" },
  { href: "/play", label: "Play" },
  { href: "/about", label: "About" },
];

function Navbar() {
  const location = useLocation();
  const [hovered, setHovered] = useState(null);

  const pillTarget = hovered || location.pathname;

  return (
    <nav className="p-3 fixed z-10 top-[10px] overflow-hidden border-[#e1e1e1] border-[1.5px] bg-[#ffffff] rounded-full flex gap-1 items-center w-fit">
      {links.map((link) => {
        const isHighlighted = pillTarget === link.href;

        return (
          <NavLink
            key={link.href}
            to={link.href}
            onMouseEnter={() => setHovered(link.href)}
            onMouseLeave={() => setHovered(null)}
            className="relative py-1 px-4 rounded-full"
          >
            {isHighlighted && (
              <motion.span
                layoutId="pill"
                className="absolute inset-0 bg-black rounded-full"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <span
              className={`relative z-10 ${
                isHighlighted ? "text-white" : "text-black"
              }`}
            >
              {link.label}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default Navbar;
