import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

function ScrollBar() {
    const trackRef = useRef(null);
    const thumbRef = useRef(null);
    const audioRef = useRef(null);
    const [thumbHeight, setThumbHeight] = useState(0);
    const [thumbTop, setThumbTop] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const location = useLocation();

    useEffect(() => {
        const updateThumb = () => {
            const scrollHeight = document.documentElement.scrollHeight;
            const clientHeight = window.innerHeight;
            const scrollTop = window.scrollY;

            const visibleRatio = clientHeight / scrollHeight;
            const newThumbHeight = visibleRatio * trackRef.current.offsetHeight;
            const maxScroll = scrollHeight - clientHeight;
            const maxThumbTop = trackRef.current.offsetHeight - newThumbHeight;
            const newThumbTop = (scrollTop / maxScroll) * maxThumbTop;

            setThumbHeight(newThumbHeight);
            setThumbTop(newThumbTop);
        };

        updateThumb();
        window.addEventListener("scroll", updateThumb);
        window.addEventListener("resize", updateThumb);

        return () => {
            window.removeEventListener("scroll", updateThumb);
            window.removeEventListener("resize", updateThumb);
        };
    }, []);

    // Stop song on route change
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setIsPlaying(false);
    }, [location]);

    const togglePlay = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    return (
        <>
            {/* Hidden audio element */}
            <audio ref={audioRef} src="/song.mp3" preload="auto" />

            <div
                className="fixed top-[35vh] right-[20px] h-[40vh] min-w-[6px] max-w-[50px] overflow-hidden w-fit bg-gray-300 rounded-full z-[50] group"
                ref={trackRef}
            >
                <div
                    ref={thumbRef}
                    className="relative rounded-full w-[6px] bg-black overflow-hidden group-hover:w-[50px] flex items-center px-[3px] py-[5px] transition-[width] duration-300"
                    style={{
                        height: `${thumbHeight + 10}px`,
                        transform: `translateY(${thumbTop}px)`,
                    }}
                >
                    {/* Hover content */}
                    <div className="flex items-center flex-col justify-center gap-2 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <img
                            src="/music-cover.jpg"
                            alt="cover"
                            className="w-[30px] h-[30px] object-cover bg-red-500 rounded-full"
                        />
                        <button
                            onClick={togglePlay}
                            className="w-[30px] h-[30px] flex items-center justify-center rounded-full bg-white text-black text-sm font-bold"
                        >
                            {isPlaying ? "❚❚" : "▶"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

export default ScrollBar;
