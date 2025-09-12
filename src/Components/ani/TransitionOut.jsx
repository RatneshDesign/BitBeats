// GridFadeInTransition.jsx
import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";

function GridFadeInTransition({ cols = 7, rows = 5, duration = 1.5 }) {
  const [done, setDone] = useState(false);
  const total = cols * rows;
  const animTime = 0.15;

  const orderMap = useMemo(() => {
    const arr = [];
    for (let c = cols - 1; c >= 0; c--) {
      const colFromRight = cols - 1 - c;
      const bottomToTop = colFromRight % 2 === 0;
      if (bottomToTop) {
        for (let r = rows - 1; r >= 0; r--) arr.push(r * cols + c);
      } else {
        for (let r = 0; r < rows; r++) arr.push(r * cols + c);
      }
    }
    const map = new Array(total);
    arr.forEach((cellIndex, orderIndex) => {
      map[cellIndex] = orderIndex;
    });
    return map;
  }, [cols, rows, total]);

  const orderIndexToDelay = (orderIndex) => {
    if (total <= 1) return 0;
    const maxStart = Math.max(0, duration - animTime);
    return (orderIndex * maxStart) / (total - 1);
  };

  useEffect(() => {
    const timer = setTimeout(() => setDone(true), duration * 1000 + 300);
    return () => clearTimeout(timer);
  }, [duration]);

  if (done) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        zIndex: 9999,
      }}
    >
      {Array.from({ length: total }).map((_, i) => {
        const orderIndex = orderMap[i];
        const delay = orderIndexToDelay(orderIndex);
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: animTime, delay, ease: "easeInOut" }}
            style={{ background: "#000", width: "100%", height: "100%" }}
          />
        );
      })}
    </div>
  );
}

export default GridFadeInTransition;
