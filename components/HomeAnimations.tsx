"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function HomeAnimations() {
  const pathname = usePathname();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    const observe = () =>
      document.querySelectorAll(".animate-in:not(.visible)").forEach((el) => observer.observe(el));

    // Observe immediately + after a frame (handles client-side navigation timing)
    observe();
    const raf = requestAnimationFrame(observe);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
