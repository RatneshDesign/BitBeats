import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Aurora from '../Components/ani/aurora'
import Lenis from "lenis";
import { motion } from "framer-motion";
import ScrollBar from "../Components/Scrollbar/Customscrollbar";
import { StepForward } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

function Home() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: "vertical",
      gestureDirection: "vertical",
      smooth: true,
      smoothTouch: false,
      touchMultiplier: 2,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  const containerRef = useRef(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray(".music-card");

      cards.forEach((card, i) => {
        gsap.fromTo(
          card,
          {
            rotate: 0,
            x: 0,
            y: 0,
          },
          {
            rotate: gsap.getProperty(card, "rotate"),
            x: gsap.getProperty(card, "x"),
            y: gsap.getProperty(card, "y"),
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top bottom-=200px",
              end: "bottom bottom",
              scrub: true,
            },
            delay: i * 0.2,
            duration: 1.5,
            ease: "power2.out",
          }
        );
      });

      // Micro text animations
      gsap.utils.toArray(".scroll-fade").forEach((el) => {
        gsap.fromTo(
          el,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: el,
              start: "top 90%",
              toggleActions: "play none none reverse",
            },
          }
        );
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const images = [
    'https://i.pravatar.cc/150?img=1',
    'https://i.pravatar.cc/150?img=2',
    'https://i.pravatar.cc/150?img=3',
    'https://i.pravatar.cc/150?img=4',
    'https://i.pravatar.cc/150?img=5',
    'https://i.pravatar.cc/150?img=6',
    'https://i.pravatar.cc/150?img=7',
  ];

  return (
    <>
      <ScrollBar />
      {/* Hero Section */}
      <div
        className='flex gap-2.5 relative items-center overflow-hidden w-[100vw] flex-col h-[100vh] justify-center text-center'
      >
        <div className='absolute flex items-center justify-center flex-col top-0 left-0 z-[-1] w-screen h-screen'>
          <div className="absolute flex items-center top-[40vh] right-[80px]">
            play
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={24} height={24} color={"#000000"} fill={"none"}>
              <path d="M9.00005 6C9.00005 6 15 10.4189 15 12C15 13.5812 9 18 9 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg></div>
            <div className=""></div>
        </div>

        <div className='w-full opacity-35 h-full absolute z-[-1]'>
          <Aurora
            colorStops={["#ff66bf", "#ff0088", "#5227ff"]}
            blend={0.5}
            amplitude={1.0}
            speed={1}
          />
        </div>

        <motion.div
          className='flex gap-2 items-center mt-9 mb-3'
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <span className='flex items-center gap-2 px-3 py-1 bg-white rounded-full text-center'>
            Listen to your favorite soundtrack 🎵
          </span>
          <span className='flex items-center gap-2 px-3 py-1 bg-white rounded-full text-center'>
            Discover more 🌌
          </span>
        </motion.div>

        <motion.h1
          className='text-7xl font-bold text-gray-900'
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
        >
          Where Timeless Melodies <br /> Meet Modern Beats
        </motion.h1>

        <motion.p
          className='w-[50%] mt-4 font-medium text-[#373737]'
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.9 }}
        >
          Dive into a world of sound, where every note connects deeply with your soul and every rhythm moves your heart forward.
          Experience music that inspires, heals, and energizes — crafted to bring rhythm, joy, and emotion into your everyday journey.
        </motion.p>

        <motion.button
          className='py-3 px-7 flex items-center gap-2 bg-black text-white rounded-full mt-7'
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
        >
          Start Listening ▶
        </motion.button>
      </div>

      {/* Music Cards Section */}
      <section ref={containerRef} className='w-[90vw] h-[100vh]'>
        <div className='flex items-center justify-between gap-4 mb-15 h-fit'>
          <div className='music-card w-full h-[30vh] rounded-2xl bg-black rotate-[-10deg] translate-y-[80px] translate-x-[120px]'></div>
          <div className='music-card w-full h-[30vh] rounded-2xl bg-black rotate-[-6deg] translate-y-[40px] translate-x-[80px]'></div>
          <div className='music-card w-full h-[30vh] rounded-2xl bg-black rotate-[-4deg] translate-y-[15px] translate-x-[40px]'></div>
          <div className='music-card w-full h-[30vh] rounded-2xl bg-black z-7'></div>
          <div className='music-card w-full h-[30vh] rounded-2xl bg-black rotate-[4deg] translate-y-[15px] translate-x-[-40px]'></div>
          <div className='music-card w-full h-[30vh] rounded-2xl bg-black rotate-[6deg] translate-y-[40px] translate-x-[-80px]'></div>
          <div className='music-card w-full h-[30vh] rounded-2xl bg-black rotate-[10deg] translate-y-[80px] translate-x-[-120px]'></div>
        </div>

        <div className='text-center w-full flex-col flex items-center gap-2'>
          <span className='scroll-fade font-medium text-[#373737]'>
            No need to search royalty-free music anymore
          </span>
          <h1 className='scroll-fade text-5xl mt-10 font-bold text-gray-900'>
            Finally, a place where you can listen <br /> to music without any interruption
          </h1>

          <motion.button
            className='py-3 px-7 flex items-center gap-2 bg-black text-white rounded-full mt-7'
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
          >
            Discover
          </motion.button>

          <span className='scroll-fade font-medium text-[#373737]'>
            Music is waiting
          </span>
        </div>
      </section>

      {/* Created by Everyone Section */}
      <section className="text-center w-[90vw] flex-col flex items-center gap-2">
        <h1 className='scroll-fade text-5xl mt-10 font-bold text-gray-900'>
          Created by Everyone.
        </h1>
        <div className="flex gap-7 w-[70%] mt-9">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="relative flex w-full h-[50vh] bg-amber-300 rounded-3xl overflow-hidden"
              whileHover={{ scale: 1.02 }}
            >
              <div className="absolute top-[20px] text-start left-[20px]">
                <h2 className="text-black font-bold text-[18px]">Lorem ipsum dolor sit amet.</h2>
                <span className="font-medium text-gray-700">Lorem ipsum dolor sit amet.</span>
              </div>
              <motion.div
                className="absolute bottom-[20px] right-[20px] bg-black/50 grid place-items-center z-20 w-[40px] rounded-full h-[40px] cursor-pointer"
                whileHover={{ scale: 1.2, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={20} height={20} color={"#ffffff"} fill={"none"}>
                  <path d="M12 4V20M20 12H4" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </section>
    </>
  )
}

export default Home;
